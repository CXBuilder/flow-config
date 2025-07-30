# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-07-30

- Add an admin page where users can select available locale an available voice ids.
- Add ability to import/export configs
- Fix Private API GW URL
- Sort flows/prompts/variables by name
- Add ability to remove CXBuilder branding from frontend

### v2.0.0 Breaking Changes

- Changed DDB from `Table` to `TableV2` to better support ACGR
  - Mitigation: **Backup existing Flow Config table and delete it. Deploy the new version of the app. Restore your table backup.**
- Removed the `-get-config` suffix from the Amazon Connect lambda to reduce function name length. Lambda name now matches the app prefix.
  - Mitigation: Update your flows accordingly
- Use `event.Details.ContactData.LanguageCode` instead of `event.Details.ContactData.Attributes.lang`
  - Mitigation: take advantage fo the LanguageCode feature instead of using a `lang` attribute
  - The `lang` parameter is still available for backwards compatibility - will be removed in a future version
- Split VPC configuration parameters into: `apiVpcConfig` and `lambdaVpcConfig`
  - Mitigation: migrate to the new props

## [1.1.0] - 2025-06-23

### Added

- Role-based access control (RBAC) using Amazon Cognito User Groups
- Three permission levels: FlowConfigAdmin, FlowConfigEdit, and FlowConfigRead
- Backend permission validation for all API endpoints
- Frontend UI adapts based on user permissions
- Read-only mode for users without edit access
- Access denied screen for users without any FlowConfig permissions

### Changed

- Replaced placeholder permission system with full Cognito Groups implementation
- FlowConfigEdit users can add languages to prompts but cannot remove existing ones
- FlowConfigEdit users can add/remove channels but cannot modify structure
- Preview functionality remains available to all permission levels

## [1.0.2] - 2025-06-20

- Converted to `SpecRestApi` because `@aws-solutions-constructs/aws-openapigateway-lambda` is not compatible with `Role.customizeRoles`

## [1.0.0] - 2025-06-18

### Added

- Initial NPM package release of @cxbuilder/flow-config
- AWS CDK constructs for Amazon Connect FlowConfig infrastructure
- InfrastructureStack for deploying serverless architecture
- Lambda functions for CRUD operations on flow configurations
- DynamoDB integration for configuration storage
- API Gateway with OpenAPI specification
- VPC endpoints for secure access
- Integration with Amazon Polly for text-to-speech preview
- React frontend with CloudScape Design System
- TypeScript definitions and API models
- Comprehensive documentation and examples

### Features

- Serverless architecture with AWS Lambda and DynamoDB
- Multi-language prompt support
- Real-time speech preview functionality
- Secure authentication with Amazon Connect and Cognito
- Variable and prompt management interface
