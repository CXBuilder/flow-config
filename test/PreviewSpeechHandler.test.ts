// Mock AWS SDK
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-polly', () => ({
  PollyClient: jest.fn(() => ({
    send: mockSend,
  })),
  SynthesizeSpeechCommand: jest.fn(),
}));

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../backend/PreviewSpeech';

// Set up environment
process.env.AWS_REGION = 'us-east-1';
process.env.ALERT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:alerts';

describe('PreviewSpeech Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/api/preview-speech',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  });

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test',
    logStreamName: '2023/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  const mockPolly = (mockAudioData = new Uint8Array([1, 2, 3, 4, 5])) => {
    const mockStream = {
      transformToByteArray: jest.fn().mockResolvedValue(mockAudioData),
    };

    mockSend.mockResolvedValue({
      AudioStream: mockStream,
    });

    return mockStream;
  };

  it('should synthesize speech for valid text request', async () => {
    const mockAudioData = new Uint8Array([1, 2, 3, 4, 5]);
    mockPolly(mockAudioData);

    const event = createEvent({
      languageCode: 'en-US',
      voiceId: 'Joanna',
      text: 'Hello, welcome to our service!',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Content-Type']).toBe('audio/mpeg');
    expect(result.headers?.['Content-Disposition']).toBe(
      'attachment; filename="speech.mp3"'
    );
    expect(result.isBase64Encoded).toBe(true);

    expect(result.body).toBe(
      JSON.stringify({ Audio: Buffer.from(mockAudioData) })
    );

    expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should synthesize speech for SSML request', async () => {
    mockPolly();

    const event = createEvent({
      languageCode: 'en-US',
      voiceId: 'Joanna',
      text: '<speak>Please <break time="1s"/> hold while I connect you.</speak>',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should handle Spanish language request', async () => {
    mockPolly();

    const event = createEvent({
      languageCode: 'es-US',
      voiceId: 'Lupe',
      text: 'Bienvenido a nuestro servicio',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should return 400 for missing request body', async () => {
    const event: APIGatewayProxyEvent = {
      ...createEvent({}),
      body: null,
    };

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Request body required');
  });

  it('should return 400 for missing required fields', async () => {
    const event = createEvent({
      languageCode: 'en-US',
      // Missing voiceId and text
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toBe(
      'Missing required fields: text, languageCode, voiceId'
    );
  });

  it('should return 400 for text exceeding maximum length', async () => {
    const longText = 'A'.repeat(3001);
    const event = createEvent({
      languageCode: 'en-US',
      voiceId: 'Joanna',
      text: longText,
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Text exceeds maximum length of 3000 characters');
  });

  it('should return 400 for invalid language code format', async () => {
    const event = createEvent({
      languageCode: 'english',
      voiceId: 'Joanna',
      text: 'Hello world',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.message).toBe(
      'Invalid language code format. Expected format: en-US'
    );
  });

  it('should handle Polly errors gracefully', async () => {
    mockSend.mockRejectedValue(new Error('Polly service error'));

    const event = createEvent({
      languageCode: 'en-US',
      voiceId: 'Joanna',
      text: 'Hello world',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Polly service error');
  });

  it('should handle missing audio stream from Polly', async () => {
    mockSend.mockResolvedValue({
      AudioStream: undefined,
    });

    const event = createEvent({
      languageCode: 'en-US',
      voiceId: 'Joanna',
      text: 'Hello world',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('No audio stream received from Polly');
  });

  it('should handle ReadableStream audio response', async () => {
    const mockAudioData = new Uint8Array([1, 2, 3, 4, 5]);
    mockPolly(mockAudioData);

    const event = createEvent({
      languageCode: 'en-US',
      voiceId: 'Joanna',
      text: 'Hello world',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(
      JSON.stringify({ Audio: Buffer.from(mockAudioData) })
    );
  });

  it('should handle AWS SDK stream with transformToByteArray', async () => {
    const mockAudioData = new Uint8Array([1, 2, 3, 4, 5]);
    const mockStream = mockPolly(mockAudioData);

    const event = createEvent({
      languageCode: 'en-US',
      voiceId: 'Joanna',
      text: 'Hello world',
    });

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(
      JSON.stringify({ Audio: Buffer.from(mockAudioData) })
    );
    expect(mockStream.transformToByteArray).toHaveBeenCalled();
  });

  it('should validate exact language code format', async () => {
    const validCodes = ['en-US', 'es-ES', 'fr-FR'];
    const invalidCodes = ['en', 'EN-US', 'en-us', 'english', 'en_US'];

    for (const code of validCodes) {
      mockPolly();

      const event = createEvent({
        languageCode: code,
        voiceId: 'Joanna',
        text: 'Hello',
      });

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    }

    for (const code of invalidCodes) {
      const event = createEvent({
        languageCode: code,
        voiceId: 'Joanna',
        text: 'Hello',
      });

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(400);
    }
  });
});
