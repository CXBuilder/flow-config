# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is FlowConfig - an Amazon Connect 3rd party app that allows business users to configure pre-defined configuration variables and prompts for Amazon Connect contact flows. The application is built using AWS CDK with TypeScript and targets deployment in a VPC-based architecture with private API Gateway endpoints.

## Development Commands

### Environment Setup

```bash
npm i
```

### CDK Commands

```bash
# List all stacks
cdk ls

# Synthesize CloudFormation template
cdk synth

# Deploy stack to AWS
cdk deploy

# View differences between deployed and current state
cdk diff

# Open CDK documentation
cdk docs
```

### Testing

```bash
# Run unit tests
pytest

# Run specific test
pytest tests/unit/test_prompt_manager_stack.py
```

## Architecture

The application follows a serverless architecture with these key components:

### Backend Infrastructure

- **DynamoDB**: FlowConfigs table storing flow configs with variables and prompts
- **Lambda Functions**:
  - FlowConfig Lambda: CRUD operations for flow configs
  - Preview Speech Lambda: Text-to-speech using Amazon Polly
  - GetConfig Lambda: Retrieves flow configs for Amazon Connect contact flows
- **API Gateway**: Private endpoint within VPC for secure API access
- **VPC Endpoints**: DynamoDB, Verified Permissions, and CloudWatch access

### Frontend (Planned)

- React/TypeScript application using Amazon CloudScape UI framework
- Hosted on S3/CloudFront
- Embedded as 3rd Party App in Amazon Connect Agent Workspace
- Authentication via Cognito federated with Amazon Connect SSO

### Security & Authorization

- **Initial Release (v1)**: Amazon Cognito User Groups for role-based access control
  - FlowConfigAdmin: Full CRUD access to all flow configs
  - FlowConfigEdit: Edit variable/prompt values in existing flow configs
  - FlowConfigRead: Read-only access to all flow configs
- **Future Release (v2)**: AWS Verified Permissions for fine-grained, per-config access control

## Data Model

FlowConfigs contain:

- **id**: Unique identifier (queue name, DNIS, flow name, etc.)
- **description**: User-friendly description
- **variables**: Key-value pairs for configurable variables
- **prompts**: Nested structure by name/language/channel (voice/chat)

### Size Constraints

- DynamoDB record limit: 400KB
- Amazon Connect lambda response limit: 32KB
- Combined variables and prompts should stay under 32KB

## Key Files

- `app.py`: CDK app entry point
- `prompt_manager/prompt_manager_stack.py`: Main CDK stack definition (currently empty template)
- `cdk.json`: CDK configuration with watch settings and feature flags
- `docs/`: Comprehensive documentation including architecture, requirements, and data models
- `tests/unit/`: Unit tests using pytest

## Development Notes

- The CDK stack is currently a blank template and needs implementation
- All AWS resources should be deployed within VPC for security
- Use DynamoDB on-demand capacity for variable workloads
- Implement proper error handling and CloudWatch logging
- Follow AWS CDK best practices for construct organization
