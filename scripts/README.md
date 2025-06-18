# Database Seeding Scripts

## Seed DynamoDB with Sample Data

This script populates the DynamoDB table with sample FlowConfig data.

### Prerequisites

1. Ensure AWS credentials are configured
2. Make sure the DynamoDB table exists (deploy the CDK stack first)
3. Set the correct table name and region

### Environment Variables

- `FLOW_CONFIGS_TABLE_NAME`: DynamoDB table name (defaults to 'FlowConfigStack-FlowConfigsTable')
- `AWS_REGION`: AWS region (defaults to 'us-east-1')
- `DYNAMODB_ENDPOINT`: Optional - for local DynamoDB

### Usage

```bash
# Run with default settings
npm run seed

# Run with custom table name
FLOW_CONFIGS_TABLE_NAME=YourTableName npm run seed

# Run with custom region
AWS_REGION=us-west-2 npm run seed

# Run with local DynamoDB
DYNAMODB_ENDPOINT=http://localhost:8000 npm run seed
```

### Sample Data

The script creates 5 sample FlowConfig records:

1. **customer-service-queue** - Main customer service configuration
2. **technical-support-queue** - Technical support configuration
3. **sales-inquiry-flow** - Sales inquiry configuration
4. **after-hours-flow** - After hours and emergency configuration
5. **billing-support-queue** - Billing and account support configuration

Each record includes:

- Multiple language support (English and Spanish where applicable)
- Voice and chat channel prompts
- Configurable variables for business logic
- Realistic contact center scenarios
