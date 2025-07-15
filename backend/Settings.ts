import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { logger } from './shared/logger';
import { respondObject } from './shared/respond';
import { getAccessLevel } from './shared/permissions';
import { Settings } from './shared/models';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

// Settings table name - will be set via environment variable
const SETTINGS_TABLE_NAME =
  process.env.SETTINGS_TABLE_NAME || 'FlowConfigSettings';

// Settings item ID - we use a single item to store all settings
const SETTINGS_ITEM_ID = 'application-settings';

// Data structures - using shared types from models

interface SettingsItem {
  id: string;
  settings: Settings;
  lastModified: string;
  lastModifiedBy: string;
}

// Default settings
const DEFAULT_SETTINGS: Settings = {
  locales: [
    {
      code: 'en-US',
      name: 'English (US)',
      voices: ['Joanna', 'Matthew'],
    },
  ],
};

/**
 * Validates the settings object
 */
function validateSettings(settings: any): settings is Settings {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  if (!Array.isArray(settings.locales)) {
    return false;
  }

  // Validate each locale
  for (const locale of settings.locales) {
    if (!locale || typeof locale !== 'object') {
      return false;
    }

    if (!locale.code || typeof locale.code !== 'string') {
      return false;
    }

    if (!locale.name || typeof locale.name !== 'string') {
      return false;
    }

    if (!Array.isArray(locale.voices)) {
      return false;
    }

    // Validate voice IDs are strings
    for (const voice of locale.voices) {
      if (typeof voice !== 'string') {
        return false;
      }
    }

    // Validate language code format (Amazon Polly format)
    const languageCodePattern = /^([a-z]{2,3}(-[A-Z]{2})?(-[A-Z]{3})?|arb)$/;
    if (!languageCodePattern.test(locale.code)) {
      return false;
    }
  }

  return true;
}

/**
 * Get settings from DynamoDB
 */
async function getSettings(): Promise<Settings> {
  try {
    const command = new GetCommand({
      TableName: SETTINGS_TABLE_NAME,
      Key: { id: SETTINGS_ITEM_ID },
    });

    const response = await docClient.send(command);

    if (!response.Item) {
      logger.info('No settings found, returning default settings');
      return DEFAULT_SETTINGS;
    }

    const item = response.Item as SettingsItem;
    return item.settings;
  } catch (error) {
    logger.error('Error retrieving settings from DynamoDB', error as Error);
    throw error;
  }
}

/**
 * Save settings to DynamoDB
 */
async function saveSettings(
  settings: Settings,
  userId: string
): Promise<Settings> {
  try {
    const item: SettingsItem = {
      id: SETTINGS_ITEM_ID,
      settings,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userId,
    };

    const command = new PutCommand({
      TableName: SETTINGS_TABLE_NAME,
      Item: item,
    });

    await docClient.send(command);
    logger.info('Settings saved successfully', {
      userId,
      settingsCount: settings.locales.length,
    });

    return settings;
  } catch (error) {
    logger.error('Error saving settings to DynamoDB', error as Error);
    throw error;
  }
}

/**
 * Handle GET /api/settings
 */
async function handleGetSettings(): Promise<APIGatewayProxyResult> {
  try {
    const settings = await getSettings();

    return respondObject(200, settings);
  } catch (error) {
    logger.error('Error handling GET settings request', error as Error);
    return respondObject(500, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve settings',
    });
  }
}

/**
 * Handle POST /api/settings
 */
async function handlePostSettings(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return respondObject(400, {
        code: 'INVALID_REQUEST',
        message: 'Request body is required',
      });
    }

    let settings: Settings;
    try {
      settings = JSON.parse(event.body);
    } catch (error) {
      return respondObject(400, {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      });
    }

    // Validate settings
    if (!validateSettings(settings)) {
      return respondObject(400, {
        code: 'INVALID_SETTINGS',
        message: 'Invalid settings format',
      });
    }

    // Get user ID from Cognito claims
    const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';

    // Save settings
    const savedSettings = await saveSettings(settings, userId);

    return respondObject(200, savedSettings);
  } catch (error) {
    logger.error('Error handling POST settings request', error as Error);
    return respondObject(500, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to save settings',
    });
  }
}

/**
 * Main Lambda handler
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('Settings handler invoked', {
    httpMethod: event.httpMethod,
    path: event.path,
  });

  try {
    // Get user claims and check access level
    const claims = event.requestContext.authorizer?.claims || {};
    const accessLevel = getAccessLevel(claims);

    // Check if user has admin access
    if (accessLevel !== 'Full') {
      logger.warn('Access denied - admin access required', {
        userId: claims.sub,
        accessLevel,
      });
      return respondObject(403, {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }

    // Route based on HTTP method
    switch (event.httpMethod) {
      case 'GET':
        return await handleGetSettings();
      case 'POST':
        return await handlePostSettings(event);
      default:
        return respondObject(405, {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${event.httpMethod} not allowed`,
        });
    }
  } catch (error) {
    logger.error('Unexpected error in settings handler', error as Error);
    return respondObject(500, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }
};
