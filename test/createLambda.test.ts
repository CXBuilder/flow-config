import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { FlowConfigStack } from '../infrastructure/FlowConfigStack';

const minimalProps = {
  prefix: 'test-flow-config',
  cognito: {
    userPoolId: 'us-east-1_test123',
    domain: 'test.example.com',
  },
  connectInstanceArn:
    'arn:aws:connect:us-east-1:123456789012:instance/test-instance',
  alertEmails: ['test@example.com'],
  associate3pApp: false,
};

const basicRolePolicy = {
  'Fn::Join': [
    '',
    [
      'arn:',
      { Ref: 'AWS::Partition' },
      ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    ],
  ],
};

const vpcRolePolicy = {
  'Fn::Join': [
    '',
    [
      'arn:',
      { Ref: 'AWS::Partition' },
      ':iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
    ],
  ],
};

/**
 * These tests confirm that CDK automatically attaches the correct managed policies
 * to Lambda execution roles, making manual addManagedPolicy calls unnecessary.
 */
describe('createLambda managed policies', () => {
  it('CDK auto-attaches AWSLambdaBasicExecutionRole without VPC config', () => {
    const app = new cdk.App();
    const stack = new FlowConfigStack(app, 'TestStack', minimalProps);
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      ManagedPolicyArns: Match.arrayWith([basicRolePolicy]),
    });
  });

  it('CDK auto-attaches AWSLambdaVPCAccessExecutionRole with VPC config', () => {
    const VPC_ACCOUNT = '857240696749';
    const VPC_REGION = 'us-east-1';
    const VPC_ID = 'vpc-0fb6cf77';

    const app = new cdk.App();
    // Inject the same VPC context that cdk.context.json holds so the lookup resolves
    app.node.setContext(
      `vpc-provider:account=${VPC_ACCOUNT}:filter.vpc-id=${VPC_ID}:region=${VPC_REGION}:returnAsymmetricSubnets=true`,
      {
        vpcId: VPC_ID,
        vpcCidrBlock: '10.0.0.0/16',
        availabilityZones: [],
        subnetGroups: [
          {
            name: 'Private',
            type: 'Private',
            subnets: [
              {
                subnetId: 'subnet-private001',
                cidr: '10.0.1.0/24',
                availabilityZone: 'us-east-1a',
                routeTableId: 'rtb-private001',
              },
            ],
          },
        ],
      }
    );

    const stack = new FlowConfigStack(app, 'TestStack', {
      ...minimalProps,
      env: { account: VPC_ACCOUNT, region: VPC_REGION },
      lambdaVpcConfig: {
        vpcId: VPC_ID,
        securityGroupIds: ['sg-test123'],
        subnetIds: ['subnet-private001'],
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Role', {
      ManagedPolicyArns: Match.arrayWith([vpcRolePolicy]),
    });
  });
});
