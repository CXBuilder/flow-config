import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { logEvent, logger } from './shared/logger';
import { respondError, respondMessage } from './shared/respond';
import { SpeechPreviewRequest } from './shared/models';

const pollyClient = new PollyClient();

export const handler = async (
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyResult> => {
  logEvent(event, context);

  try {
    // Parse and validate the request body
    if (!event.body) {
      return respondMessage(400, 'Request body required');
    }

    const request = JSON.parse(event.body) as SpeechPreviewRequest;

    // Basic validation
    if (!request.text || !request.languageCode || !request.voiceId) {
      return respondMessage(
        400,
        'Missing required fields: text, languageCode, voiceId'
      );
    }

    if (request.text.length > 3000) {
      return respondMessage(
        400,
        'Text exceeds maximum length of 3000 characters'
      );
    }

    // Validate language code format
    if (!/^[a-z]{2}-[A-Z]{2}$/.test(request.languageCode)) {
      return respondMessage(
        400,
        'Invalid language code format. Expected format: en-US'
      );
    }

    logger.info('Synthesizing speech with Polly', {
      languageCode: request.languageCode,
      voiceId: request.voiceId,
      textLength: request.text.length,
      hasSSML: request.text.includes('<speak>'),
    });

    // Determine if text contains SSML
    const textType: 'text' | 'ssml' = request.text.includes('<speak>')
      ? 'ssml'
      : 'text';

    // Local function to synthesize speech with specified engine
    const synthesizeSpeech = async (engine: 'neural' | 'standard') => {
      return await pollyClient.send(
        new SynthesizeSpeechCommand({
          Engine: engine,
          LanguageCode: request.languageCode as any,
          OutputFormat: 'mp3',
          Text: request.text,
          TextType: textType,
          VoiceId: request.voiceId as any,
        })
      );
    };

    // Try neural engine first, fall back to standard if not supported
    let AudioStream;
    try {
      const neuralResponse = await synthesizeSpeech('neural');
      AudioStream = neuralResponse.AudioStream;
      logger.info('Used neural engine for voice synthesis', {
        voiceId: request.voiceId,
        languageCode: request.languageCode,
      });
    } catch (neuralError) {
      logger.info('Neural engine not supported, falling back to standard', {
        voiceId: request.voiceId,
        languageCode: request.languageCode,
        neuralError: (neuralError as Error).message,
      });

      const standardResponse = await synthesizeSpeech('standard');
      AudioStream = standardResponse.AudioStream;
      logger.info('Used standard engine for voice synthesis', {
        voiceId: request.voiceId,
        languageCode: request.languageCode,
      });
    }

    if (!AudioStream) {
      throw new Error('No audio stream received from Polly');
    }

    const byteArray = await AudioStream.transformToByteArray();
    const buffer = Buffer.from(byteArray);
    const base64Audio = {
      Audio: buffer,
    };

    logger.info('Speech synthesis completed', {
      audioSizeBytes: buffer.length,
    });

    // Return audio as binary response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(base64Audio),
      isBase64Encoded: true,
    };
  } catch (error) {
    logger.error('Error in PreviewSpeech Lambda', error as Error);
    return respondError(error);
  }
};
