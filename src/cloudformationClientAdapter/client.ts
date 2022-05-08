import { IReportSelfDiagnostics } from "../shared/internalDiagnostics/diagnosticsManager.ts";
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
  ): Promise<IGetEventsFromMostRecentDeployOutputs>;
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
    {
      accessKeyId,
      secretAccessKey,
      region,
      dependencies: { diagnosticsManager },
    }: ICreateCloudformationClientAdapterInputs,
  ) {
    this.cloudformationClient = new CloudFormationClient({
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      region: region,
    });

    this.diagnosticsManager = diagnosticsManager;
  }

  private cloudformationClient: CloudFormationClient;

  private diagnosticsManager: IReportSelfDiagnostics;

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

    this.diagnosticsManager.report(commandOutput); //TODO - consider adding more context here if it can't be auto-added

    const { StackEvents } = commandOutput;

    if (!StackEvents) {
      throw new Error(`No stack events found for stack named ${stackName}`);
    }

    const adaptedStackEvents: IAdaptedStackEvent[] = StackEvents.map(
      adaptSingleStackEvent,
    );

    const adaptedStackEventsFromMostRecentDeploy: IAdaptedStackEvent[] =
      trimAdaptedStackEventsToTheMostRecentDeploy(
        stackName,
        adaptedStackEvents,
      );

    return {
      stackEvents: adaptedStackEventsFromMostRecentDeploy,
    };
  }
}

function adaptSingleStackEvent(stackEvent: StackEvent): IAdaptedStackEvent {
  //TODO - consolidate these if appropriate (I couldn't get TS to understand the properties had been guarded after consolidating into a generic forEach)
  if (stackEvent.LogicalResourceId === undefined) {
    throwForMissingStackEventProperty("LogicalResourceId", stackEvent);
  }

  if (stackEvent.PhysicalResourceId === undefined) {
    throwForMissingStackEventProperty("PhysicalResourceId", stackEvent);
  }

  if (stackEvent.ResourceStatus === undefined) {
    throwForMissingStackEventProperty("ResourceStatus", stackEvent);
  }

  if (stackEvent.ResourceType === undefined) {
    throwForMissingStackEventProperty("ResourceType", stackEvent);
  }

  if (stackEvent.StackId === undefined) {
    throwForMissingStackEventProperty("StackId", stackEvent);
  }

  if (stackEvent.StackName === undefined) {
    throwForMissingStackEventProperty("StackName", stackEvent);
  }

  if (stackEvent.Timestamp === undefined) {
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

const possibleEventStatusesAtStartOfDeploy = new Set([
  "REVIEW_IN_PROGRESS",
  "UPDATE_IN_PROGRESS",
]); //Should CREATE_IN_PROGRESS be included here too somehow? Or will REVIEW_IN_PROGRESS always come right before it?

function trimAdaptedStackEventsToTheMostRecentDeploy(
  stackName: string,
  adaptedStackEvents: IAdaptedStackEvent[],
): IAdaptedStackEvent[] {
  const indexOfStartOfMostRecentDeploy = adaptedStackEvents.findIndex(
    ({ resourceIdPerCloudformation, resourceStatus }) => {
      return (resourceIdPerCloudformation === stackName) &&
        possibleEventStatusesAtStartOfDeploy.has(resourceStatus);
    },
  );

  const adaptedStackEventsFromMostRecentDeploy: IAdaptedStackEvent[] =
    adaptedStackEvents.slice(0, indexOfStartOfMostRecentDeploy + 1); //Is there an off-by-one error here sometimes? Not sure

  return adaptedStackEventsFromMostRecentDeploy;
}

interface ICreateCloudformationClientAdapterInputs {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  dependencies: IDependencies;
}

interface IDependencies {
  diagnosticsManager: IReportSelfDiagnostics;
}

function createCloudformationClientAdapter(
  inputs: ICreateCloudformationClientAdapterInputs,
): ICloudformationClientAdapter {
  return new CloudformationClientAdapter(inputs);
}

export { createCloudformationClientAdapter };
export type { IAdaptedStackEvent, ICloudformationClientAdapter };
