import { CustomResource, RemovalPolicy } from 'aws-cdk-lib';
import { IRole, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { AllowApplicationProps } from './SecurityProfileProvider.interface';
import { createLambda } from '../createLambda';

interface SecurityProfileProviderProps {
  existingRoleArn?: string;
  connectInstanceArn: string;
}

/**
 * Custom resource for updating Connect security profiles
 */
export class SecurityProfileProvider extends Construct {
  private readonly role?: IRole;
  private readonly handler: Function;
  private readonly provider: Provider;

  constructor(
    scope: Construct,
    id: string,
    private readonly props: SecurityProfileProviderProps
  ) {
    super(scope, id);
    const { existingRoleArn, connectInstanceArn } = props;
    this.role = existingRoleArn
      ? Role.fromRoleArn(this, 'Role', existingRoleArn)
      : undefined;

    this.handler = createLambda(this, 'Handler', {
      role: this.role,
    });

    if (!this.role) {
      this.handler.addToRolePolicy(
        new PolicyStatement({
          actions: [
            'connect:ListSecurityProfileApplications',
            'connect:ListSecurityProfiles',
            'connect:UpdateSecurityProfile',
          ],
          resources: [
            connectInstanceArn,
            `${connectInstanceArn}/security-profile/*`,
          ],
        })
      );
    }
    const logGroup = new LogGroup(scope, `${id}LogGroup`, {
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.provider = new Provider(this, 'Provider', {
      onEventHandler: this.handler,
      logGroup,
    });
  }

  /**
   * Grant a security profile access to a 3P application namespace
   * At this time, the only permission available on the SDK is 'ACCESS'. ibliskavka 2024-10-31
   */
  allowApplication(
    id: string,
    securityProfileName: string,
    namespace: string,
    permissions: string[] = ['ACCESS']
  ) {
    const allowAppProps: AllowApplicationProps = {
      connectInstanceArn: this.props.connectInstanceArn,
      securityProfileName,
      namespace,
      permissions,
    };

    return new CustomResource(this, id, {
      serviceToken: this.provider.serviceToken,
      resourceType: 'Custom::AllowApplication',
      properties: allowAppProps,
    });
  }
}
