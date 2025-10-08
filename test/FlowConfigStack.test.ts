import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { FlowConfigStack } from '../infrastructure/FlowConfigStack';

describe('FlowConfigStack', () => {
  const minimalProps = {
    prefix: 'test-flow-config',
    cognito: {
      userPoolId: 'us-east-1_test123',
      domain: 'test.example.com',
    },
    connectInstanceArn:
      'arn:aws:connect:us-east-1:123456789012:instance/test-instance',
    alertEmails: ['test@example.com'],
  };

  describe('associate3pApp configuration', () => {
    it('should not create App Integration when when associate3pApp is false', () => {
      // GIVEN
      const app = new cdk.App();

      // WHEN
      const stack = new FlowConfigStack(app, 'TestStack', {
        ...minimalProps,
        associate3pApp: false,
      });

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::AppIntegrations::Application', 0);

      // Should have lambda integration
      template.resourceCountIs('AWS::Connect::IntegrationAssociation', 1);
    });

    it('should create App Integration when associate3pApp is true', () => {
      // GIVEN
      const app = new cdk.App();

      // WHEN
      const stack = new FlowConfigStack(app, 'TestStack', {
        ...minimalProps,
        associate3pApp: true,
      });

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::AppIntegrations::Application', 1);
      template.hasResourceProperties('AWS::Connect::IntegrationAssociation', {
        IntegrationType: 'APPLICATION',
      });
    });

    it('should create App Integration by default (when associate3pApp is undefined)', () => {
      // GIVEN
      const app = new cdk.App();

      // WHEN
      const stack = new FlowConfigStack(app, 'TestStack', minimalProps);

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::AppIntegrations::Application', 1);
      template.hasResourceProperties('AWS::Connect::IntegrationAssociation', {
        IntegrationType: 'APPLICATION',
      });
    });
  });
});
