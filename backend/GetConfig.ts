import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from './shared/logger';
import { FlowConfig } from './shared/models';
import { transformFlowConfig } from './shared/transformFlowConfig';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

interface GetConfigEvent {
  // Connect Event Structure
  Details: {
    Parameters: {
      id: string;
      lang?: string;
    };
    ContactData: {
      Channel: string;
      Attributes: {
        lang?: string;
      };
    };
  };

  // Override Structure
  id: string;
  lang?: string;
  channel?: 'voice' | 'chat';
}

export const handler = async (
  event: Partial<GetConfigEvent>
): Promise<Record<string, string>> => {
  logger.info('GetConfig Lambda invoked', { event });

  try {
    // Extract parameters with defaults
    const configId = event?.Details?.Parameters?.id ?? event.id;
    const language =
      event?.Details?.Parameters?.lang ??
      event?.Details?.ContactData?.Attributes?.lang ??
      event.lang ??
      'en-US';
    const channel = (
      event?.Details?.ContactData?.Channel?.toString() ??
      event.channel ??
      'voice'
    ).toLowerCase();

    if (!configId) {
      throw new Error('Missing required parameter: id');
    }

    logger.info('Retrieving flow config', { configId, language, channel });

    // Get config from DynamoDB
    const command = new GetCommand({
      TableName: process.env.FLOW_CONFIGS_TABLE_NAME!,
      Key: { id: configId },
    });

    const response = await docClient.send(command);

    if (!response.Item) {
      logger.warn('Flow config not found', { configId });
      throw new Error(`Flow config with id ${configId} not found`);
    }

    const config = response.Item as FlowConfig;
    logger.debug('Retrieved flow config', { config });

    // Use shared transformation function
    const result = transformFlowConfig(config, {
      language,
      channel: channel as 'voice' | 'chat',
    });

    return result;
  } catch (error) {
    logger.error('Error in GetConfig Lambda', error as Error);
    throw error;
  }
};
