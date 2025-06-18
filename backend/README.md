# Backend Shared Resources

This directory is for code that will be shared by multiple lambdas.

It is intended to be executed within the lambda runtime. As opposed to the CDK code which is meant to be executed during the CDK Synth step.

This is an important distinction, because if your Lambda code references an import from `aws-cdk-lib`, your Lambda package size will be significantly larger, take longer to deploy, and take longer to start.
