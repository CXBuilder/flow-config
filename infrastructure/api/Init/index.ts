import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { InitEnv } from './Init.interface';
import { Api } from '../Api';
import { Duration, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { createLambda } from '../../createLambda';

/**
 * Provides run-time configuration for the API such as Auth.
 */
export class Init extends Construct {
  readonly lambda: Function;
  constructor(api: Api) {
    super(api, 'Init');

    const { stackName, region, account } = Stack.of(this);

    this.lambda = createLambda<InitEnv>(this, 'Handler', {
      environment: {
        stackName: stackName,
        userPoolId: api.stack.props.cognito?.userPoolId,
      },
      timeout: Duration.seconds(15),
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cloudformation:DescribeStacks'],
          resources: [
            `arn:aws:cloudformation:${region}:${account}:stack/${stackName}/*`,
          ],
        }),
      ],
      alertTopic: api.stack.alertTopic,
    });
  }
}
