// Utility functions for consistent API response

import { logger } from './logger';

export const respond = (statusCode: number, body: string) => ({
  statusCode,
  body,
});

export const respondObject = (statusCode: number, obj?: object) =>
  respond(statusCode, JSON.stringify(obj));

export const respondMessage = (statusCode: number, message: string) =>
  respondObject(statusCode, { message });

/**
 * Log error and respond with HTTP 500
 * Note: You can conditionally hide the message from the user based on environment
 */
export const respondError = (error: unknown) => {
  logger.error('Unhandled Server Error', error as Error);
  return respondMessage(500, (error as Error).message);
};
