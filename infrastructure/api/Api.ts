import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { join } from 'path';
import { OpenApiGatewayToLambda } from '@aws-solutions-constructs/aws-openapigateway-lambda';
import { EndpointType, RestApiBaseProps } from 'aws-cdk-lib/aws-apigateway';
import {
  PolicyDocument,
  PolicyStatement,
  Effect,
  AnyPrincipal,
} from 'aws-cdk-lib/aws-iam';
import {
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
} from 'aws-cdk-lib/aws-ec2';
import { Init } from './Init';
import { FlowConfig } from './FlowConfig';
import { PreviewSpeech } from './PreviewSpeech';
import { parse, stringify } from 'yaml';
import { readFileSync, writeFileSync } from 'fs';
import { FlowConfigStack } from '../FlowConfigStack';
import { Users } from './Users';
import { Static } from './Static';

export class Api extends Construct {
  staticHosting: Static;
  openApi: OpenApiGatewayToLambda;

  constructor(public stack: FlowConfigStack) {
    super(stack, 'Api');

    // Update Authorizer Provider ARN
    const sourceFileName = join(__dirname, 'spec.yaml');
    const outFileName = join(__dirname, 'spec.out.yaml');

    const yml = readFileSync(sourceFileName).toString();
    const spec = parse(yml);

    const authorizer = spec.components.securitySchemes.CognitoAuthorizer;
    authorizer['x-amazon-apigateway-authorizer'].providerARNs = [
      stack.userPool.userPoolArn,
    ];

    writeFileSync(outFileName, stringify(spec));

    // Upload modified spec file
    const apiDefinitionAsset = new Asset(this, 'ApiSpecAsset', {
      path: outFileName,
    });

    // Create static hosting construct first
    this.staticHosting = new Static(this);

    // Configure API Gateway based on VPC settings
    const vpcConfig = stack._getResolvedVpcConfig();
    const apiGatewayProps: RestApiBaseProps = vpcConfig
      ? {
          restApiName: stack.props.prefix,
          endpointConfiguration: {
            types: [EndpointType.PRIVATE],
            vpcEndpoints: [
              new InterfaceVpcEndpoint(this, 'ApiVpcEndpoint', {
                vpc: vpcConfig.vpc,
                service: InterfaceVpcEndpointAwsService.APIGATEWAY,
                subnets: { subnets: vpcConfig.privateSubnets },
                securityGroups: vpcConfig.vpcEndpointSecurityGroups,
              }),
            ],
          },
          policy: this.createVpcEndpointPolicy(vpcConfig.vpc.vpcId),
        }
      : {
          restApiName: stack.props.prefix,
        };

    this.openApi = new OpenApiGatewayToLambda(this, 'OpenApiGatewayToLambda', {
      apiGatewayProps,
      apiDefinitionAsset,
      apiIntegrations: [
        {
          id: 'InitHandler',
          existingLambdaObj: new Init(this).lambda,
        },
        {
          id: 'UsersHandler',
          existingLambdaObj: new Users(this).lambda,
        },
        {
          id: 'FlowConfigHandler',
          existingLambdaObj: new FlowConfig(this).lambda,
        },
        {
          id: 'PreviewSpeechHandler',
          existingLambdaObj: new PreviewSpeech(this).lambda,
        },
        {
          id: 'StaticHandler',
          existingLambdaObj: this.staticHosting.handler,
        },
      ],
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
