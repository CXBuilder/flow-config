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
}));

import { handler } from '../backend/GetConfig';

describe('GetConfig Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFlowConfig = {
    id: 'test-config',
    description: 'Test Flow Config',
    variables: {
      closure: 'false',
      priority: 'high',
      maxWaitTime: '300',
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
      hold: {
        'en-US': {
          voice:
            '<speak>Please <break time="1s"/> hold while I connect you.</speak>',
        },
      },
    },
  };

  it('should return flow config for valid request', async () => {
    mockSend.mockResolvedValue({
      Item: mockFlowConfig,
    });

    const event = {
      id: 'test-config',
      lang: 'en-US',
      Channel: 'VOICE',
    };

    const result = await handler(event);

    expect(result).toEqual({
      closure: 'false',
      priority: 'high',
      maxWaitTime: '300',
      welcome: 'Welcome to our service. How can I help you today?',
      hold: '<speak>Please <break time="1s"/> hold while I connect you.</speak>',
    });

    expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should return chat content for chat channel', async () => {
    mockSend.mockResolvedValue({
      Item: mockFlowConfig,
    });

    const event = {
      id: 'test-config',
      lang: 'en-US',
      channel: 'chat' as const,
    };

    const result = await handler(event);

    expect(result).toEqual({
      closure: 'false',
      priority: 'high',
      maxWaitTime: '300',
      welcome: 'Hi! Welcome to our service. How can I assist you?',
      hold: 'Please hold while I connect you.', // SSML stripped
    });
  });

  it('should fallback to voice content and strip SSML for chat when no chat content', async () => {
    mockSend.mockResolvedValue({
      Item: mockFlowConfig,
    });

    const event = {
      id: 'test-config',
      lang: 'en-US',
      channel: 'chat' as const,
    };

    const result = await handler(event);

    // Should strip SSML from hold prompt since no chat version exists
    expect(result.hold).toBe('Please hold while I connect you.');
  });

  it('should use default language and channel', async () => {
    mockSend.mockResolvedValue({
      Item: mockFlowConfig,
    });

    const event = {
      id: 'test-config',
    };

    const result = await handler(event);

    // Should default to en-US and voice
    expect(result.welcome).toBe(
      'Welcome to our service. How can I help you today?'
    );
  });

  it('should handle Spanish language', async () => {
    mockSend.mockResolvedValue({
      Item: mockFlowConfig,
    });

    const event = {
      id: 'test-config',
      lang: 'es-US',
      channel: 'voice' as const,
    };

    const result = await handler(event);

    expect(result.welcome).toBe(
      'Bienvenido a nuestro servicio. ¿Cómo puedo ayudarte hoy?'
    );
  });

  it('should throw error for missing id', async () => {
    const event = {
      id: '',
    };

    await expect(handler(event)).rejects.toThrow(
      'Missing required parameter: id'
    );
  });

  it('should throw error for non-existent config', async () => {
    mockSend.mockResolvedValue({
      Item: undefined,
    });

    const event = {
      id: 'non-existent',
    };

    await expect(handler(event)).rejects.toThrow(
      'Flow config with id non-existent not found'
    );
  });

  it('should handle DynamoDB errors', async () => {
    mockSend.mockRejectedValue(new Error('DynamoDB error'));

    const event = {
      id: 'test-config',
    };

    await expect(handler(event)).rejects.toThrow('DynamoDB error');
  });

  it('should handle missing language gracefully', async () => {
    mockSend.mockResolvedValue({
      Item: mockFlowConfig,
    });

    const event = {
      id: 'test-config',
      lang: 'fr-FR', // Language not available in mock data
    };

    const result = await handler(event);

    // Should return only variables since language doesn't exist
    expect(result).toEqual(mockFlowConfig.variables);
  });

  it('should handle empty prompts object', async () => {
    const configWithoutPrompts = {
      ...mockFlowConfig,
      prompts: {},
    };

    mockSend.mockResolvedValue({
      Item: configWithoutPrompts,
    });

    const event = {
      id: 'test-config',
    };

    const result = await handler(event);

    expect(result).toEqual(mockFlowConfig.variables);
  });
});
