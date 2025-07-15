import { Construct } from 'constructs';
import { createLambda } from '../../createLambda';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { SettingsEnv } from './Settings.interface';
import { Api } from '../Api';

export class Settings extends Construct {
  readonly lambda: Function;

  constructor(api: Api) {
    super(api, 'Settings');

    // Create Lambda function
    this.lambda = createLambda<SettingsEnv>(this, 'Handler', {
      environment: {
        TABLE_NAME: api.stack.table.tableName,
        USER_POOL_ID: api.stack.props.cognito?.userPoolId || '',
      },
      alertTopic: api.stack.alertTopic,
    });

    // Grant DynamoDB permissions
    api.stack.table.grantReadWriteData(this.lambda);
  }
}
