/**
 * Use this to configure your local environment variables
 */
async function setup() {
  const env = {
    POWERTOOLS_LOG_LEVEL: 'DEBUG',
    POWERTOOLS_LOGGER_LOG_EVENT: 'true',
    /**
     * Enables pretty print
     */
    POWERTOOLS_DEV: 'true',
    STAGE: 'test',
    AWS_REGION: 'us-east-1',
    ALERT_TOPIC_ARN: 'arn:aws:sns:us-east-1:123456789123:fake-error-alerts',
    FLOW_CONFIGS_TABLE_NAME: 'cxbuilder-flow-config',
  };

  Object.assign(process.env, env);
}

module.exports = setup;
