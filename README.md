# @cxbuilder/flow-config

AWS CDK constructs for Amazon Connect FlowConfig - a third-party app for configuring variables and prompts in Connect contact flows.

## Installation

```bash
npm install @cxbuilder/flow-config
```

## Usage

### Standard Deployment (Public)

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

For enhanced security, you can deploy the application to run entirely within a VPC with private endpoints:

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

## Features

- **Serverless Architecture**: Built with AWS Lambda, DynamoDB, and API Gateway
- **Amazon Connect Integration**: GetConfig Lambda function integrated directly with Connect contact flows
- **Third-Party App**: Web-based interface embedded in Amazon Connect Agent Workspace
- **Multi-Language Support**: Configure prompts for different languages and channels (voice/chat)
- **Real-time Preview**: Text-to-speech preview using Amazon Polly
- **Secure Access**: Integration with Amazon Connect and AWS Verified Permissions
- **Flexible Deployment Options**:
  - **Single-Region**: Standard deployment with regional DynamoDB table
  - **Multi-Region**: Global table support with automatic replication across regions
  - **Public Deployment**: Standard internet-accessible API Gateway and Lambda functions
  - **VPC Private Deployment**: Private API Gateway endpoints, VPC-enabled Lambda functions, and VPC endpoints for enhanced security

## GetConfig Lambda Integration

The GetConfig Lambda function is used within contact flows to access your flow configs. This function is automatically integrated with your Amazon Connect instance during deployment.

### Contact Flow Event Structure

The Lambda function handles Amazon Connect Contact Flow events with the following structure:

```json
{
  "Details": {
    "Parameters": {
      "id": "main-queue",
      "lang": "es-US"
    },
    "ContactData": {
      "Channel": "VOICE",
      "Attributes": {
        "lang": "en-US"
      }
    }
  }
}
```

### Input Parameters and Priority

1. **Required Parameters**:

   - **`id`**: Flow configuration identifier (always required)
     - Provided via `Details.Parameters.id`

2. **Optional Language Selection** (in order of precedence):

   - `Details.Parameters.lang` (highest priority)
   - `Details.ContactData.Attributes.lang`
   - Defaults to `"en-US"`

3. **Channel Detection**:
   - Automatically read from `Details.ContactData.Channel`
   - Supports `"VOICE"` and `"CHAT"`
   - Defaults to `"voice"`

### Alternative Input Format (Testing)

For direct testing or non-Connect invocation:

```json
{
  "id": "main-queue",
  "lang": "es-US",
  "channel": "voice"
}
```

### Function Behavior

1. **Parameter Resolution**:

   - Extracts `id` from Connect event parameters (required)
   - Resolves language from parameters → attributes → default
   - Determines channel from Contact Flow event data

2. **Processing Steps**:

   - Retrieves the flow config from DynamoDB using the provided ID
   - Includes all variables from the flow config in the result
   - For each prompt in the flow config:
     - Selects the appropriate language version
     - Uses voice content by default
     - For chat channel:
       - Uses chat-specific content if available
       - Strips SSML tags from voice content if no chat content exists

3. **Output**:
   - Returns a flattened object containing:
     - All variable key-value pairs from the flow config
     - All prompt values resolved for the specified language and channel

### Setting Up in Contact Flow

1. **Add "Invoke AWS Lambda function" block** to your contact flow
2. **Select the GetConfig Lambda function** (deployed as `${prefix}-get-config`)
3. **Configure parameters**:

```json
{
  "id": "main-queue"
}
```

Or with explicit language:

```json
{
  "id": "main-queue",
  "lang": "es-US"
}
```

### Using Returned Data

The Lambda response is automatically available in subsequent blocks:

- **Set contact attributes**: Use `$.External.variableName`
- **Play prompt**: Use `$.External.promptName`
- **Check contact attributes**: Reference returned variables for routing decisions

### Example Contact Flow Integration

```
[Get customer input] → [Invoke Lambda: GetConfig]
                           ↓
                      [Set contact attributes]
                           ↓
                      [Play prompt: $.External.welcomeMessage]
                           ↓
                      [Route based on: $.External.routingMode]
```

### Size Considerations

- Amazon Connect has a Lambda response size limit of 32KB
- The combined size of returned variables and prompts should be less than this limit
- For large flow configs with many prompts or languages, consider implementing pagination or selective loading

### Logger

[Lambda PowerTools Logger](https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/) provides a lightweight logger implementation with JSON output.

Tips:

- Use the `appendKeys()` method to add `ContactId` to your connect log lambda output.

### Open API Spec

This template defines an Open API Spec for the API GW Lambdas. This allows use to generate a TypeScript api client to be used by the frontend app. We can also generate a API client in any language from the same spec to allow the client to better integrate with our apps.

- [constructs/aws-openapigateway-lambda](https://docs.aws.amazon.com/solutions/latest/constructs/aws-openapigateway-lambda.html)
- [OpenAPI Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi)
- [OpenApy TypeScript Generator](https://openapi-ts.pages.dev/introduction)

## Development

### Frontend Development

The frontend React application integrates with Amazon Connect Agent Workspace using the Connect SDK:

```bash
# Start local development server
npm start

# Build for production
npm run build
```

For local development, point your Amazon Connect third-party app configuration to `localhost:3000`. The application requires execution within Agent Workspace for Connect SDK functionality.

### Lambda Development

Lambda functions are bundled automatically during the build process:

```bash
# Bundle Lambda functions
npm run build:lambdas

# Full build (CDK + Frontend + Lambdas)
npm run build
```
