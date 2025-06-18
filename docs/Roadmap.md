# Amazon Connect Flow Configs - Implementation Roadmap

## Overview

This roadmap outlines the phased implementation approach for the Amazon Connect Flow Configs application. This focused application is part of a potential suite of admin tools, but with a specific purpose: managing configuration sets for Amazon Connect contact flows.

The Flow Configs application will provide significant flexibility to users while enhancing stability by decoupling contact flow changes from prompt and attribute modifications. By implementing a standardized interface with role-based access control, we can ensure secure and controlled configuration management.

Given the scope of this application, a phased approach allows for incremental delivery of value while managing team capacity constraints.

## Implementation Phases

All releases will be deployed using AWS CDK for infrastructure as code.

### Release 1: Core Functionality (Done)

**Focus**: Establish the foundational infrastructure and core Lambda function

**Components**:

- DynamoDB table for flow configs
- GetConfig Lambda function implementation
- Basic CloudFormation/CDK templates

**User Experience**:

- No user interface in this phase
- DynamoDB table updates require change requests
- Flow designers can integrate with the GetConfig Lambda
- Manual validation required when adding new flow configs

**Benefits**:

- Enables contact flow designers to start using configuration-driven flows
- Establishes the data model and core functionality
- Minimal implementation effort while providing immediate value

**Validation Requirements**:

- When a new flow config is added, developers must execute GetConfig for all defined languages
- Output validation ensures expected variables and prompts are returned correctly

### Release 2: Admin Interface (Done)

**Focus**: Provide a basic user interface for configuration management

**Components**:

- React/TypeScript frontend with CloudScape UI
- FlowConfigAPI Lambda for CRUD operations
- PreviewSpeech Lambda for Polly integration
- API Gateway with Cognito authentication
- Frontend deployment via S3/CloudFront
- Integration with shared Cognito user pool

**User Experience**:

- Initial frontend implementation with basic authentication
- All authenticated users have admin access (no RBAC)
- Changes still processed through change requests from users
- The helpdesk team will make all edits through the web application (direct DynamoDB edits are no longer allowed)
- Admin users can preview prompts using Polly

**Benefits**:

- Simplified configuration management through UI
- Reduced manual errors through validation
- Foundation for self-service in future releases

### Release 3: Role-Based Access Control (Planned)

**Focus**: Implement fine-grained access control and enable self-service

**Components**:

- AWS Verified Permissions integration
- Cedar policies for different access levels
- Integration with shared Cognito/PreTokenGeneration Lambda for user tag enrichment
- Enhanced frontend with permission-based UI

**User Experience**:

- Role-based access control with Full, Edit, and Read permissions
- Business users can make changes without change requests
- UI adapts based on user permissions
- Mobile-responsive design for emergency scenarios

**Benefits**:

- Decentralized configuration management
- Faster response to business needs
- Reduced operational overhead for the helpdesk team
- Enhanced security through proper access controls

**Training & Rollout**:

- User training sessions
- Documentation and user guides
- Phased access grants to business users
- Monitoring and support during transition

## Success Criteria

### Release 1

- GetConfig Lambda successfully retrieves and processes flow configs
- Contact flows can integrate with the Lambda
- Data model supports all required variables and prompts

### Release 2

- Admin interface allows viewing and editing of flow configs
- Preview functionality works correctly with Amazon Polly
- Authentication system properly secures the application

### Release 3

- Verified Permissions correctly enforces access controls
- Business users can independently make changes within their permission scope
- Reduced number of change requests for configuration updates

## Future Enhancements

Post-Release 3, potential enhancements could include:

- Bulk import/export functionality
- Audit logging and change history
- Integration with CI/CD pipelines for automated testing
