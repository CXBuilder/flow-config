import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import {
  Architecture,
  Runtime,
  Tracing,
  Function,
  FunctionProps,
  Code,
  LayerVersion,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { FlowConfigStack } from './FlowConfigStack';

interface CreateLambdaProps<TEnv>
  extends Omit<FunctionProps, 'handler' | 'environment' | 'code' | 'runtime'> {
  environment?: TEnv;

  /**
   * Notify someone when your lambda fails!
   */
  alertTopic?: ITopic;
}
/**
 * Utility function for creating a log group and lambda with app defaults.
 * Enforces environment variables via generic parameter TEnv
 */
export function createLambda<TEnv>(
  scope: Construct,
  id: string,
  props: CreateLambdaProps<TEnv>
) {
  // Determine the code location based on logical ID
  // If id is "Handler", use the parent construct's ID instead
  const backendId = id === 'Handler' ? scope.node.id : id;
  let codeLocation = resolve(__dirname, '..', 'backend', backendId);
  let expectedIndexFile = resolve(codeLocation, 'index.js');

  // Verify the bundled Lambda code exists, try ../dist/backend if not found
  if (!existsSync(expectedIndexFile)) {
    // Try alternative location in ../dist/backend
    codeLocation = resolve(__dirname, '..', 'dist', 'backend', backendId);
    expectedIndexFile = resolve(codeLocation, 'index.js');
    
    if (!existsSync(expectedIndexFile)) {
      throw new Error(
        `Lambda function ${backendId} bundled code not found at: ${expectedIndexFile} or ${resolve(__dirname, '..', 'backend', backendId, 'index.js')}. ` +
          'Please run "npm run build:lambdas" to bundle the Lambda functions.'
      );
    }
  }

  console.log(
    `📦 Using Lambda code for ${backendId} (id=${id}) from: ${codeLocation}`
  );

  // Get the current region for the Lambda Powertools layer
  const region = Stack.of(scope).region;

  // AWS Lambda Powertools layer ARN
  // See: https://docs.powertools.aws.dev/lambda/typescript/latest/#lambda-layer
  const powertoolsLayerArn = `arn:aws:lambda:${region}:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:22`;

  // Check if we're in a FlowConfigStack and get VPC configuration
  const stack = Stack.of(scope) as FlowConfigStack;
  const vpcConfig = stack._getResolvedVpcConfig();

  const func = new Function(scope, `${id}Function`, {
    // Apply defaults
    handler: 'index.handler',
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    tracing: Tracing.ACTIVE,
    timeout: Duration.seconds(30),
    code: Code.fromAsset(codeLocation),
    layers: [
      LayerVersion.fromLayerVersionArn(
        scope,
        `${id}PowertoolsLayer`,
        powertoolsLayerArn
      ),
    ],
    // VPC configuration if provided
    ...(vpcConfig && {
      vpc: vpcConfig.vpc,
      vpcSubnets: { subnets: vpcConfig.privateSubnets },
      securityGroups: vpcConfig.lambdaSecurityGroups,
    }),
    // Apply overrides
    ...props,
    // Ensure that the log retention custom resource is not created
    logRetention: undefined,
    environment: {
      // see https://docs.aws.amazon.com/lambda/latest/dg/typescript-exceptions.html
      NODE_OPTIONS: '--enable-source-maps',
      // Log level. Do not emit DEBUG in prod environment because it will bloat your CW costs
      POWERTOOLS_LOG_LEVEL: 'DEBUG',
      // Log incoming event
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      ALERT_TOPIC_ARN: props.alertTopic?.topicArn ?? 'N/A',
      ...props.environment,
    },
  });

  props.alertTopic?.grantPublish(func);

  // Note: we are using this policy instead of log.grantWrite(func) because the func.functionName a circular dependency.
  // To constrain LogGroup permissions further, you can use a static functionName with log.grantWrite
  func.role?.addManagedPolicy(
    ManagedPolicy.fromAwsManagedPolicyName(
      vpcConfig
        ? 'service-role/AWSLambdaVPCAccessExecutionRole'
        : 'service-role/AWSLambdaBasicExecutionRole'
    )
  );

  // Create a self-managed log group
  new LogGroup(scope, `${id}LogGroup`, {
    retention: props.logRetention ?? RetentionDays.ONE_MONTH,
    logGroupName: `/aws/lambda/${func.functionName}`,
    removalPolicy: RemovalPolicy.DESTROY,
  });
  return func;
}
