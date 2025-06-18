import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';
import { createLambda } from '../../createLambda';
import { existsSync } from 'fs';

export class Static extends Construct {
  public readonly handler: lambda.Function;

  constructor(scope: Construct) {
    super(scope, 'Static');

    let frontendDistPath = join(__dirname, '../../../dist/frontend');
    if (!existsSync(frontendDistPath)) {
      // Running in dev mode, try to find the frontend dist in a different location
      frontendDistPath = join(__dirname, '../../../frontend');
    }

    // Create Lambda function to serve static frontend assets
    this.handler = createLambda(this, 'Handler', {
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
      },
    });
  }
}
