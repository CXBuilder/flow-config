import {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { InitEnv } from '../infrastructure/api/Init/Init.interface';
import { InitResponse } from './shared/models';
import { logEvent } from './shared/logger';
import { respondError, respondObject } from './shared/respond';
import { sendError } from './shared/snsClient';

const env = process.env as unknown as InitEnv;

const cloudformationClient = new CloudFormationClient();

/**
 * Cache response between invocations of the handler
 */
let response: InitResponse | undefined = undefined;

/**
 * Due to a CDK circular dependency, we cannot pass the clientId by reference to the CDK Construct, we must look it up from stack outputs.
 */
const getStackOutputs = async (
  stackName: string
): Promise<{ status: string; outputs: Record<string, string> }> => {
  const stacks = await cloudformationClient.send(
    new DescribeStacksCommand({ StackName: stackName })
  );
  const stack = stacks.Stacks?.pop();
  if (!stack) {
    throw new Error(`Could not locate stack named ${env.stackName}`);
  }
  const outputs: Record<string, string> = {};
  stack.Outputs?.forEach(({ OutputKey = '', OutputValue = '' }) => {
    if (OutputKey) {
      outputs[OutputKey] = OutputValue;
    }
  });
  return {
    status: stack.StackStatus ?? '',
    outputs,
  };
};

export const handler = async (
  event?: APIGatewayProxyEvent,
  context?: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  logEvent(event, context);
  try {
    if (!response) {
      const region = env.AWS_REGION ?? 'us-east-1';

      if (env.userPoolId) {
        // Cognito is configured - include auth fields
        const outputs = await getStackOutputs(env.stackName);
        response = {
          region,
          userPoolId: env.userPoolId,
          clientId: outputs.outputs.UserPoolClientId,
          branding: env.branding === 'true' ? true : false,
        };
      } else {
        // Cognito is not configured - only include region
        response = {
          region,
          branding: env.branding === 'true' ? true : false,
        };
      }
    }

    return respondObject(200, response);
  } catch (error) {
    await sendError('Unhandled Error: api/init', error as Error);
    return respondError(error);
  }
};
