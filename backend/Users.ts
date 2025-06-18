import { ConnectClient, DescribeUserCommand } from '@aws-sdk/client-connect';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import { logger, logEvent } from './shared/logger';
import { UsersEnv } from '../infrastructure/api/Users/Users.interface';
import { respondError, respondMessage, respondObject } from './shared/respond';
import { sendError } from './shared/snsClient';

const env = process.env as unknown as UsersEnv;

const connectClient = new ConnectClient();

export const handler = async (
  event: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  logEvent(event, context);

  try {
    const userId = event.pathParameters?.userId;
    const username =
      event.requestContext.authorizer?.claims['cognito:username'];

    const userRequest = new DescribeUserCommand({
      InstanceId: env.CONNECT_INSTANCE_ARN,
      UserId: userId,
    });
    const describeUserResponse = await connectClient.send(userRequest);
    if (describeUserResponse.User?.Username !== username) {
      logger.error('Connect username does not match token, returning 403');
      return respondMessage(
        403,
        'Forbidden: Cognito username does not match connect username'
      );
    }
    return respondObject(200, describeUserResponse.User);
  } catch (error) {
    await sendError('Unhandled Error: api/users', error as Error);
    return respondError(error);
  }
};
