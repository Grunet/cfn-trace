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

async function transformStackEventDataIntoTracingData(
  inputs: IInputs,
): Promise<ITracingData> {
  const { stackName, dependencies: { cloudformationClientAdapter } } = inputs;

  const tracingData = new Map<string, ISpanData>();

  const { stackEvents } = await cloudformationClientAdapter
    .getEventsFromMostRecentDeploy({
      stackName,
    });

  tracingData.set(stackEvents[0].resourceIdPerCloudformation, {
    childSpanIds: new Set<string>(),
    name: stackEvents[0].resourceIdPerCloudformation,
    startInstant: stackEvents[1].timestamp,
    endInstant: stackEvents[0].timestamp,
  });

  return {
    spanDataById: tracingData,
  };
}

export { transformStackEventDataIntoTracingData };
export type { IInputs, ISpanData, ITracingData };
