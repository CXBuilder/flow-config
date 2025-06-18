import { logger } from './logger';
import { FlowConfig } from './models';

export interface TransformOptions {
  language: string;
  channel: 'voice' | 'chat';
}

/**
 * Transform a FlowConfig object into a Record<string, string> for Amazon Connect
 * This function is shared between the preview API and GetConfig lambda
 */
export function transformFlowConfig(
  config: FlowConfig,
  options: TransformOptions
): Record<string, string> {
  const { language, channel } = options;

  logger.debug('Transforming flow config', {
    configId: config.id,
    language,
    channel,
  });

  // Extract variables
  const variables = config.variables || {};

  // Resolve prompts for the specified language and channel
  const prompts: Record<string, string> = {};
  const rawPrompts = config.prompts || {};

  for (const [promptName, promptData] of Object.entries(rawPrompts)) {
    if (language in promptData) {
      const langData = promptData[language];

      // Use channel-specific prompt, fallback to voice
      if (channel === 'chat' && langData.chat) {
        prompts[promptName] = langData.chat;
      } else if (langData.voice) {
        // For chat channel without chat content, strip SSML tags from voice content
        if (channel === 'chat') {
          prompts[promptName] = stripSSML(langData.voice);
        } else {
          prompts[promptName] = langData.voice;
        }
      }
    } else {
      logger.warn(`Language ${language} not found for prompt ${promptName}`, {
        configId: config.id,
        promptName,
        availableLanguages: Object.keys(promptData),
      });
    }
  }

  const result: Record<string, string> = {
    ...variables,
    ...prompts,
  };

  // Check response size (Amazon Connect has 32KB limit)
  const responseSize = JSON.stringify(result).length;
  if (responseSize > 30000) {
    // Leave some buffer
    logger.warn('Response size approaching Amazon Connect limit', {
      responseSize,
      configId: config.id,
      limit: 32768,
    });
  }

  logger.info('Successfully transformed FlowConfig', {
    configId: config.id,
    language,
    channel,
    variableCount: Object.keys(variables).length,
    promptCount: Object.keys(prompts).length,
    responseSize,
  });

  return result;
}

/**
 * Strip SSML tags from voice content for chat channel
 */
function stripSSML(text: string): string {
  // Remove SSML tags but keep the content
  return text
    .replace(/<[^>]*>/g, '') // Remove all XML/SSML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
