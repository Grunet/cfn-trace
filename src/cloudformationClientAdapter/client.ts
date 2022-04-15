import {
  CloudFormationClient,
  DescribeStackEventsCommand,
  DescribeStackEventsCommandInput,
  DescribeStackEventsCommandOutput,
  StackEvent,
} from "https://cdn.deno.land/aws_sdk/versions/v3.32.0-1/raw/client-cloudformation/mod.ts";

interface ICloudformationClientAdapter {
  getEventsFromMostRecentDeploy(
    inputs: IGetEventsFromMostRecentDeployInputs,
  ): IGetEventsFromMostRecentDeployOutputs;
}

interface IGetEventsFromMostRecentDeployInputs {
  stackName: string;
}

interface IGetEventsFromMostRecentDeployOutputs {
  stackEvents: IAdaptedStackEvent[];
}

interface IAdaptedStackEvent {
  resourceIdPerCloudformation: string;
  resourceIdPerTheServiceItsFrom: string;
  resourceProperties: string | undefined;
  resourceStatus: string; //TODO - see if this can be made into an exhaustive enum
  resourceStatusReason: string | undefined;
  resourceType: string;
  stackArn: string;
  stackName: string;
  timestamp: Date;
}

class CloudformationClientAdapter implements ICloudformationClientAdapter {
  constructor(
    { accessKeyId, secretAccessKey, region }:
      ICreateCloudformationClientAdapterInputs,
  ) {
    this.cloudformationClient = new CloudFormationClient({
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      region: region,
    });
  }

  private cloudformationClient: CloudFormationClient;

  async getEventsFromMostRecentDeploy(
    inputs: IGetEventsFromMostRecentDeployInputs,
  ): Promise<IGetEventsFromMostRecentDeployOutputs> {
    const { stackName } = inputs;

    const commandInputs: DescribeStackEventsCommandInput = {
      StackName: stackName,
    };

    const command = new DescribeStackEventsCommand(commandInputs);

    const commandOutput: DescribeStackEventsCommandOutput = await this
      .cloudformationClient.send(command);

    const { StackEvents } = commandOutput;

    if (!StackEvents) {
      throw new Error(`No stack events found for stack named ${stackName}`);
    }

    const adaptedStackEvents: IAdaptedStackEvent[] = StackEvents.map(
      adaptSingleStackEvent,
    );

    const indexOfStartOfMostRecentDeploy = adaptedStackEvents.findIndex(({resourceIdPerCloudformation, resourceStatus}) => {
      return 
    })

    // const indexOfStartOfMostRecentDeploy = StackEvents.findIndex((
    //   { ResourceStatus, LogicalResourceId },
    // ) =>
    //   eventStatusAtStartOfDeploy.has(ResourceStatus) &&
    //   LogicalResourceId === stackName
    // );
    // const eventsFromMostRecentDeploy = StackEvents.slice(
    //   0,
    //   indexOfStartOfMostRecentDeploy + 1,
    // ); //The "end" here may not be correct in all situations. Need to think on it a little more

    return await Promise.resolve({ stackEvents: [] });
  }
}

function adaptSingleStackEvent(stackEvent: StackEvent): IAdaptedStackEvent {
  //TODO - consolidate these if appropriate (I couldn't get TS to understand the properties had been guarded after consolidating into a generic forEach)
  if (!stackEvent.LogicalResourceId) {
    throwForMissingStackEventProperty("LogicalResourceId", stackEvent);
  }

  if (!stackEvent.PhysicalResourceId) {
    throwForMissingStackEventProperty("PhysicalResourceId", stackEvent);
  }

  if (!stackEvent.ResourceStatus) {
    throwForMissingStackEventProperty("ResourceStatus", stackEvent);
  }

  if (!stackEvent.ResourceType) {
    throwForMissingStackEventProperty("ResourceType", stackEvent);
  }

  if (!stackEvent.StackId) {
    throwForMissingStackEventProperty("StackId", stackEvent);
  }

  if (!stackEvent.StackName) {
    throwForMissingStackEventProperty("StackName", stackEvent);
  }

  if (!stackEvent.Timestamp) {
    throwForMissingStackEventProperty("Timestamp", stackEvent);
  }

  const adaptedStackEvent: IAdaptedStackEvent = {
    resourceIdPerCloudformation: stackEvent.LogicalResourceId,
    resourceIdPerTheServiceItsFrom: stackEvent.PhysicalResourceId,
    resourceProperties: stackEvent.ResourceProperties,
    resourceStatus: stackEvent.ResourceStatus,
    resourceStatusReason: stackEvent.ResourceStatusReason,
    resourceType: stackEvent.ResourceType,
    stackArn: stackEvent.StackId,
    stackName: stackEvent.StackName,
    timestamp: stackEvent.Timestamp,
  };

  return adaptedStackEvent;
}

function throwForMissingStackEventProperty(
  propertyName: string,
  stackEvent: StackEvent,
): never {
  throw new Error(
    `${propertyName} is missing on stack event : ${JSON.stringify(stackEvent)}`,
  );
}

interface ICreateCloudformationClientAdapterInputs {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

function createCloudformationClientAdapter(
  inputs: ICreateCloudformationClientAdapterInputs,
): ICloudformationClientAdapter {
  return new CloudformationClientAdapter(inputs);
}

export { createCloudformationClientAdapter };
export type { ICloudformationClientAdapter };
