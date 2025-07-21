import * as cdk from 'aws-cdk-lib';
import {
  IUserPool,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  CfnUserPoolGroup,
} from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, ISecurityGroup, ISubnet } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Api } from './api/Api';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { SecurityProfileProvider } from './SecurityProfileProvider';
import { CfnIntegrationAssociation } from 'aws-cdk-lib/aws-connect';
import { CfnApplication } from 'aws-cdk-lib/aws-appintegrations';
import { GetConfig } from './GetConfig';

/**
 * Cognito configuration for FlowConfig stack
 */
export interface CognitoConfig {
  readonly userPoolId: string;

  /**
   * Full domain name
   */
  readonly domain: string;

  /**
   * If provided, client will auth to SSO. Otherwise will auth to user pool
   */
  readonly ssoProviderName?: string;
}

/**
 * VPC configuration for API Gateway
 * If provided, the API will be deployed in a private VPC.
 */
export interface ApiVpcConfig {
  /**
   * The VPC ID to use for the API
   */
  readonly vpcId: string;
  /**
   * The VPC endpoint ID to use for the API
   */
  readonly vpcEndpointId: string;
}

/**
 * Lambda VPC configuration
 */
export interface LambdaVpcConfig {
  /**
   * The VPC ID to deploy resources into
   */
  readonly vpcId: string;

  /**
   * Security group IDs for Lambda functions
   */
  readonly securityGroupIds: string[];

  /**
   * Private subnet IDs for Lambda functions
   */
  readonly subnetIds: string[];
}

/**
 * Global table configuration for multi-region deployments
 */
export interface GlobalTableConfig {
  /**
   * Whether this is the primary region that creates the global table
   */
  readonly isPrimaryRegion: boolean;

  /**
   * List of all regions that should have replicas
   * Only used by the primary region
   */
  readonly replicaRegions?: string[];
}

/**
 * Internal interface for resolved VPC resources
 */
export interface ResolvedVpcConfig {
  readonly vpc: IVpc;
  readonly lambdaSecurityGroups: ISecurityGroup[];
  readonly privateSubnets: ISubnet[];
}

export interface FlowConfigStackProps extends cdk.StackProps {
  /**
   * Used for resource naming. Will also be the name of the Connect Lambda
   * @example `cxbuilder-flow-config`
   */
  readonly prefix: string;
  readonly cognito: CognitoConfig;
  readonly connectInstanceArn: string;

  /**
   * Who to notify for unhandled exceptions
   */
  readonly alertEmails: string[];
  readonly prod?: boolean;

  /**
   * If provided, the API will be deployed in a VPC.
   */
  readonly apiVpcConfig?: ApiVpcConfig;

  /**
   * If provided, the Lambda functions will be deployed in a VPC.
   * Note: VPC should contain endpoints to: CloudFormation, Lambda, DynamoDB, SNS, and Polly.
   */
  readonly lambdaVpcConfig?: LambdaVpcConfig;

  /**
   * Global table configuration for multi-region deployments.
   * If provided, enables global table support.
   * If undefined, creates a single-region table.
   */
  readonly globalTable?: GlobalTableConfig;

  /**
   * Set to false to remove CXBuilder branding from the web app.
   * @default true
   */
  readonly branding?: boolean;
}

export class FlowConfigStack extends cdk.Stack {
  userPool: IUserPool;
  private api: Api;
  userPoolClient: UserPoolClient;
  alertTopic: Topic;
  table: cdk.aws_dynamodb.ITable;

  /**
   * Resolved VPC configuration if private deployment is enabled
   */
  private readonly _resolvedVpcConfig?: ResolvedVpcConfig;

  /**
   * Get resolved VPC configuration for child constructs
   * @internal
   */
  public _getResolvedVpcConfig(): ResolvedVpcConfig | undefined {
    return this._resolvedVpcConfig;
  }

  get appUrl(): string {
    return this.api.url;
  }

  constructor(
    scope: Construct,
    id: string,
    public props: FlowConfigStackProps
  ) {
    const {
      prefix,
      cognito,
      alertEmails,
      prod = false,
      lambdaVpcConfig,
      globalTable,
    } = props;
    super(scope, id, {
      ...props,
      stackName: props.stackName ?? prefix,
      description:
        props.description ??
        'Web-based interface for managing flow variables and prompts that are dynamically retrieved by Amazon Connect during customer interactions',
      terminationProtection: prod,
    });

    // Resolve VPC configuration if provided
    this._resolvedVpcConfig = lambdaVpcConfig
      ? this.resolveVpcConfig(lambdaVpcConfig)
      : undefined;

    // DynamoDB table for storing flow configs
    this.table = this.createTable(prefix, prod, globalTable);

    this.alertTopic = new Topic(this, 'AlertTopic', {
      topicName: `${prefix}-error-alerts`,
    });
    alertEmails.forEach((e) =>
      this.alertTopic.addSubscription(new EmailSubscription(e))
    );

    this.userPool = UserPool.fromUserPoolId(
      this,
      'UserPool',
      cognito.userPoolId
    );

    const getConfig = new GetConfig(this);
    this.api = new Api(this);

    this.userPoolClient = this.createUserPoolClient();
    this.createUserPoolGroups();

    this.associate3pApp();

    new cdk.CfnOutput(this, 'AppUrl', {
      value: this.appUrl,
      description: 'Base URL for the Flow Config application',
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `${this.appUrl}/api`,
      description: 'Base URL for the Flow Config API',
    });
    new cdk.CfnOutput(this, 'GetConfigLambdaName', {
      value: getConfig.function.functionName,
      description:
        'Lambda function name for accessing flow configs from Connect',
    });
  }

