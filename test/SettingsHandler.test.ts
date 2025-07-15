// Mock AWS SDK
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend,
    })),
  },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
}));

import { handler } from '../backend/Settings';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('Settings Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SETTINGS_TABLE_NAME = 'test-settings-table';
  });

  const mockAdminEvent: Partial<APIGatewayProxyEvent> = {
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-id',
          'cognito:groups': ['FlowConfigAdmin'],
        },
      },
    } as any,
  };

  const mockNonAdminEvent: Partial<APIGatewayProxyEvent> = {
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-user-id',
          'cognito:groups': ['FlowConfigEdit'],
        },
      },
    } as any,
  };

  const mockSettings = {
    locales: [
      {
        code: 'en-US',
        name: 'English (US)',
        voices: ['Joanna', 'Matthew'],
      },
      {
        code: 'es-US',
        name: 'Spanish (US)',
        voices: ['Lupe', 'Pedro'],
      },
    ],
  };

  describe('GET /api/settings', () => {
    it('should return settings for admin user', async () => {
      mockSend.mockResolvedValue({
        Item: {
          id: 'application-settings',
          settings: mockSettings,
          lastModified: '2023-01-01T00:00:00.000Z',
          lastModifiedBy: 'test-user',
        },
      });

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'GET',
        path: '/api/settings',
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockSettings);
    });

    it('should return default settings when no settings exist', async () => {
      mockSend.mockResolvedValue({
        Item: undefined,
      });

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'GET',
        path: '/api/settings',
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.locales).toHaveLength(1);
      expect(body.locales[0].code).toBe('en-US');
    });

    it('should deny access for non-admin user', async () => {
      const event: APIGatewayProxyEvent = {
        ...mockNonAdminEvent,
        httpMethod: 'GET',
        path: '/api/settings',
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    });
  });

  describe('POST /api/settings', () => {
    it('should save settings for admin user', async () => {
      mockSend.mockResolvedValue({});

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: JSON.stringify(mockSettings),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockSettings);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should validate settings format', async () => {
      const invalidSettings = {
        locales: [
          {
            code: 'invalid-code',
            name: 'Invalid',
            voices: ['Joanna'],
          },
        ],
      };

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: JSON.stringify(invalidSettings),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'INVALID_SETTINGS',
        message: 'Invalid settings format',
      });
    });

    it('should handle missing request body', async () => {
      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: null,
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'INVALID_REQUEST',
        message: 'Request body is required',
      });
    });

    it('should handle invalid JSON', async () => {
      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: 'invalid json',
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      });
    });

    it('should deny access for non-admin user', async () => {
      const event: APIGatewayProxyEvent = {
        ...mockNonAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: JSON.stringify(mockSettings),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    });
  });

  describe('Validation', () => {
    it('should accept valid Amazon Polly language codes', async () => {
      const validSettings = {
        locales: [
          { code: 'en-US', name: 'English (US)', voices: ['Joanna'] },
          { code: 'es-ES', name: 'Spanish (Spain)', voices: ['Lucia'] },
          { code: 'arb', name: 'Arabic', voices: ['Zeina'] },
          { code: 'cmn-CN', name: 'Chinese Mandarin', voices: ['Zhiyu'] },
          { code: 'en-GB-WLS', name: 'English (Welsh)', voices: ['Geraint'] },
        ],
      };

      mockSend.mockResolvedValue({});

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: JSON.stringify(validSettings),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    it('should reject invalid language codes', async () => {
      const invalidSettings = {
        locales: [
          { code: 'invalid', name: 'Invalid', voices: ['Joanna'] },
        ],
      };

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: JSON.stringify(invalidSettings),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('Error handling', () => {
    it('should handle DynamoDB errors on GET', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'GET',
        path: '/api/settings',
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve settings',
      });
    });

    it('should handle DynamoDB errors on POST', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'POST',
        path: '/api/settings',
        body: JSON.stringify(mockSettings),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Failed to save settings',
      });
    });

    it('should handle unsupported HTTP methods', async () => {
      const event: APIGatewayProxyEvent = {
        ...mockAdminEvent,
        httpMethod: 'DELETE',
        path: '/api/settings',
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toEqual({
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method DELETE not allowed',
      });
    });
  });
});