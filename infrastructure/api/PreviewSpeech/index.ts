import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Api } from '../Api';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { createLambda } from '../../createLambda';

/**
 * Preview speech functionality using Amazon Polly
 */
export class PreviewSpeech extends Construct {
  readonly lambda: Function;
  constructor(api: Api) {
    super(api, 'PreviewSpeech');

    this.lambda = createLambda(this, 'Handler', {
      timeout: Duration.seconds(30),
      environment: {},
      alertTopic: api.stack.alertTopic,
    });

    // Grant permissions to use Amazon Polly
    this.lambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['polly:SynthesizeSpeech'],
        resources: ['*'],
      })
    );
  }
}
