import { Construct } from 'constructs';
import { createLambda } from '../createLambda';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { FlowConfigStack } from '../FlowConfigStack';
import { GetConfigEnv } from './GetConfig.interface';
import { CfnIntegrationAssociation } from 'aws-cdk-lib/aws-connect';
import * as cdk from 'aws-cdk-lib';

export class GetConfig extends Construct {
  readonly function: Function;
  constructor(stack: FlowConfigStack) {
    super(stack, 'GetConfig');

    const { connectInstanceArn, prefix } = stack.props;

    this.function = createLambda<GetConfigEnv>(this, 'Handler', {
      functionName: `${prefix}-get-config`,
      environment: {
        FLOW_CONFIGS_TABLE_NAME: stack.table.tableName,
      },
      alertTopic: stack.alertTopic,
    });

    stack.table.grantReadWriteData(this.function);

    // Associate Lambda with Connect instance so it can be used in contact flows
    new CfnIntegrationAssociation(this, 'ConnectLambdaAssociation', {
      instanceId: connectInstanceArn,
      integrationType: 'LAMBDA_FUNCTION',
      integrationArn: this.function.functionArn,
    });

    // Grant Connect permission to invoke the Lambda
    this.function.addPermission('ConnectInvokePermission', {
      principal: new cdk.aws_iam.ServicePrincipal('connect.amazonaws.com'),
      sourceArn: connectInstanceArn,
    });
  }
}
