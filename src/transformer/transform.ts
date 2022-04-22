import { ICloudformationClientAdapter } from "../cloudformationClientAdapter/client.ts";

interface IInputs {
  stackName: string;
  dependencies: IDependencies;
}

interface IDependencies {
  cloudformationClientAdapter: ICloudformationClientAdapter;
}

interface ITracingData {
  spanDataById: Map<string, ISpanData>; //TODO - is "resourceIdPerCLoudformation" the best thing to go by here?
}

interface ISpanData {
  childSpanIds: Set<string>;
  name: string;
  startInstant: Date;
  endInstant: Date;
}

function transformStackEventDataIntoTracingData(inputs: IInputs): ITracingData {
  const { stackName, dependencies: { cloudformationClientAdapter } } = inputs;

  const tracingData = new Map<string, ISpanData>();

  //TODO - fill in the details

  return {
    spanDataById: tracingData,
  };
}

export { transformStackEventDataIntoTracingData };
export type { IInputs, ISpanData, ITracingData };
