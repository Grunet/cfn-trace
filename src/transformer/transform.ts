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

  const currentStackName = stackName;

  const { stackEvents } = await cloudformationClientAdapter
    .getEventsFromMostRecentDeploy({
      stackName: currentStackName,
    });

  const resourceIdsOtherThanTheCurrentStack = new Set<string>();

  for (
    const { resourceIdPerCloudformation, resourceStatus, timestamp }
      of stackEvents
  ) {
    if (resourceIdPerCloudformation !== currentStackName) {
      resourceIdsOtherThanTheCurrentStack.add(resourceIdPerCloudformation);
    }

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

  const spanDataForCurrentStack = tracingData.get(currentStackName);
  if (!spanDataForCurrentStack) {
    throw new Error(
      `Span could not be constructed for stack named ${currentStackName}`,
    );
  }

  const spanDataForCurrentStackWithChildSpanIds = {
    ...spanDataForCurrentStack,
    childSpanIds: resourceIdsOtherThanTheCurrentStack,
  };

  tracingData.set(currentStackName, spanDataForCurrentStackWithChildSpanIds);

  return {
    spanDataById: tracingData,
  };
}

export { transformStackEventDataIntoTracingData };
export type { IInputs, ISpanData, ITracingData };
