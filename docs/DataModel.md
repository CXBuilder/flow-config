# Amazon Connect Flow Configs - Data Model

## Overview

This document outlines the data model for the Amazon Connect Flow Configs, including the structure of configuration sets and how they are processed by the GetConfig Lambda function.

## Configuration Set Structure

The core data structure of the application is the FlowConfig, which contains variables and prompts that can be configured by business users and retrieved by Amazon Connect contact flows.

```typescript
interface FlowConfig {
  // Flow Config will be retrieved by id. Can be a queue name, DNIS, flow name, or some custom field.
  id: string;

  // User friendly description
  description: string;

  // Key value pair of variables
  variables: {
    [name: string]: string;
  };

  // Prompts by name, language, channel
  prompts: {
    [name: string]: {
      [lang: string]: {
        voice: string;
        chat?: string;
      };
    };
  };
}
```

### Field Descriptions

- **id**: Unique identifier for the flow config. Can be a queue name, DNIS (phone number), flow name, or any custom identifier.
- **description**: User-friendly description of the flow config's purpose.
- **variables**: Key-value pairs representing configurable variables that affect flow behavior (e.g., `Closure: true/false`).
- **prompts**: Collection of text prompts organized by:
  - **name**: Identifier for the prompt (e.g., "Welcome", "Closure")
  - **lang**: Language code (e.g., "en-US", "es-US")
  - **voice**: Text content for voice channel (may include SSML)
  - **chat**: Optional text content for chat channel

## Lambda Functions

The application uses several Lambda functions to interact with the data model:

- **GetConfig Lambda**: Retrieves and processes flow configs for use in Amazon Connect contact flows. See [GetConfigLambda.md](GetConfigLambda.md) for implementation details.

## DynamoDB Configuration

The application uses a dedicated DynamoDB table for storing flow configs with the following configuration:

- **Table Name**: FlowConfigs
- **Primary Key**: `id` (string)
- **Point-in-Time Recovery**: Enabled
- **Deletion Protection**: Enabled
- **Billing Mode**: Pay-per-request (On-demand)

### Table Structure

| Attribute   | Type   | Description                                          |
| ----------- | ------ | ---------------------------------------------------- |
| id          | String | Primary key, unique identifier for the flow config   |
| description | String | User-friendly description of the flow config         |
| variables   | Map    | Key-value pairs of configurable variables            |
| prompts     | Map    | Nested map of prompts by name, language, and channel |

## Size Limitations

- DynamoDB has a maximum record size of 400KB
- Amazon Connect has a lambda response size limit of 32KB
- The combined size of returned variables and prompts should be less than 32KB
- Supporting many languages could potentially approach the 400KB total record size limit

## Data Integrity Rules

- Attribute and prompt names must be unique within a flow config
- Each prompt should have at least one language version
- Each language version must have at least a voice variant
