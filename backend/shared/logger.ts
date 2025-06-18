import { Logger } from '@aws-lambda-powertools/logger';
import { ConnectContactFlowEvent, Context } from 'aws-lambda';

export const logger = new Logger();

/**
 * Call this method in your lambda handler to capture event details
 * @todo use logger.appendKeys to add attributes like ContactId
 */
export const logEvent = (event?: unknown, context?: Context) => {
  if (context) {
    logger.addContext(context);
  }
  if (event) {
    logger.logEventIfEnabled(event);
  }

  const ContactData = (event as ConnectContactFlowEvent)?.Details?.ContactData;
  if (ContactData) {
    const { InstanceARN, ContactId } = ContactData;
    logger.appendKeys({
      connectInstanceId: InstanceARN?.split('/').pop(),
      connectContactId: ContactId
    });
  }
};