  createUserPoolClient(): UserPoolClient {
    const { prefix, cognito } = this.props;

    const domains = ['http://localhost:3000', this.appUrl];

    const oAuth = {
      callbackUrls: domains.map((x) => `${x}/popup.html`),
      logoutUrls: domains,
    };
    const client = new UserPoolClient(this, 'UserPoolClient', {
      userPoolClientName: prefix,
      userPool: this.userPool,
      supportedIdentityProviders: cognito.ssoProviderName
        ? [UserPoolClientIdentityProvider.custom(cognito.ssoProviderName)]
        : [UserPoolClientIdentityProvider.COGNITO],
      generateSecret: false,
      oAuth,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: client.userPoolClientId,
    });
    return client;
  }

  /**
   * Create Cognito User Groups for role-based access control
   */
  createUserPoolGroups(): void {
    // FlowConfigAdmin - Full CRUD access
    new CfnUserPoolGroup(this, 'FlowConfigAdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'FlowConfigAdmin',
      description:
        'Full administrative access to all flow configs - can create, read, update, and delete flow configs and all their properties',
      precedence: 1,
    });

    // FlowConfigEdit - Edit variable/prompt values only
    new CfnUserPoolGroup(this, 'FlowConfigEditGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'FlowConfigEdit',
      description:
        'Edit access to flow configs - can read and modify variable values and prompt content but cannot add/remove fields or delete configs',
      precedence: 2,
    });

    // FlowConfigRead - Read-only access
    new CfnUserPoolGroup(this, 'FlowConfigReadGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'FlowConfigRead',
      description:
        'Read-only access to all flow configs for reporting and reference purposes',
      precedence: 3,
    });
  }

  /**
   * Associated Voicemail as Agent Workspace app
   */
  associate3pApp() {
    const {
      props: { prefix, connectInstanceArn },
      appUrl: url,
    } = this;
    let namespace = `cxbuilder.${prefix}`;
    if (namespace.length > 32 && !cdk.Token.isUnresolved(namespace)) {
      namespace = namespace.substring(0, 32);
    }

    const app = new CfnApplication(this, '3pApp', {
      name: this.props.prefix,
      description:
        'Agent Workspace app for configuring contact flow variables and prompts',
      namespace,
      applicationSourceConfig: {
        externalUrlConfig: {
          accessUrl: url,
        },
      },
      // docs: https://docs.aws.amazon.com/connect/latest/adminguide/3p-apps-events-requests.html
      permissions: [
        'User.Details.View',
        'User.Configuration.View',
        'User.Status.View',
        'Contact.Details.View',
        'Contact.CustomerDetails.View',
        'Contact.Variables.View',
      ],
    });

    const association = new CfnIntegrationAssociation(
      this,
      '3pAppAssociation',
      {
        instanceId: connectInstanceArn,
        integrationType: 'APPLICATION',
        integrationArn: app.attrApplicationArn,
      }
    );

    const provider = new SecurityProfileProvider(
      this,
      'SecurityProfileProvider',
      {
        connectInstanceArn,
      }
    );
    provider.node.addDependency(association);

    // Automatically associate with security profiles
    const securityProfiles = ['Admin'];
    for (const profile of securityProfiles) {
      provider.allowApplication(`Allow${profile}`, profile, namespace);
    }
  }

  /**
   * Create DynamoDB table with optional global table support
   */
  private createTable(
    prefix: string,
    prod: boolean,
    globalTable?: GlobalTableConfig
  ): dynamodb.ITable {
    const tableName = prefix;

    if (!globalTable) {
      // Single-region table
      return new dynamodb.TableV2(this, 'Table', {
        tableName,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        billing: dynamodb.Billing.onDemand(),
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: true,
        },
        deletionProtection: prod,
        removalPolicy: prod
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      });
    }

    if (globalTable.isPrimaryRegion) {
      // Primary region creates global table with replicas
      const table = new dynamodb.TableV2(this, 'Table', {
        tableName,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        billing: dynamodb.Billing.onDemand(),
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: true,
        },
        deletionProtection: prod,
        removalPolicy: prod
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      });
      if (globalTable.replicaRegions) {
        for (const region of globalTable.replicaRegions) {
          table.addReplica({
            region,
            deletionProtection: prod,
            pointInTimeRecoverySpecification: {
              pointInTimeRecoveryEnabled: true,
            },
          });
        }
      }
      return table;
    } else {
      // Secondary region references existing global table
      return dynamodb.Table.fromTableArn(
        this,
        'Table',
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${tableName}`
      );
    }
  }

  /**
   * Resolve VPC configuration string IDs to CDK objects
   */
  private resolveVpcConfig(vpcConfig: LambdaVpcConfig): ResolvedVpcConfig {
    const { vpcId, securityGroupIds, subnetIds } = vpcConfig;

    // Resolve VPC
    const vpc = ec2.Vpc.fromLookup(this, 'ResolvedVpc', { vpcId });

    // Resolve Lambda security groups
    const lambdaSecurityGroups = securityGroupIds.map((sgId, index) =>
      ec2.SecurityGroup.fromSecurityGroupId(
        this,
        `LambdaSecurityGroup${index}`,
        sgId
      )
    );

    // Resolve private subnets
    const privateSubnets = subnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `PrivateSubnet${index}`, subnetId)
    );

    return {
      vpc,
      lambdaSecurityGroups,
      privateSubnets,
    };
  }
}
