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

  for (
    const { resourceIdPerCloudformation, resourceStatus, timestamp }
      of stackEvents
  ) {
    if (resourceStatus === "UPDATE_COMPLETE") {
      //TODO - incorporate the startInstant & endInstant so this satisfies TS (and/or adjust the typings all around this)
      const currentTransformedState: ISpanData =
        tracingData.get(resourceIdPerCloudformation) ?? {
          childSpanIds: new Set<string>(),
          name: resourceIdPerCloudformation,
        };

      const newTransformedState = {
        ...currentTransformedState,
        endInstant: timestamp,
      };

      tracingData.set(resourceIdPerCloudformation, newTransformedState);

      continue;
    }

    if (resourceStatus === "UPDATE_IN_PROGRESS") {
      //TODO - incorporate the startInstant & endInstant so this satisfies TS (and/or adjust the typings all around this)
      const currentTransformedState: ISpanData =
        tracingData.get(resourceIdPerCloudformation) ?? {
          childSpanIds: new Set<string>(),
          name: resourceIdPerCloudformation,
        };

      const newTransformedState = {
        ...currentTransformedState,
        startInstant: timestamp,
      };

      tracingData.set(resourceIdPerCloudformation, newTransformedState);

      continue;
    }
  }

  return {
    spanDataById: tracingData,
  };
}

export { transformStackEventDataIntoTracingData };
export type { IInputs, ISpanData, ITracingData };
