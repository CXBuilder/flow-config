# Amazon Connect Flow Configs - Permissions Management (Planned)

## Overview

This document outlines the permissions management strategy for the Amazon Connect Flow Configs using Amazon Verified Permissions for role-based access control (RBAC).

## Authentication Flow

1. Users are initially granted access to the Flow Configs via the Amazon Connect Admin Console
2. Authentication is handled via Amazon Cognito, which is federated with the same SSO provider as Amazon Connect
3. A Cognito PreTokenGeneration Lambda enriches user tokens with relevant user tags
4. The application uses AWS Amplify authentication library to handle Cognito authentication for API access

## Authorization with Amazon Verified Permissions

### Core Concepts

- **User Tags**: Variables assigned to users that determine their access levels
- **Access Levels**: Different permission tiers (Full, Edit, Read)
- **Flow Config IDs**: Unique identifiers for configuration sets that can be targeted by permissions

### Authorization Flow

1. When the app starts, the Cognito PreToken Lambda looks up user tags and adds them to the user token
2. When a user requests flow configs, the API calls Amazon Verified Permissions with:
   - User tags from the token
   - List of flow config IDs
3. Verified Permissions evaluates policies and returns access levels for each flow config
4. The API filters the flow configs and applies the appropriate access level before returning data to the frontend

### User Tag Structure

User tags follow a specific format to define access levels and targets:

| Tag Format                    | Description                                             | Example                                          |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `AdminAppFull: [pattern]`     | Grants full access to flow configs matching the pattern | `AdminAppFull: *` or `AdminAppFull: aci-ccaas-*` |
| `AdminAppRead: [pattern]`     | Grants read access to flow configs matching the pattern | `AdminAppRead: aci-ccaas-*`                      |
| `AdminAppEdit: [specific-id]` | Grants edit access to a specific flow config            | `AdminAppEdit: +18001234444`                     |

### Access Level Hierarchy

1. **Full**: Full access to create, read, update, and delete flow configs
2. **Edit**: Ability to modify variables and prompts within existing flow configs
3. **Read**: View-only access to flow configs

## Policy Evaluation

When evaluating access to a flow config, the system follows these rules:

1. If a user has Full access to a flow config, they have full permissions
2. If a user has Edit access, they can view and modify but not delete
3. If a user has Read access, they can only view
4. If no matching policies are found, access is denied

## Implementation Details

### PreTokenGeneration Lambda

The Cognito PreTokenGeneration Lambda will:

1. Retrieve user information from the identity provider
2. Look up user tags from the Amazon Connect DescribeUser API
3. Add these tags to the user's token as custom claims

### API Integration

The backend API will:

1. Extract user tags from the token
2. Construct a policy evaluation request to Verified Permissions
3. Filter and modify the response based on the returned access levels
4. Re-evaluate permissions when a new flow config is created or an existing one is updated, based on:
   - The flow config ID/name
   - User tag claims in the token

### Frontend Considerations

The frontend will:

1. Display only the flow configs the user has access to
2. Adjust UI elements based on access level (e.g., disable edit controls for read-only access)
3. Handle permission-related errors gracefully

## Example Policies

Below are examples of Cedar policies for Amazon Verified Permissions:

```cedar
// Grant full access to flow configs matching a pattern
permit(
  principal,
  action == AdminApp::Action::"*",
  resource in AdminApp::FlowConfig
)
when {
  principal has AdminAppFull &&
  (principal.AdminAppFull == "*" || resource.id like principal.AdminAppFull)
};

// Grant read access to flow configs matching a pattern
permit(
  principal,
  action == AdminApp::Action::"Read",
  resource in AdminApp::FlowConfig
)
when {
  principal has AdminAppRead &&
  resource.id like principal.AdminAppRead
};

// Grant edit access to a specific flow config
permit(
  principal,
  action in [AdminApp::Action::"Read", AdminApp::Action::"Edit"],
  resource in AdminApp::FlowConfig
)
when {
  principal has AdminAppEdit &&
  resource.id == principal.AdminAppEdit
};
```
