import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { logger } from './logger';
import { getVar } from './getVar';

const client = new SNSClient();

const ALERT_TOPIC_ARN = getVar('ALERT_TOPIC_ARN');

/**
 * Send unhandled exceptions to admins so that the issue can be handled before a client complains
 */
export const sendError = async (
  subject: string,
  error: string | Error
): Promise<void> => {
  try {
    await client.send(
      new PublishCommand({
        TopicArn: ALERT_TOPIC_ARN,
        Subject: subject,
        Message: typeof error === 'string' ? error : error.message,
      })
    );
  } catch (error) {
    logger.error('Error sending message to SNS', {
      error,
      sns: { subject, message: error },
    });
  }
};
