#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FlowConfigStack, FlowConfigStackProps } from '../dist/infrastructure';

const app = new cdk.App();

const config: Record<string, FlowConfigStackProps> = {
  dev: {
    prefix: 'cxbuilder-flow-config',
    env: {
      region: 'us-east-1',
      account: '779926948221',
    },
    cognito: {
      domain: 'https://demo-cxbuilder.auth.us-east-1.amazoncognito.com',
      userPoolId: 'us-east-1_eug3IxCN7',
      ssoProviderName: 'CXBuilder-SSO',
    },
    connectInstanceArn:
      'arn:aws:connect:us-east-1:779926948221:instance/f7a0dc57-5e87-49cb-a724-bfb6a661a55f',
    alertEmails: ['ivan@cxbuilder.ai'],
  },
};

const stage = app.node.tryGetContext('stage') || 'dev';
const props = config[stage];

new FlowConfigStack(app, 'FlowConfigStack', props);
