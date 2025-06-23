import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  GetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler } from '../backend/FlowConfig';
import { FlowConfig } from '../backend/shared/models';

const { FLOW_CONFIGS_TABLE_NAME } = process.env;

// Create mocks for AWS services
const ddbMock = mockClient(DynamoDBClient);
const ddbDocMock = mockClient(DynamoDBDocumentClient);
const snsMock = mockClient(SNSClient);

// Test data
const testFlowConfig: FlowConfig = {
  id: 'test-config-001',
  description: 'Test Flow Config for Integration Tests',
  variables: {
    closure: 'false',
    offerCallback: 'true',
    priority: 'high',
  },
  prompts: {
    welcome: {
      'en-US': {
        voice: 'Welcome to our service. How can I help you today?',
        chat: 'Hi! Welcome to our service. How can I assist you?',
      },
      'es-US': {
        voice: 'Bienvenido a nuestro servicio. ¿Cómo puedo ayudarte hoy?',
        chat: '¡Hola! Bienvenido a nuestro servicio. ¿Cómo puedo ayudarte?',
      },
    },
    closure: {
      'en-US': {
        voice:
          'We are currently closed. Please call back during business hours.',
      },
      'es-US': {
        voice:
          'Actualmente estamos cerrados. Por favor llame durante el horario comercial.',
      },
    },
  },
};

const makeEvent = (
  method: string,
  path: string,
  pathParameters?: Record<string, string>,
  queryStringParameters?: Record<string, string>,
  body?: string,
  claims?: Record<string, string>
): APIGatewayProxyEvent =>
  ({
    httpMethod: method,
    path,
    pathParameters: pathParameters || null,
    queryStringParameters: queryStringParameters || null,
    body: body || null,
    requestContext: {
      authorizer: {
        claims: claims || {
          sub: 'test-user-123',
          'cognito:groups': 'FlowConfigAdmin',
        },
      },
    },
    headers: {},
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    isBase64Encoded: false,
    stageVariables: null,
    resource: '',
  } as unknown as APIGatewayProxyEvent);

// Helper function to setup mock responses
const setupMockResponses = () => {
  // Reset all mocks before each test
  ddbMock.reset();
  ddbDocMock.reset();
  snsMock.reset();
  
  // Set default SNS mock to resolve successfully
  snsMock.on(PublishCommand).resolves({
    MessageId: 'mock-message-id',
  });
};

