import { Construct } from 'constructs';
import { createLambda } from '../../createLambda';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { FlowConfigStack } from '../../FlowConfigStack';
import { SettingsEnv } from './Settings.interface';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class Settings extends Construct {
  readonly function: Function;
  readonly table: Table;

  constructor(stack: FlowConfigStack) {
    super(stack, 'Settings');

    const { prefix } = stack.props;

    // Create DynamoDB table for settings
    this.table = new Table(this, 'SettingsTable', {
      tableName: `${prefix}-settings`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      deletionProtection: stack.props.prod || false,
      removalPolicy: stack.props.prod 
        ? dynamodb.RemovalPolicy.RETAIN 
        : dynamodb.RemovalPolicy.DESTROY,
    });

    // Create Lambda function
    this.function = createLambda<SettingsEnv>(this, 'Handler', {
      functionName: `${prefix}-settings`,
      environment: {
        SETTINGS_TABLE_NAME: this.table.tableName,
      },
      alertTopic: stack.alertTopic,
    });

    // Grant DynamoDB permissions
    this.table.grantReadWriteData(this.function);
  }
}