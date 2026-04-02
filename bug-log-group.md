# Bug: CloudWatch Log Group "Already Exists" Deployment Failure

## Symptom

Stack deployment fails with:

```
cms-flow-config-esd-east failed: DeploymentError: The stack named cms-flow-config-esd-east
failed creation, it may need to be manually deleted from the AWS console:
ROLLBACK_FAILED (The following resource(s) failed to delete: [TableCD117FA1]. ):
/aws/lambda/cms-flow-config-esd-east-ApiInitHandlerFunctionBA2-tTTQSS2ssopv already exists
in stack arn:aws:cloudformation:us-east-1:400138960221:stack/cms-flow-config-esd-east/5fec9b20-...
```

## Root Cause

In `infrastructure/createLambda.ts`, the `LogGroup` was created **after** the `Function` and
used `func.functionName` for its name:

```typescript
// OLD (broken) pattern
const func = new Function(scope, `${id}Function`, { ... });

new LogGroup(scope, `${id}LogGroup`, {
  logGroupName: `/aws/lambda/${func.functionName}`,  // circular dependency
  removalPolicy: RemovalPolicy.DESTROY,
});
```

This created a circular CloudFormation dependency:

1. CloudFormation must create the **Function first** to resolve its auto-generated name
   (e.g., `cms-flow-config-esd-east-ApiInitHandlerFunctionBA2-tTTQSS2ssopv`)
2. Lambda **auto-creates** its log group (`/aws/lambda/{functionName}`) the moment it is
   first invoked — which can happen during stack creation via CDK custom resources
3. CloudFormation then tries to create the explicit `LogGroup` resource with the same name
4. **Failure**: "already exists"

This triggered a rollback. The rollback itself failed because `TableCD117FA1` (the DynamoDB
table) could not be deleted, leaving the stack in `ROLLBACK_FAILED` state.

## Fix

Create the `LogGroup` **before** the `Function` and pass it in via the `logGroup` property
(CDK 2.x feature). CloudFormation then treats the log group as a hard dependency of the
function and creates it first. Lambda is explicitly configured to use it and never
auto-creates one.

```typescript
// NEW (fixed) pattern
const logGroup = new LogGroup(scope, `${id}LogGroup`, {
  retention: props.logRetention ?? RetentionDays.ONE_MONTH,
  removalPolicy: RemovalPolicy.DESTROY,
  // No logGroupName needed — CDK sets it via Lambda's LoggingConfig
});

const func = new Function(scope, `${id}Function`, {
  ...props,
  logRetention: undefined,
  logGroup,  // passed after spread so it always overrides
  ...
});
```

**Key differences from the old pattern:**
- No `logGroupName` set on the `LogGroup` — CDK wires the name via Lambda's `LoggingConfig`
- `logGroup` is placed **after** `...props` in the `Function` constructor so it cannot be
  overridden by callers
- The stale comment about `func.functionName` circular dependency is removed (it no longer applies)

## Recovery Steps for a Stuck Stack

If a stack is already in `ROLLBACK_FAILED` state due to this bug:

1. **AWS Console → CloudFormation** → find the failed stack → **Delete stack**
   - When prompted, check **Retain** next to `TableCD117FA1` to skip its deletion
2. **AWS Console → DynamoDB** → manually delete the retained table
3. **AWS Console → CloudWatch → Log groups** → manually delete
   `/aws/lambda/{stack-name}-ApiInitHandlerFunction...` if it still exists
4. Redeploy with the fixed package version

## Affected File

`infrastructure/createLambda.ts` — the `createLambda` utility used by every Lambda construct
in this package (Init, FlowConfig, PreviewSpeech, Settings, Users, GetConfig,
SecurityProfileProvider).
