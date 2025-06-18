# Amazon Connect Flow Configs - AWS Architecture

## Architecture Diagram

```mermaid
graph TB
    %% Define styles
    classDef awsService fill:#FF9900,stroke:#232F3E,color:#232F3E,stroke-width:2px
    classDef userComponent fill:#3F8624,stroke:#232F3E,color:white,stroke-width:2px
    classDef dataStore fill:#3B48CC,stroke:#232F3E,color:white,stroke-width:2px
    classDef security fill:#C7131F,stroke:#232F3E,color:white,stroke-width:2px
    classDef vpc fill:#E7E7E7,stroke:#232F3E,color:#232F3E,stroke-width:2px,stroke-dasharray: 5 5

    %% VPC Container
    subgraph VPC["AWS VPC"]
        APIGateway["API Gateway (Private Endpoint)"]
        FlowConfigLambda["FlowConfig Lambda"]
        PreviewSpeechLambda["Preview Speech Lambda"]
        GetConfigLambda["GetConfig Lambda"]
        DDBEndpoint["DynamoDB VPC Endpoint"]
        VPEndpoint["Verified Permissions VPC PrivateLink"]
        CWEndpoint["CloudWatch VPC Endpoint"]
    end

    %% External Services
    User["Amazon Connect Agent Workspace"]:::userComponent
    AmazonConnect["Amazon Connect Contact Flows"]:::awsService
    SSO["SSO Provider"]:::security
    Cognito["Amazon Cognito"]:::security
    DynamoDB["DynamoDB FlowConfigs Table"]:::dataStore
    VerifiedPermissions["AWS Verified Permissions"]:::security
    Polly["Amazon Polly"]:::awsService
    CloudWatch["CloudWatch Logs & Metrics"]:::awsService

    %% Connections
    User -->|"Access via 3rd Party App"| Cognito
    Cognito -->|"Federated Authentication"| SSO
    User -->|"Authenticated Requests"| APIGateway
    AmazonConnect -->|"Invoke Lambda"| GetConfigLambda

    APIGateway -->|"Flow Config Requests"| FlowConfigLambda
    APIGateway -->|"Speech Preview Requests"| PreviewSpeechLambda

    FlowConfigLambda -->|"Get/Update Flow Configs"| DDBEndpoint
    GetConfigLambda -->|"Read Flow Configs"| DDBEndpoint
    DDBEndpoint -->|"Access Data"| DynamoDB

    FlowConfigLambda -->|"Check Permissions"| VPEndpoint
    VPEndpoint -->|"Evaluate Policies"| VerifiedPermissions

    PreviewSpeechLambda -->|"Synthesize Speech"| Polly

    FlowConfigLambda -->|"Log Operations"| CWEndpoint
    PreviewSpeechLambda -->|"Log Operations"| CWEndpoint
    GetConfigLambda -->|"Log Operations"| CWEndpoint
    CWEndpoint -->|"Store Logs and Metrics"| CloudWatch

    %% Apply styles
    APIGateway:::awsService
    FlowConfigLambda:::awsService
    PreviewSpeechLambda:::awsService
    GetConfigLambda:::awsService
    AmazonConnect:::awsService
    DDBEndpoint:::awsService
    VPEndpoint:::awsService
    CWEndpoint:::awsService
    DynamoDB:::dataStore
    VerifiedPermissions:::security
    Polly:::awsService
    CloudWatch:::awsService
    VPC:::vpc
```

## Architecture Components

### User Interface

- **Amazon Connect Agent Workspace**: Hosts the Flow Configs App as a 3rd Party App
- **React/TypeScript Frontend**: Built with Amazon CloudScape UI framework and Connect theme

### Authentication & Authorization

- **SSO Provider**: Federated with Amazon Connect for single sign-on
- **Amazon Cognito**: Handles user authentication and token generation
- **AWS Verified Permissions**: Manages fine-grained access control based on user tags

### API Layer

- **API Gateway (Private Endpoint)**: Securely exposes APIs within the VPC
- **VPC Endpoints**: Provide secure access to AWS services without internet exposure

### Compute

- **FlowConfig Lambda**: Handles CRUD operations for flow configs
- **Preview Speech Lambda**: Processes text-to-speech requests using Amazon Polly
- **GetConfig Lambda**: Retrieves flow configs for Amazon Connect contact flows

### Data Storage

- **DynamoDB**: Stores flow configs with variables and prompts
- **CloudWatch Logs**: Captures application logs and metrics

### Integration Points

- **Amazon Polly**: Provides text-to-speech capabilities for prompt previews
- **Amazon Connect Contact Flows**: Invoke the GetConfig Lambda to retrieve configuration for contact flow routing and prompts

## Security Considerations

1. **Network Security**:

   - Private API Gateway endpoint not accessible from the internet
   - All AWS service access via VPC endpoints
   - No NAT Gateway required as all traffic stays within AWS network

2. **Authentication**:

   - Federated SSO with Amazon Connect
   - JWT token validation via Cognito authorizers

3. **Authorization**:

   - Fine-grained access control with AWS Verified Permissions
   - Role-based access levels (Full, Edit, Read)
   - Permission evaluation based on user tags and flow config IDs

4. **Data Protection**:
   - DynamoDB table with Point-in-Time Recovery enabled
   - Deletion protection enabled
   - Encrypted data at rest and in transit

## Scalability & Reliability

1. **High Availability**:

   - Lambda functions deployed across multiple Availability Zones
   - DynamoDB global tables for multi-region resilience (optional)

2. **Performance**:

   - DynamoDB on-demand capacity for variable workloads
   - API Gateway caching for frequently accessed flow configs

3. **Monitoring**:
   - CloudWatch metrics and alarms for API usage and errors
   - X-Ray tracing for request flows
   - Comprehensive logging for troubleshooting
