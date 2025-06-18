import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { User } from '../backend/shared/models';
import { UsersEnv } from '../infrastructure/api/Users/Users.interface';
import { ConnectClient, DescribeUserCommand } from '@aws-sdk/client-connect';
import { handler } from '../backend/Users';
import { APIGatewayProxyEvent } from 'aws-lambda';

const env: UsersEnv = {
  CONNECT_INSTANCE_ARN: 'instance-id',
};
Object.assign(process.env, env);

const makeEvent = (userId: string, authorizerUserId: string) =>
  ({
    pathParameters: {
      userId,
    },
    requestContext: {
      authorizer: {
        claims: { 'cognito:username': authorizerUserId },
      },
    },
  } as unknown as APIGatewayProxyEvent);

describe('Users.handler', () => {
  const mock = mockClient(ConnectClient);
  beforeEach(() => {
    mock.reset();

    mock.on(DescribeUserCommand).resolves({
      User: {
        Username: 'test',
      },
    });
  });

  it('should return matching user', async () => {
    const response = await handler(makeEvent('test', 'test'));

    expect(response.statusCode).toBe(200);
    const config = JSON.parse(response.body ?? '{}') as User;

    expect(mock).toHaveReceivedCommand(DescribeUserCommand);
    expect(config.Username).toBe('test');
  });

  it('should return matching user', async () => {
    const response = await handler(makeEvent('test', 'not-test'));

    expect(response.statusCode).toBe(403);
    expect(mock).toHaveReceivedCommand(DescribeUserCommand);
  });
});
