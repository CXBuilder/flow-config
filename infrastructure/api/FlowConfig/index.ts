import { Construct } from 'constructs';
import { createLambda } from '../../createLambda';
import { Api } from '../Api';
import { FlowConfigEnv } from './FlowConfig.interface';
import { Function } from 'aws-cdk-lib/aws-lambda';

export class FlowConfig extends Construct {
  readonly lambda: Function;
  constructor(api: Api) {
    super(api, 'FlowConfig');

    this.lambda = createLambda<FlowConfigEnv>(this, 'Handler', {
      environment: {
        FLOW_CONFIGS_TABLE_NAME: api.stack.table.tableName,
        USER_POOL_ID: api.stack.props.cognito?.userPoolId,
      },
      alertTopic: api.stack.alertTopic,
    });

    api.stack.table.grantReadWriteData(this.lambda);
  }
}
