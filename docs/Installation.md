# Installation and Deployment Guide

This guide covers installing and deploying the FlowConfig CDK construct to your AWS environment.

## Installation

```bash
npm install @cxbuilder/flow-config
```

## Deployment Options

FlowConfig supports multiple deployment configurations to meet different security and resilience requirements.

### Standard Deployment (Public)

Basic deployment with public API Gateway endpoint:

```typescript
import { FlowConfigStack } from '@cxbuilder/flow-config';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
new FlowConfigStack(app, 'FlowConfigStack', {
  prefix: 'my-flow-config',
  env: {
    region: 'us-east-1',
    account: 'YOUR_ACCOUNT_ID',
  },
  cognito: {
    domain: 'https://your-auth-domain.com',
    userPoolId: 'us-east-1_YourPoolId',
  },
  connectInstanceArn:
    'arn:aws:connect:us-east-1:YOUR_ACCOUNT:instance/YOUR_INSTANCE_ID',
  alertEmails: ['admin@yourcompany.com'],
});
```

### VPC Private Deployment

For enhanced security, deploy the application entirely within a VPC with private endpoints:

```typescript
import { FlowConfigStack, VpcConfig } from '@cxbuilder/flow-config';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

// Configure VPC using string IDs - the stack will resolve these to CDK objects
const vpcConfig: VpcConfig = {
  vpcId: 'vpc-12345678',
  lambdaSecurityGroupIds: ['sg-lambda123'],
  privateSubnetIds: ['subnet-12345', 'subnet-67890'],
  vpcEndpointSecurityGroupIds: ['sg-endpoint123'],
};

new FlowConfigStack(app, 'FlowConfigStack', {
  prefix: 'my-flow-config',
  env: {
    region: 'us-east-1',
    account: 'YOUR_ACCOUNT_ID',
  },
  cognito: {
    domain: 'https://your-auth-domain.com',
    userPoolId: 'us-east-1_YourPoolId',
  },
  connectInstanceArn:
    'arn:aws:connect:us-east-1:YOUR_ACCOUNT:instance/YOUR_INSTANCE_ID',
  alertEmails: ['admin@yourcompany.com'],
  vpc: vpcConfig, // Enable VPC private deployment
});
```

### Multi-Region Global Table Deployment

For global resilience, deploy the application across multiple regions with DynamoDB Global Tables:

#### Primary Region Setup

```typescript
import { FlowConfigStack, GlobalTableConfig } from '@cxbuilder/flow-config';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

// Primary region creates the global table with replicas
const primaryGlobalTable: GlobalTableConfig = {
  isPrimaryRegion: true,
  replicaRegions: ['us-west-2', 'eu-west-1'],
};

new FlowConfigStack(app, 'FlowConfigStack-Primary', {
  prefix: 'my-flow-config',
  env: {
    region: 'us-east-1',
    account: 'YOUR_ACCOUNT_ID',
  },
  cognito: {
    domain: 'https://your-auth-domain.com',
    userPoolId: 'us-east-1_YourPoolId',
  },
  connectInstanceArn:
    'arn:aws:connect:us-east-1:YOUR_ACCOUNT:instance/YOUR_INSTANCE_ID',
  alertEmails: ['admin@yourcompany.com'],
  globalTable: primaryGlobalTable, // Enable global table
});
```

#### Secondary Region Setup

```typescript
new FlowConfigStack(app, 'FlowConfigStack-Secondary', {
  prefix: 'my-flow-config',
  env: {
    region: 'us-west-2',
    account: 'YOUR_ACCOUNT_ID',
  },
  cognito: {
    domain: 'https://your-auth-domain.com',
    userPoolId: 'us-west-2_YourPoolId',
  },
  connectInstanceArn:
    'arn:aws:connect:us-west-2:YOUR_ACCOUNT:instance/YOUR_INSTANCE_ID',
  alertEmails: ['admin@yourcompany.com'],
  globalTable: {
    isPrimaryRegion: false, // Reference global table
  },
});
```

## Configuration Parameters

### Required Parameters

- **prefix**: Unique identifier for your deployment resources
- **env.region**: AWS region for deployment
- **env.account**: Your AWS account ID
- **cognito.domain**: Cognito authentication domain
- **cognito.userPoolId**: Cognito user pool identifier
- **connectInstanceArn**: Amazon Connect instance ARN
- **alertEmails**: Email addresses for operational alerts

### Optional Parameters

- **vpc**: VPC configuration for private deployment
- **globalTable**: Global table configuration for multi-region deployment

## Post-Deployment Steps

1. **Configure Amazon Connect Integration**
   - Add the GetConfig Lambda function to your Connect instance
   - Configure the third-party app in Agent Workspace

2. **Set Up User Permissions**
   - Assign users to appropriate Cognito groups (FlowConfigAdmin, FlowConfigEdit, FlowConfigRead)
   - Configure access levels in Amazon Connect

3. **Verify Deployment**
   - Test the GetConfig Lambda function
   - Access the web interface through Agent Workspace
   - Verify user permissions are working correctly

## Development Deployment

For local development:

```bash
# Start local development server
npm start

# Build for production
npm run build
```

For local development, point your Amazon Connect third-party app configuration to `localhost:3000`. The application requires execution within Agent Workspace for Connect SDK functionality.

## Troubleshooting

### Common Issues

1. **Lambda Function Not Found**
   - Verify the Lambda function has been added to your Connect instance
   - Check IAM permissions for Lambda execution

2. **Authentication Errors**
   - Verify Cognito configuration matches your deployment
   - Ensure users are assigned to appropriate Cognito groups

3. **VPC Connectivity Issues**
   - Verify security group rules allow required traffic
   - Ensure VPC endpoints are correctly configured

For additional support, see the [Architecture](./Architecture.md) documentation.
