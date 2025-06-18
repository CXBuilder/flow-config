import { Construct } from 'constructs';
import { createLambda } from '../../createLambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Api } from '../Api';
import { UsersEnv } from './Users.interface';

export class Users extends Construct {
  readonly lambda: Function;
  constructor(api: Api) {
    super(api, 'Users');

    const { connectInstanceArn } = api.stack.props;

    this.lambda = createLambda<UsersEnv>(this, 'Handler', {
      environment: {
        CONNECT_INSTANCE_ARN: connectInstanceArn,
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ['connect:DescribeUser'],
          resources: [`${connectInstanceArn}/agent/*`],
        }),
      ],
      alertTopic: api.stack.alertTopic,
    });
  }
}
