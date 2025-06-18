import {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { logEvent } from './shared/logger';
import { FlowConfigEnv } from '../infrastructure/api/FlowConfig/FlowConfig.interface';
import { respondError, respondMessage, respondObject } from './shared/respond';
import { sendError } from './shared/snsClient';
import { transformFlowConfig } from './shared/transformFlowConfig';

const env = process.env as unknown as FlowConfigEnv;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);
import { FlowConfig, FlowConfigList, FlowConfigSummary } from './shared/models';
export const handler = async (
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  logEvent(event, context);

  try {
    const method = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters;

    // Extract user claims from Cognito authorizer
    const claims = event.requestContext.authorizer?.claims;

    if (!claims) {
      return respondObject(401, new Error('Unauthorized'));
    }

    // Route to appropriate handler
    if (method === 'GET' && path === '/api/flow-config') {
      return await listFlowConfigs(event, claims);
    } else if (method === 'GET' && pathParameters?.id) {
      return await getFlowConfig(pathParameters.id, claims);
    } else if (method === 'POST' && path === '/api/flow-config/preview') {
      return await previewFlowConfig(event, claims);
    } else if (method === 'POST' && pathParameters?.id) {
      return await saveFlowConfig(pathParameters.id, event, claims);
    } else if (method === 'DELETE' && pathParameters?.id) {
      return await deleteFlowConfig(pathParameters.id, claims);
    }

    return respondMessage(404, 'Not Found');
  } catch (error) {
    await sendError('Unhandled Error: api/flow-config', error as Error);
    return respondError(error);
  }
};

async function listFlowConfigs(
  event: APIGatewayProxyEvent,
  claims: Record<string, string>
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // Get all flow configs from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: env.FLOW_CONFIGS_TABLE_NAME,
    });

    const response = await docClient.send(scanCommand);
    const flowConfigs = response.Items || [];

    // Get query parameters for filtering
    const pattern = event.queryStringParameters?.pattern;

    // Filter by pattern if provided
    let filteredConfigs = flowConfigs;
    if (pattern) {
      filteredConfigs = flowConfigs.filter((config) =>
        config.id.startsWith(pattern)
      );
    }

    // Check permissions for each flow config
    const resultItems: FlowConfigSummary[] = [];

    for (const config of filteredConfigs) {
      // Check access level using user claims
      const accessLevel = await checkPermissions(claims, config.id, 'Read');
      if (accessLevel) {
        resultItems.push({
          id: config.id,
          description: config.description,
          accessLevel,
        });
      }
    }

    const result: FlowConfigList = { items: resultItems };
    return respondObject(200, result);
  } catch (error) {
    throw new Error(`Error listing flow configs: ${error}`);
  }
}

async function getFlowConfig(
  flowConfigId: string,
  claims: Record<string, string>
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // Check permissions
    const accessLevel = await checkPermissions(claims, flowConfigId, 'Read');
    if (!accessLevel) {
      return respondMessage(403, 'Access denied');
    }

    // Get flow config from DynamoDB
    const getCommand = new GetCommand({
      TableName: env.FLOW_CONFIGS_TABLE_NAME,
      Key: { id: flowConfigId },
    });

    const response = await docClient.send(getCommand);

    if (!response.Item) {
      return respondMessage(404, 'Flow Config not found');
    }

    return respondObject(200, response.Item as FlowConfig);
  } catch (error) {
    throw new Error(`Error getting flow config ${flowConfigId}: ${error}`);
  }
}

