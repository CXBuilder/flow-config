import {
  Application,
  ConnectClient,
  ListSecurityProfileApplicationsCommand,
  ListSecurityProfilesCommand,
  UpdateSecurityProfileCommand,
} from '@aws-sdk/client-connect';
import { CloudFormationCustomResourceEvent } from 'aws-lambda/trigger/cloudformation-custom-resource';
import { Context } from 'aws-lambda';
import { AllowApplicationProps } from '../infrastructure/SecurityProfileProvider/SecurityProfileProvider.interface';
import { logEvent, logger } from './shared/logger';

const connectClient = new ConnectClient();

const getProfileId = async (
  instanceId: string,
  name: string
): Promise<string | undefined> => {
  let nextToken: string | undefined;
  do {
    const profiles = await connectClient.send(
      new ListSecurityProfilesCommand({
        InstanceId: instanceId,
        NextToken: nextToken,
      })
    );
    const profile = profiles.SecurityProfileSummaryList?.find(
      (x) => x.Name?.toLowerCase() === name.toLowerCase()
    );
    if (profile) {
      return profile.Arn!;
    }
    nextToken = profiles.NextToken;
  } while (nextToken);
  return undefined;
};

const getProfileApplications = async (
  instanceId: string,
  profileArn: string
): Promise<Application[]> => {
  let apps: Application[] = [];

  let nextToken: string | undefined;
  do {
    const result = await connectClient.send(
      new ListSecurityProfileApplicationsCommand({
        InstanceId: instanceId,
        SecurityProfileId: profileArn,
      })
    );
    apps = apps.concat(result.Applications ?? []);
    nextToken = result.NextToken;
  } while (nextToken);

  return apps;
};

const upsertAppAccess = async (
  instanceId: string,
  profileArn: string,
  namespace: string,
  permissions: string[]
) => {
  const apps = await getProfileApplications(instanceId, profileArn);
  let app = apps.find((x) => x.Namespace === namespace);
  if (!app) {
    app = {
      Namespace: namespace,
      ApplicationPermissions: permissions,
    };
    apps.push(app);
  }

  app.ApplicationPermissions = permissions;

  await connectClient.send(
    new UpdateSecurityProfileCommand({
      InstanceId: instanceId,
      SecurityProfileId: profileArn,
      Applications: apps,
    })
  );
};

const deleteAppAccess = async (
  instanceId: string,
  profileArn: string,
  namespace: string
) => {
  const apps = await getProfileApplications(instanceId, profileArn);

  await connectClient.send(
    new UpdateSecurityProfileCommand({
      InstanceId: instanceId,
      SecurityProfileId: profileArn,
      Applications: apps.filter((x) => x.Namespace !== namespace),
    })
  );
};

const allowApplication = async (event: CloudFormationCustomResourceEvent) => {
  const { RequestType, ResourceProperties } = event;
  const { connectInstanceArn, namespace, permissions, securityProfileName } =
    ResourceProperties as unknown as AllowApplicationProps;
  const instanceId = connectInstanceArn.split('/').pop()!;

  const profileArn = await getProfileId(instanceId, securityProfileName);
  if (!profileArn) {
    logger.error(
      `Unable to locate security profile named ${securityProfileName}`
    );
    return;
  }

  if (RequestType === 'Delete') {
    await deleteAppAccess(instanceId, profileArn, namespace);
  } else {
    await upsertAppAccess(instanceId, profileArn, namespace, permissions);
  }
  return { PhysicalResourceId: namespace };
};

export const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context
) => {
  logEvent(event, context);

  const { ResourceType } = event;

  try {
    if (ResourceType === 'Custom::AllowApplication') {
      return await allowApplication(event);
    } else {
      throw new Error(`Unknown Resource Type: ${ResourceType}`);
    }
  } catch (error) {
    logger.error('Unhandled Error', error as Error);
    throw error;
  }
};
