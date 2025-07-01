import { Construct } from 'constructs';
import { join } from 'path';
import {
  EndpointType,
  RestApiBaseProps,
  SpecRestApi,
  ApiDefinition,
} from 'aws-cdk-lib/aws-apigateway';
import {
  PolicyDocument,
  PolicyStatement,
  Effect,
  AnyPrincipal,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Init } from './Init';
import { FlowConfig } from './FlowConfig';
import { PreviewSpeech } from './PreviewSpeech';
import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { FlowConfigStack } from '../FlowConfigStack';
import { Users } from './Users';
import { Static } from './Static';

export class Api extends Construct {
  staticHosting: Static;
  restApi: SpecRestApi;

  constructor(public stack: FlowConfigStack) {
    super(stack, 'Api');

    // Create static hosting construct first
    this.staticHosting = new Static(this);

    // Configure API Gateway based on VPC settings
    const vpcConfig = stack._getResolvedVpcConfig();
    const apiGatewayProps: RestApiBaseProps = vpcConfig?.vpcEndpoint
      ? {
          restApiName: stack.props.prefix,
          endpointConfiguration: {
            types: [EndpointType.PRIVATE],
            vpcEndpoints: [vpcConfig.vpcEndpoint],
          },
          policy: this.createVpcEndpointPolicy(vpcConfig.vpc.vpcId),
        }
      : {
          restApiName: stack.props.prefix,
        };

    // Create Lambda functions
    const initLambda = new Init(this).lambda;
    const usersLambda = new Users(this).lambda;
    const flowConfigLambda = new FlowConfig(this).lambda;
    const previewSpeechLambda = new PreviewSpeech(this).lambda;
    const staticLambda = this.staticHosting.handler;

    // Update Authorizer Provider ARN
    const sourceFileName = join(__dirname, 'spec.yaml');
    const yml = readFileSync(sourceFileName).toString();
    const spec = parse(yml);

    if (stack.userPool) {
      // Configure Cognito authorization if user pool exists
      const authorizer = spec.components.securitySchemes.CognitoAuthorizer;
      authorizer['x-amazon-apigateway-authorizer'].providerARNs = [
        stack.userPool.userPoolArn,
      ];
    } else {
      // Remove Cognito authorization when not configured
      delete spec.components.securitySchemes.CognitoAuthorizer;

      // Remove security requirements from all endpoints
      this.removeSecurityFromEndpoints(spec);
    }

    // Helper function to set Lambda integration URI
    const setLambdaIntegration = (
      path: string,
      method: string,
      lambda: any
    ) => {
      spec.paths[path][method][
        'x-amazon-apigateway-integration'
      ].uri = `arn:aws:apigateway:${stack.region}:lambda:path/2015-03-31/functions/${lambda.functionArn}/invocations`;
    };

    // Update the spec to replace handler URIs with actual Lambda ARNs
    setLambdaIntegration('/api/init', 'get', initLambda);
    setLambdaIntegration('/api/users/{userId}', 'get', usersLambda);
    setLambdaIntegration('/api/flow-config', 'get', flowConfigLambda);
    setLambdaIntegration('/api/flow-config/{id}', 'get', flowConfigLambda);
    setLambdaIntegration('/api/flow-config/{id}', 'post', flowConfigLambda);
    setLambdaIntegration('/api/flow-config/{id}', 'delete', flowConfigLambda);
    setLambdaIntegration('/api/flow-config/preview', 'post', flowConfigLambda);
    setLambdaIntegration('/api/preview-speech', 'post', previewSpeechLambda);
    setLambdaIntegration('/{proxy+}', 'get', staticLambda);
    setLambdaIntegration('/', 'get', staticLambda);

    // Create API Gateway from updated OpenAPI spec
    this.restApi = new SpecRestApi(this, 'RestApi', {
      ...apiGatewayProps,
      apiDefinition: ApiDefinition.fromInline(spec),
    });

    // Grant API Gateway permission to invoke Lambda functions
    const apiGatewayPrincipal = new ServicePrincipal(
      'apigateway.amazonaws.com'
    );
    initLambda.grantInvoke(apiGatewayPrincipal);
    usersLambda.grantInvoke(apiGatewayPrincipal);
    flowConfigLambda.grantInvoke(apiGatewayPrincipal);
    previewSpeechLambda.grantInvoke(apiGatewayPrincipal);
    staticLambda.grantInvoke(apiGatewayPrincipal);
  }

  /**
   * Remove security requirements from all endpoints when Cognito is not configured
   */
  private removeSecurityFromEndpoints(spec: any): void {
    // Iterate through all paths and remove security requirements
    Object.keys(spec.paths).forEach((path) => {
      Object.keys(spec.paths[path]).forEach((method) => {
        if (spec.paths[path][method].security) {
          delete spec.paths[path][method].security;
        }
      });
    });
  }

  /**
   * Create a resource policy for the VPC endpoint to restrict access to the specific VPC
   */
  private createVpcEndpointPolicy(vpcId: string): PolicyDocument {
    return new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new AnyPrincipal()],
          actions: ['execute-api:*'],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'aws:SourceVpc': vpcId,
            },
          },
        }),
      ],
    });
  }
}
