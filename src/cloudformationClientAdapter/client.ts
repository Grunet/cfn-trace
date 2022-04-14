interface ICloudformationClientAdapter {
  getEventsFromMostRecentDeploy(
    inputs: IGetEventsFromMostRecentDeployInputs,
  ): IGetEventsFromMostRecentDeployOutputs;
}

interface IGetEventsFromMostRecentDeployInputs {
  stackName: string;
}

interface IGetEventsFromMostRecentDeployOutputs {
  stackEvents: IStackEventData[];
}

interface IStackEventData {
}

function createCloudformationClientAdapter(): ICloudformationClientAdapter {
  //TODO - implement this
}

export { createCloudformationClientAdapter };
export type { ICloudformationClientAdapter };
