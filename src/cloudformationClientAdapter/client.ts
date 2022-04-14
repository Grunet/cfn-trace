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

class CloudformationClientAdapter implements ICloudformationClientAdapter {
  constructor(
    { accessKeyId, secretAccessKey, region }:
      ICreateCloudformationClientAdapterInputs,
  ) {
  }

  getEventsFromMostRecentDeploy(
    inputs: IGetEventsFromMostRecentDeployInputs,
  ): IGetEventsFromMostRecentDeployOutputs {
    //TODO - fill out the implementation
    return { stackEvents: [] };
  }
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
