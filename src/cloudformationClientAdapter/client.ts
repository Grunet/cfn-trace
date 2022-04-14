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
  resourceArn: string;
  resourceName: string;
  resourceProperties: string | undefined;
  resourceStatus: string; //TODO - see if this can be made into an exhaustive enum
  resourceStatusReason: string | undefined;
  resourceType: string;
  stackArn: string;
  stackName: string;
  timestamp: Date;
}

//TODO - implement ICloudformationClientAdapter

interface ICreateCloudformationClientAdapterInputs {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

function createCloudformationClientAdapter(
  inputs: ICreateCloudformationClientAdapterInputs,
): ICloudformationClientAdapter {
  //TODO - implement this
}

export { createCloudformationClientAdapter };
export type { ICloudformationClientAdapter };