async function saveFlowConfig(
  flowConfigId: string,
  event: APIGatewayProxyEvent,
  claims: Record<string, string>
): Promise<APIGatewayProxyStructuredResultV2> {
  // Parse and validate request body first (outside try-catch)
  if (!event.body) {
    return respondMessage(400, 'Request body required');
  }

  let body: FlowConfig;
  try {
    body = JSON.parse(event.body) as FlowConfig;
  } catch (error) {
    return respondMessage(400, 'Invalid JSON in request body');
  }

  // Ensure ID in body matches path parameter
  body.id = flowConfigId;

  // Basic validation
  if (!body.description || !body.variables || !body.prompts) {
    return respondMessage(
      400,
      'Missing required fields: description, variables, prompts'
    );
  }

  // Validate variables are strings
  for (const [key, value] of Object.entries(body.variables)) {
    if (typeof value !== 'string') {
      return respondMessage(400, `Variable ${key} must be a string`);
    }
  }

  // Validate prompts structure
  for (const [promptName, promptData] of Object.entries(body.prompts)) {
    for (const [lang, langData] of Object.entries(promptData)) {
      if (!langData.voice) {
        return respondMessage(
          400,
          `Prompt ${promptName} for language ${lang} must have a voice variant`
        );
      }
    }
  }

  // Check size constraints (approximate)
  const itemSize = JSON.stringify(body).length;
  if (itemSize > 380000) {
    // Leave some buffer for DynamoDB 400KB limit
    return respondMessage(413, 'Flow config exceeds maximum size limit');
  }

  try {
    // Check if flow config exists
    const getCommand = new GetCommand({
      TableName: env.FLOW_CONFIGS_TABLE_NAME,
      Key: { id: flowConfigId },
    });

    const response = await docClient.send(getCommand);
    const existingConfig = response.Item;

    // Determine required permission level
    const action = existingConfig ? 'Edit' : 'Create';

    // Check permissions
    const accessLevel = await checkPermissions(claims, flowConfigId, action);
    if (!accessLevel) {
      return respondMessage(403, 'Access denied');
    }

    // Save to DynamoDB
    const putCommand = new PutCommand({
      TableName: env.FLOW_CONFIGS_TABLE_NAME,
      Item: body,
    });

    await docClient.send(putCommand);

    const statusCode = existingConfig ? 200 : 201;
    return respondObject(statusCode, body);
  } catch (error) {
    throw new Error(`Error saving flow config ${flowConfigId}: ${error}`);
  }
}

async function deleteFlowConfig(
  flowConfigId: string,
  claims: Record<string, string>
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // Check permissions
    const accessLevel = await checkPermissions(claims, flowConfigId, 'Delete');
    if (!accessLevel) {
      return respondMessage(403, 'Access denied');
    }

    // Check if flow config exists
    const getCommand = new GetCommand({
      TableName: env.FLOW_CONFIGS_TABLE_NAME,
      Key: { id: flowConfigId },
    });

    const response = await docClient.send(getCommand);

    if (!response.Item) {
      return respondMessage(404, 'Flow Config not found');
    }

    // Delete from DynamoDB
    const deleteCommand = new DeleteCommand({
      TableName: env.FLOW_CONFIGS_TABLE_NAME,
      Key: { id: flowConfigId },
    });

    await docClient.send(deleteCommand);

    return respondMessage(204, '');
  } catch (error) {
    throw new Error(`Error deleting flow config ${flowConfigId}: ${error}`);
  }
}

async function previewFlowConfig(
  event: APIGatewayProxyEvent,
  claims: Record<string, string>
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // Parse request body
    if (!event.body) {
      return respondMessage(400, 'Request body required');
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (error) {
      return respondMessage(400, 'Invalid JSON in request body');
    }

    // Extract and validate required fields
    const { flowConfig, lang: language, channel } = requestData;

    if (!flowConfig) {
      return respondMessage(400, 'flowConfig is required');
    }

    if (!language) {
      return respondMessage(400, 'lang is required');
    }

    if (!channel) {
      return respondMessage(400, 'channel is required');
    }

    // Validate parameters
    if (!/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
      return respondMessage(
        400,
        'Invalid language code format. Expected format: en-US'
      );
    }

    if (!['voice', 'chat'].includes(channel)) {
      return respondMessage(400, 'Invalid channel. Must be "voice" or "chat"');
    }

    // Basic validation of flowConfig structure
    if (
      !flowConfig.id ||
      !flowConfig.description ||
      !flowConfig.variables ||
      !flowConfig.prompts
    ) {
      return respondMessage(
        400,
        'FlowConfig must have id, description, variables, and prompts'
      );
    }

    // Check permissions for the flow config ID
    const accessLevel = await checkPermissions(claims, flowConfig.id, 'Read');
    if (!accessLevel) {
      return respondMessage(403, 'Access denied');
    }

    // Use shared transformation function directly
    const result = transformFlowConfig(flowConfig, {
      language,
      channel: channel as 'voice' | 'chat',
    });

    return respondObject(200, result);
  } catch (error) {
    throw new Error(`Error previewing flow config: ${error}`);
  }
}

async function checkPermissions(
  _claims: Record<string, string>,
  flowConfigId: string,
  action: string
): Promise<'Full' | 'Edit' | 'Read' | null> {
  try {
    return Promise.resolve('Full');
  } catch (error) {
    console.error(
      `Error checking permissions for ${flowConfigId}, action ${action}:`,
      error
    );
    return null;
  }
}
