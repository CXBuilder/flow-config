#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FlowConfigStack } from '../dist/infrastructure';
import { DefaultStackSynthesizer } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';

const app = new cdk.App();

const lambdaRole = 'aci-ccaas-lambda-role';
Role.customizeRoles(app, {
  preventSynthesis: true,
  usePrecreatedRoles: {
    'East/GetConfig/HandlerFunction/ServiceRole': lambdaRole,
    'East/Api/Static/HandlerFunction/ServiceRole': lambdaRole,
    'East/Api/Init/HandlerFunction/ServiceRole': lambdaRole,
    'East/Api/Users/HandlerFunction/ServiceRole': lambdaRole,
    'East/Api/FlowConfig/HandlerFunction/ServiceRole': lambdaRole,
    'East/Api/PreviewSpeech/HandlerFunction/ServiceRole': lambdaRole,
    'East/Api/Settings/HandlerFunction/ServiceRole': lambdaRole,
    'East/SecurityProfileProvider/HandlerFunction/ServiceRole': lambdaRole,
    'East/SecurityProfileProvider/Provider/framework-onEvent/ServiceRole':
      lambdaRole,
    'East/@aws-cdk--aws-dynamodb.ReplicaProvider/OnEventHandler/ServiceRole':
      lambdaRole,
    'East/@aws-cdk--aws-dynamodb.ReplicaProvider/IsCompleteHandler/ServiceRole':
      lambdaRole,
    'East/@aws-cdk--aws-dynamodb.ReplicaProvider/Provider/framework-onEvent/ServiceRole':
      lambdaRole,
    'East/@aws-cdk--aws-dynamodb.ReplicaProvider/Provider/framework-isComplete/ServiceRole':
      lambdaRole,
    'East/@aws-cdk--aws-dynamodb.ReplicaProvider/Provider/framework-onTimeout/ServiceRole':
      lambdaRole,
    'East/@aws-cdk--aws-dynamodb.ReplicaProvider/Provider/waiter-state-machine/Role':
      lambdaRole,
    'West/GetConfig/HandlerFunction/ServiceRole': lambdaRole,
    'West/Api/Static/HandlerFunction/ServiceRole': lambdaRole,
    'West/Api/Init/HandlerFunction/ServiceRole': lambdaRole,
    'West/Api/Users/HandlerFunction/ServiceRole': lambdaRole,
    'West/Api/FlowConfig/HandlerFunction/ServiceRole': lambdaRole,
    'West/Api/PreviewSpeech/HandlerFunction/ServiceRole': lambdaRole,
    'West/Api/Settings/HandlerFunction/ServiceRole': lambdaRole,
    'West/SecurityProfileProvider/HandlerFunction/ServiceRole': lambdaRole,
    'West/SecurityProfileProvider/Provider/framework-onEvent/ServiceRole':
      lambdaRole,
  },
});

new FlowConfigStack(app, 'East', {
  prefix: 'aci-ccaas-flow-config',
  env: {
    region: 'us-east-1',
    account: '779926948221',
  },
  // cognito: {
  //   domain: 'https://demo-cxbuilder.auth.us-east-1.amazoncognito.com',
  //   userPoolId: 'us-east-1_eug3IxCN7',
  //   ssoProviderName: 'CXBuilder-SSO',
  // },
  connectInstanceArn:
    'arn:aws:connect:us-east-1:779926948221:instance/ee0bc407-15a9-40d4-8eeb-3a90f53e3269',
  securityProfiles: [],
  alertEmails: [],
  synthesizer: new DefaultStackSynthesizer({
    qualifier: 'ssa',
  }),
  globalTable: {
    isPrimaryRegion: true,
    replicaRegions: ['us-west-2'],
  },
});

new FlowConfigStack(app, 'West', {
  prefix: 'aci-ccaas-flow-config',
  env: {
    region: 'us-west-2',
    account: '779926948221',
  },
  // cognito: {
  //   domain: 'https://demo-cxbuilder.auth.us-east-1.amazoncognito.com',
  //   userPoolId: 'us-east-1_eug3IxCN7',
  //   ssoProviderName: 'CXBuilder-SSO',
  // },
  connectInstanceArn:
    'arn:aws:connect:us-west-2:779926948221:instance/0cc815d1-03da-4d0a-87d4-2c3a826c3cd9',
  securityProfiles: [],
  alertEmails: [],
  synthesizer: new DefaultStackSynthesizer({
    qualifier: 'ssa',
  }),
  globalTable: {
    isPrimaryRegion: false,
  },
});
