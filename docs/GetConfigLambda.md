# GetConfig Lambda Function

## Overview

The GetConfig Lambda function is a critical component of the app architecture. It retrieves configuration sets from DynamoDB and processes them for use in Amazon Connect contact flows. This function is implemented in TypeScript and automatically integrated with your Amazon Connect instance.

## Implementation

[Handler Code](../../backend/GetConfig.ts)

## Amazon Connect Integration

The Lambda function is designed to handle Amazon Connect Contact Flow events and supports multiple input methods:

### Contact Flow Event Structure

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

### Alternative Input Format

For direct testing or non-Connect invocation:

```json
{
  "id": "main-queue",
  "lang": "es-US",
  "channel": "voice"
}
```

## Function Behavior

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

## Error Handling

- If a requested language is not defined for a prompt, the function raises an exception
- The function assumes the flow config exists in DynamoDB; additional error handling may be needed for production

## Contact Flow Usage

### Setting Up in Contact Flow

1. **Add "Invoke AWS Lambda function" block** to your contact flow
2. **Select the GetConfig Lambda function** (deployed as `${prefix}-get-config`)
3. **Configure parameters**:

```json
{
  "id": "$.StoredCustomerInput"
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

## Size Considerations

- Amazon Connect has a Lambda response size limit of 32KB
- The combined size of returned variables and prompts should be less than this limit
- For large flow configs with many prompts or languages, consider implementing pagination or selective loading
