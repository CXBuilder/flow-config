import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { InitEnv } from '../infrastructure/api/Init/Init.interface';
import { handler } from '../backend/Init';
import { InitResponse } from '../backend/shared/models';

const env: InitEnv = {
  stackName: 'unit-test',
  userPoolId: 'user-pool',
  AWS_REGION: 'us-east-1',
  branding: 'true',
};
Object.assign(process.env, env);

describe('Init.handler', () => {
  const mock = mockClient(CloudFormationClient);
  beforeEach(() => {
    mock.reset();

    mock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: env.stackName,
          StackStatus: 'CREATE_COMPLETE',
          CreationTime: new Date(),
          Outputs: [
            { OutputKey: 'UserPoolClientId', OutputValue: 'client-id' },
          ],
        },
      ],
    });
  });

  it('should look up client id', async () => {
    const response = await handler();

    expect(response.statusCode).toBe(200);
    const config = JSON.parse(response.body ?? '{}') as InitResponse;

    expect(mock).toHaveReceivedCommand(DescribeStacksCommand);
    expect(config.region).toBe(env.AWS_REGION);
    expect(config.userPoolId).toBe(env.userPoolId);
    expect(config.clientId).toBe('client-id');
  });
});
