# Amazon Connect Flow Configs - Permissions Management (v1 - Initial Release)

## Overview

This document outlines the permissions management strategy for the Amazon Connect Flow Configs initial release. Permissions are managed using Amazon Cognito User Groups with a simplified role-based access control (RBAC) model.

## Authentication Flow

1. Users are initially granted access to the Flow Configs via the Amazon Connect Admin Console
2. Authentication is handled via Amazon Cognito, which is federated with the same SSO provider as Amazon Connect
3. Users are assigned to appropriate Cognito User Groups based on their role
4. API endpoints validate user group membership from Cognito tokens to enforce permissions

## Authorization with Cognito User Groups

### Core Concepts

- **Cognito User Groups**: Users are assigned to groups that determine their access levels
- **Access Levels**: Three permission tiers implemented via group membership
- **Global Permissions**: All permissions apply to all flow configs (no per-config restrictions in initial release)

### Authorization Flow

1. When a user authenticates, Cognito includes their group memberships in the JWT token
2. API endpoints extract group information from the token
3. Each API endpoint validates required group membership before processing requests
4. Frontend UI adjusts based on user's group membership (disables controls for restricted users)

### Cognito User Groups

The application uses three Cognito User Groups:

| Group Name        | Permissions                                                  | Description                                          |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| `FlowConfigAdmin` | Create, Read, Update, Delete flow configs and all properties | Full administrative access to all flow configs       |
| `FlowConfigEdit`  | Read flow configs, Edit variable values and prompt content   | Can modify existing values but not add/remove fields |
| `FlowConfigRead`  | Read-only access to all flow configs                         | View-only access for reporting and reference         |

### Access Level Details

1. **FlowConfigAdmin Group**:

   - Create new flow configs
   - Read all flow configs
   - Update any property of flow configs (description, variables, prompts)
   - Delete flow configs
   - Add/remove variables and prompts
   - Modify variable and prompt values

2. **FlowConfigEdit Group**:

   - Read all flow configs
   - Update variable values in existing flow configs
   - Update prompt content in existing flow configs
   - Add new languages to existing prompts
   - Add/remove channels (voice/chat) for existing prompts
   - **Cannot** create new flow configs
   - **Cannot** delete flow configs
   - **Cannot** add new variables or prompts
   - **Cannot** remove existing variables or prompts
   - **Cannot** remove existing languages from prompts
   - **Cannot** modify flow config descriptions

3. **FlowConfigRead Group**:
   - Read all flow configs
   - **Cannot** modify any data

## Permission Evaluation

When evaluating access, the system follows these rules:

1. Users must be members of at least one FlowConfig group to access the application
2. If a user is in multiple groups, they get the highest level of permissions
3. Group hierarchy (highest to lowest): FlowConfigAdmin > FlowConfigEdit > FlowConfigRead
4. Users not in any FlowConfig group are denied access

## Implementation Details

### Cognito User Group Management

Cognito User Groups will be:

1. Created during CDK deployment
2. Managed by administrators through the AWS Console or CLI
3. Users assigned to groups based on their role in the organization

### API Integration

The backend API will:

1. Extract group memberships from the Cognito JWT token
2. Validate required group membership for each endpoint:
   - GET endpoints: Require FlowConfigRead, FlowConfigEdit, or FlowConfigAdmin
   - POST/PUT (create/full update): Require FlowConfigAdmin
   - PATCH (value-only updates): Require FlowConfigEdit or FlowConfigAdmin
   - DELETE endpoints: Require FlowConfigAdmin
3. Return appropriate HTTP status codes (403 Forbidden) for insufficient permissions

### Frontend Considerations

The frontend will:

1. Read user group memberships from the Cognito token
2. Show/hide UI elements based on group membership:
   - Create/Delete buttons: Only for FlowConfigAdmin
   - Edit controls: For FlowConfigEdit and FlowConfigAdmin (with restrictions for Edit users)
   - Read-only mode: For FlowConfigRead users
3. Handle permission-related errors gracefully with user-friendly messages

## API Endpoint Permissions

Below are the permission requirements for each API endpoint:

| HTTP Method | Endpoint Pattern            | Required Group(s)                               | Description                        |
| ----------- | --------------------------- | ----------------------------------------------- | ---------------------------------- |
| GET         | `/flow-configs`             | FlowConfigRead, FlowConfigEdit, FlowConfigAdmin | List all flow configs              |
| GET         | `/flow-configs/{id}`        | FlowConfigRead, FlowConfigEdit, FlowConfigAdmin | Get specific flow config           |
| POST        | `/flow-configs`             | FlowConfigAdmin                                 | Create new flow config             |
| PUT         | `/flow-configs/{id}`        | FlowConfigAdmin                                 | Replace entire flow config         |
| PATCH       | `/flow-configs/{id}/values` | FlowConfigEdit, FlowConfigAdmin                 | Update variable/prompt values only |
| DELETE      | `/flow-configs/{id}`        | FlowConfigAdmin                                 | Delete flow config                 |

## Migration Path to v2

This Cognito Groups approach is designed for the initial release. Future versions (v2) will migrate to Amazon Verified Permissions to support:

- Per-flow-config permissions using pattern matching
- More granular access control based on user attributes
- Dynamic permission evaluation
- Integration with Amazon Connect user tags

The current group-based model provides a foundation that can be extended without breaking existing functionality.
