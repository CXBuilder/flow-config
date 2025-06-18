# Amazon Connect Flow Configs - Frontend Requirements

## Overview

This document outlines the frontend requirements for the Amazon Connect Flow Configs, including technology stack, user interface, and integration points.

## Technology Stack

- **Framework**: TypeScript/React/Vite
- **UI Library**: Amazon CloudScape UI framework with Amazon Connect theme
- **Authentication**: AWS Amplify authentication library for Cognito integration
- **Deployment**: Embedded as a 3rd Party App in Amazon Connect Agent Workspace

## User Interface Requirements

### General Requirements

- The UI should be responsive and mobile-friendly for emergency scenarios
- The application should provide clear visual indicators of user access levels (Full, Edit, Read)
- Form validation should prevent duplicate attribute or prompt names
- The UI should warn users when approaching DynamoDB size limits (400KB) or Lambda response limits (32KB)

### Flow Config Management

#### Flow Config List View

- Display a list of flow configs the user has access to
- Show flow config ID and description
- Indicate the user's access level for each flow config
- Provide filtering capabilities to find specific flow configs
- Include create, edit, and delete actions based on user permissions

#### Flow Config Detail View

**variables Section**

- Display and edit key-value pairs
- Support boolean (true/false) and string values
- Validate attribute names to prevent duplicates
- Show validation errors inline

**Prompts Section**

- Organize prompts by name, language, and channel (voice/chat)
- Support multiple languages (en-US, es-US, etc.)
- Allow different content for voice and chat channels
- Support SSML for voice prompts
- Provide a preview button that uses Amazon Polly to play voice prompts

## User Flows

### Admin User Flow

1. User logs into Amazon Connect Agent Workspace
2. User accesses the Flow Configs app from the workspace
3. User views list of flow configs they have access to
4. User can create a new flow config:
   - Specify ID and description
   - Add variables with key-value pairs
   - Add prompts with multilingual and multichannel support
5. User can edit existing flow configs:
   - Modify variables and prompts
   - Preview voice prompts using Polly
6. User can delete flow configs they have full access to

### Business User Flow

1. User logs into Amazon Connect Agent Workspace
2. User accesses the Flow Configs app from the workspace
3. User views list of flow configs they have access to
4. User can edit attribute values and prompt content for existing flow configs
5. User cannot create new flow configs or delete existing ones
6. Example scenario: During a fire alarm, the call center manager can:
   - Quickly locate the BasicQueue flow config
   - Change the Closure attribute to true
   - Optionally set ClosureOfferCallback based on the situation

## Authentication & Authorization

- The app will use AWS Amplify to handle Cognito authentication
- Cognito is federated with the same SSO provider as Amazon Connect
- No separate login is required for users already authenticated in Connect
- The UI will respect user permissions retrieved from the API:
  - Full access: Create, read, update, delete capabilities
  - Edit access: Read and update capabilities
  - Read access: View-only capabilities

## Integration Points

### Amazon Connect Integration

- The app is embedded in the Amazon Connect Agent Workspace as a 3rd Party App
- Access to the app is administered through the Amazon Connect interface
- Users will access the Flow Configs app from the agent workspace only

### API Integration

- The frontend communicates with the backend API via API Gateway
- All API requests include the Cognito authentication token
- The API returns appropriate data based on user permissions

### Polly Integration

- The app integrates with Amazon Polly for previewing voice prompts
- Voice prompts can include SSML tags for enhanced speech synthesis
- The preview functionality should work across different languages

## Error Handling

- Display user-friendly error messages for API failures
- Show validation errors inline with form fields
- Provide clear feedback when permission errors occur
- Handle network connectivity issues gracefully

## Accessibility

- The UI should comply with WCAG 2.1 AA standards
- Support keyboard navigation for all interactions
- Ensure proper contrast ratios for text and UI elements
- Provide appropriate ARIA variables for screen readers

## Mobile Experience

- The application should be responsive and usable on mobile devices
- Critical functions (like changing the Closure attribute) should be easily accessible on small screens
- Touch targets should be appropriately sized for mobile interaction

## Development Guidelines

- Use TypeScript for type safety
- Follow React best practices for component structure
- Implement proper state management
- Write unit tests for critical components
- Document component usage with Storybook or similar tool
