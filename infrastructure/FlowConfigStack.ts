import * as cdk from 'aws-cdk-lib';
import {
  IUserPool,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  CfnUserPoolGroup,
} from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {
  IVpc,
  ISecurityGroup,
  ISubnet,
  IInterfaceVpcEndpoint,
} from 'aws-cdk-lib/aws-ec2';
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
 * VPC configuration for private deployment using string IDs
 */
export interface VpcConfig {
  /**
   * If provided, lambdas will be deployed in VPC
   */
  readonly vpcId: string;

  readonly availabilityZones: string[];

  /**
   * Security group IDs for Lambda functions
   */
  readonly lambdaSecurityGroupIds: string[];

  /**
   * Private subnet IDs for Lambda functions
   */
  readonly privateSubnetIds: string[];

  /**
   * Existing VPC endpoint ID for API Gateway
   * If provided, private API GW endpoint will be
   */
  readonly vpcEndpointId?: string;
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
  readonly vpcEndpoint?: IInterfaceVpcEndpoint;
}

export interface FlowConfigStackProps extends cdk.StackProps {
  /**
   * Used for resource naming
   */
  readonly prefix: string;
  readonly cognito?: CognitoConfig;
  readonly connectInstanceArn: string;

  /**
   * Who to notify for unhandled exceptions
   */
  readonly alertEmails: string[];
  readonly prod?: boolean;

  /**
   * VPC configuration for private deployment.
   * If provided, the application will be configured for VPC-only access.
   * If undefined, uses the current public configuration.
   */
  readonly vpc?: VpcConfig;

  /**
   * Global table configuration for multi-region deployments.
   * If provided, enables global table support.
   * If undefined, creates a single-region table.
   */
  readonly globalTable?: GlobalTableConfig;
}

export class FlowConfigStack extends cdk.Stack {
  userPool?: IUserPool;
  private api: Api;
  userPoolClient?: UserPoolClient;
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
    const { region } = cdk.Stack.of(this);
    return `https://${this.api.restApi.restApiId}.execute-api.${region}.amazonaws.com/prod`;
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
      vpc,
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
    this._resolvedVpcConfig = vpc ? this.resolveVpcConfig(vpc) : undefined;

    // DynamoDB table for storing flow configs
    this.table = this.createTable(prefix, prod, globalTable);

    this.alertTopic = new Topic(this, 'AlertTopic', {
      topicName: `${prefix}-error-alerts`,
    });
    alertEmails.forEach((e) =>
      this.alertTopic.addSubscription(new EmailSubscription(e))
    );

    // Only create Cognito resources if configuration is provided
    if (cognito) {
      this.userPool = UserPool.fromUserPoolId(
        this,
        'UserPool',
        cognito.userPoolId
      );
      this.userPoolClient = this.createUserPoolClient();
      this.createUserPoolGroups();
    }

    const getConfig = new GetConfig(this);
    this.api = new Api(this);

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

    if (!cognito || !this.userPool) {
      throw new Error(
        'Cognito configuration and user pool are required to create user pool client'
      );
    }

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
    if (!this.userPool) {
      throw new Error('User pool is required to create user pool groups');
    }

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
      return new dynamodb.Table(this, 'FlowConfigsTable', {
        tableName,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
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
      return new dynamodb.Table(this, 'FlowConfigsTable', {
        tableName,
        partitionKey: {
          name: 'id',
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: true,
        },
        replicationRegions: globalTable.replicaRegions || [],
        deletionProtection: prod,
        removalPolicy: prod
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      });
    } else {
      // Secondary region references existing global table
      return dynamodb.Table.fromTableArn(
        this,
        'FlowConfigsTable',
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${tableName}`
      );
    }
  }

  /**
   * Resolve VPC configuration string IDs to CDK objects
   */
  private resolveVpcConfig(vpcConfig: VpcConfig): ResolvedVpcConfig {
    const {
      vpcId,
      availabilityZones,
      lambdaSecurityGroupIds,
      privateSubnetIds,
      vpcEndpointId,
    } = vpcConfig;

    // Resolve VPC
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'ResolvedVpc', {
      vpcId,
      availabilityZones: availabilityZones,
    });

    // Resolve Lambda security groups
    const lambdaSecurityGroups = lambdaSecurityGroupIds.map((sgId, index) =>
      ec2.SecurityGroup.fromSecurityGroupId(
        this,
        `LambdaSecurityGroup${index}`,
        sgId
      )
    );

    // Resolve private subnets
    const privateSubnets = privateSubnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `PrivateSubnet${index}`, subnetId)
    );

    // Resolve existing VPC endpoint if provided
    const vpcEndpoint = vpcEndpointId
      ? ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(
          this,
          'ExistingVpcEndpoint',
          {
            vpcEndpointId,
            port: 443,
          }
        )
      : undefined;

    return {
      vpc,
      lambdaSecurityGroups,
      privateSubnets,
      vpcEndpoint,
    };
  }
}