describe('FlowConfig.handler Unit Tests', () => {
  beforeEach(() => {
    setupMockResponses();
  });

  afterEach(() => {
    ddbMock.restore();
    ddbDocMock.restore();
    snsMock.restore();
  });

  describe('GET /api/flow-config (List Flow Configs)', () => {
    it('should return empty list when no configs exist', async () => {
      // Mock DynamoDB Scan to return empty results
      ddbDocMock.on(ScanCommand).resolves({
        Items: [],
        Count: 0,
      });

      const event = makeEvent('GET', '/api/flow-config');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body.items).toEqual([]);
      expect(ddbDocMock).toHaveReceivedCommandWith(ScanCommand, {
        TableName: FLOW_CONFIGS_TABLE_NAME,
      });
    });

    it('should return flow configs for authorized user', async () => {
      // Mock DynamoDB Scan to return test data
      ddbDocMock.on(ScanCommand).resolves({
        Items: [testFlowConfig],
        Count: 1,
      });

      const event = makeEvent('GET', '/api/flow-config');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body.items).toHaveLength(1);
      expect(body.items[0]).toMatchObject({
        id: testFlowConfig.id,
        description: testFlowConfig.description,
      });
      expect(ddbDocMock).toHaveReceivedCommandWith(ScanCommand, {
        TableName: FLOW_CONFIGS_TABLE_NAME,
      });
    });

    it('should filter flow configs by pattern', async () => {
      const otherConfig = {
        ...testFlowConfig,
        id: 'other-config-001',
        description: 'Other config',
      };

      // Mock DynamoDB Scan to return multiple configs
      ddbDocMock.on(ScanCommand).resolves({
        Items: [testFlowConfig, otherConfig],
        Count: 2,
      });

      const event = makeEvent('GET', '/api/flow-config', undefined, {
        pattern: 'test-',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body.items).toHaveLength(1);
      expect(body.items[0].id).toBe(testFlowConfig.id);
    });
  });

  describe('GET /api/flow-config/{id} (Get Specific Flow Config)', () => {
    it('should return flow config for authorized user', async () => {
      // Mock DynamoDB GetCommand to return test data
      ddbDocMock.on(GetCommand).resolves({
        Item: testFlowConfig,
      });

      const event = makeEvent('GET', `/api/flow-config/${testFlowConfig.id}`, {
        id: testFlowConfig.id,
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body).toMatchObject(testFlowConfig);
      expect(ddbDocMock).toHaveReceivedCommandWith(GetCommand, {
        TableName: FLOW_CONFIGS_TABLE_NAME,
        Key: { id: testFlowConfig.id },
      });
    });

    it('should return 404 for non-existent flow config', async () => {
      // Mock DynamoDB GetCommand to return empty result
      ddbDocMock.on(GetCommand).resolves({});

      const event = makeEvent('GET', '/api/flow-config/non-existent', {
        id: 'non-existent',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body || '{}');
      expect(body.message).toBe('Flow Config not found');
      expect(ddbDocMock).toHaveReceivedCommandWith(GetCommand, {
        TableName: FLOW_CONFIGS_TABLE_NAME,
        Key: { id: 'non-existent' },
      });
    });
  });

  describe('POST /api/flow-config/{id} (Create/Update Flow Config)', () => {
    it('should create new flow config', async () => {
      const newConfig: FlowConfig = {
        ...testFlowConfig,
        id: 'test-config-new',
        description: 'New Test Config',
      };

      // Mock GetCommand to return empty (config doesn't exist)
      ddbDocMock.on(GetCommand).resolves({});
      // Mock PutCommand to succeed
      ddbDocMock.on(PutCommand).resolves({});

      const event = makeEvent(
        'POST',
        `/api/flow-config/${newConfig.id}`,
        { id: newConfig.id },
        undefined,
        JSON.stringify(newConfig)
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body || '{}');
      expect(body).toMatchObject(newConfig);
      expect(ddbDocMock).toHaveReceivedCommandWith(PutCommand, {
        TableName: FLOW_CONFIGS_TABLE_NAME,
        Item: newConfig,
      });
    });

    it('should update existing flow config', async () => {
      const updatedConfig: FlowConfig = {
        ...testFlowConfig,
        description: 'Updated Test Config',
        variables: {
          ...testFlowConfig.variables,
          newAttribute: 'newValue',
        },
      };

      // Mock GetCommand to return existing config
      ddbDocMock.on(GetCommand).resolves({
        Item: testFlowConfig,
      });
      // Mock PutCommand to succeed
      ddbDocMock.on(PutCommand).resolves({});

      const event = makeEvent(
        'POST',
        `/api/flow-config/${testFlowConfig.id}`,
        { id: testFlowConfig.id },
        undefined,
        JSON.stringify(updatedConfig)
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body || '{}');
      expect(body.description).toBe('Updated Test Config');
      expect(body.variables.newAttribute).toBe('newValue');
      expect(ddbDocMock).toHaveReceivedCommandWith(PutCommand, {
        TableName: FLOW_CONFIGS_TABLE_NAME,
        Item: updatedConfig,
      });
    });

    it('should return 400 for invalid request body', async () => {
      const event = makeEvent(
        'POST',
        `/api/flow-config/${testFlowConfig.id}`,
        { id: testFlowConfig.id },
        undefined,
        'invalid json'
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.message).toContain('Invalid JSON');
      // No DynamoDB calls should be made for invalid JSON
      expect(ddbDocMock).not.toHaveReceivedCommand(GetCommand);
      expect(ddbDocMock).not.toHaveReceivedCommand(PutCommand);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidConfig = {
        id: testFlowConfig.id,
        // Missing description, variables, prompts
      };

      const event = makeEvent(
        'POST',
        `/api/flow-config/${testFlowConfig.id}`,
        { id: testFlowConfig.id },
        undefined,
        JSON.stringify(invalidConfig)
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.message).toContain('Missing required fields');
      // No DynamoDB calls should be made for invalid data
      expect(ddbDocMock).not.toHaveReceivedCommand(GetCommand);
      expect(ddbDocMock).not.toHaveReceivedCommand(PutCommand);
    });

    it('should return 400 for invalid prompt structure', async () => {
      const invalidConfig: FlowConfig = {
        ...testFlowConfig,
        prompts: {
          welcome: {
            'en-US': {
              // Missing required 'voice' field
              chat: 'Chat only prompt',
            } as any,
          },
        },
      };

      const event = makeEvent(
        'POST',
        `/api/flow-config/${testFlowConfig.id}`,
        { id: testFlowConfig.id },
        undefined,
        JSON.stringify(invalidConfig)
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body || '{}');
      expect(body.message).toContain('must have a voice variant');
      // No DynamoDB calls should be made for invalid prompt structure
      expect(ddbDocMock).not.toHaveReceivedCommand(GetCommand);
      expect(ddbDocMock).not.toHaveReceivedCommand(PutCommand);
    });
  });

  describe('DELETE /api/flow-config/{id} (Delete Flow Config)', () => {
    it('should delete existing flow config', async () => {
      // Mock GetCommand to return existing config
      ddbDocMock.on(GetCommand).resolves({
        Item: testFlowConfig,
      });
      // Mock DeleteCommand to succeed
      ddbDocMock.on(DeleteCommand).resolves({});

      const event = makeEvent(
        'DELETE',
        `/api/flow-config/${testFlowConfig.id}`,
        {
          id: testFlowConfig.id,
        }
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      const body = JSON.parse(result.body || '{}');
      expect(body.message).toBe('');
      expect(ddbDocMock).toHaveReceivedCommandWith(DeleteCommand, {
        TableName: FLOW_CONFIGS_TABLE_NAME,
        Key: { id: testFlowConfig.id },
      });
    });

    it('should return 404 for non-existent flow config', async () => {
      // Mock GetCommand to return empty result
      ddbDocMock.on(GetCommand).resolves({});

      const event = makeEvent('DELETE', '/api/flow-config/non-existent', {
        id: 'non-existent',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      // DeleteCommand should not be called for non-existent config
      expect(ddbDocMock).not.toHaveReceivedCommand(DeleteCommand);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const event = makeEvent('POST', '/api/unknown-route');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body || '{}');
      expect(body.message).toBe('Not Found');
      // No DynamoDB calls should be made for unknown routes
      expect(ddbDocMock).not.toHaveReceivedAnyCommand();
    });

    it('should handle DynamoDB errors gracefully', async () => {
      // Mock DynamoDB to throw an error
      ddbDocMock.on(ScanCommand).rejects(new Error('DynamoDB service unavailable'));

      const event = makeEvent('GET', '/api/flow-config');
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(ddbDocMock).toHaveReceivedCommand(ScanCommand);
      // Verify that SNS error notification was sent
      expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
        TopicArn: process.env.ALERT_TOPIC_ARN,
        Subject: expect.any(String),
        Message: expect.stringContaining('DynamoDB service unavailable'),
      });
    });

    it('should handle SNS errors gracefully', async () => {
      // Mock DynamoDB to throw an error that will trigger SNS
      ddbDocMock.on(ScanCommand).rejects(new Error('DynamoDB service unavailable'));
      // Mock SNS to also fail
      snsMock.on(PublishCommand).rejects(new Error('SNS service unavailable'));

      const event = makeEvent('GET', '/api/flow-config');
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(ddbDocMock).toHaveReceivedCommand(ScanCommand);
      expect(snsMock).toHaveReceivedCommand(PublishCommand);
      // The handler should still return error even if SNS fails
    });
  });
});
