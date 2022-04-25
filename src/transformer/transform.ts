import {
  IAdaptedStackEvent,
  ICloudformationClientAdapter,
} from "../cloudformationClientAdapter/client.ts";

interface IInputs {
  stackName: string;
  dependencies: IDependencies;
}

interface IDependencies {
  cloudformationClientAdapter: ICloudformationClientAdapter;
}

interface ITracingData {
  spanDataByConstructedId: Map<string, ISpanData>;
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

  const spanDataByConstructedId = new Map<string, ISpanData>();

  //Mutates spanDataByConstructedId
  await __transformStackEventDataIntoTracingData({
    stackName,
    cloudformationClientAdapter,
    spanDataByConstructedId,
    stackResourceIdFromWithinParentStack: stackName, //TODO - clarify why this is needed to work
    createSpanForStack: true,
  });

  return {
    spanDataByConstructedId,
  };
}

interface IPrivateRecursiveInputs {
  stackName: string;
  cloudformationClientAdapter: ICloudformationClientAdapter;
  spanDataByConstructedId: Map<string, ISpanData>;
  stackResourceIdFromWithinParentStack: string;
  createSpanForStack: boolean;
}

async function __transformStackEventDataIntoTracingData({
  stackName,
  cloudformationClientAdapter,
  spanDataByConstructedId,
  stackResourceIdFromWithinParentStack,
  createSpanForStack,
}: IPrivateRecursiveInputs) {
  const currentStackName = stackName;

  const { stackEvents } = await cloudformationClientAdapter
    .getEventsFromMostRecentDeploy({
      stackName: currentStackName,
    });

  const { getStackArn, lookForStackArn } = createStackArnFinder({
    currentStackName,
  });

  const { setChildSpanIdsForStack, lookForAnyChildSpan } =
    createChildSpanIdGatherer({
      currentStackName,
    });

  const { getDirectlyNestedStackData, lookForAStackResource } =
    createDirectlyNestedStackFinder({
      currentStackName,
    });

  const { createOrUpdateSpanData } = createSpanDataUpdater({
    currentStackName,
    createSpanForStack,
  });

  for (
    const stackEvent of stackEvents
  ) {
    lookForStackArn(stackEvent);

    lookForAStackResource(stackEvent);

    lookForAnyChildSpan(stackEvent);

    const {
      resourceIdPerCloudformation,
      resourceIdPerTheServiceItsFrom,
      resourceType,
    } = stackEvent;

    createOrUpdateSpanData({
      stackEvent,
      constructedIdForTheResource: constructId({
        resourceIdPerCloudformation,
        resourceIdPerTheServiceItsFrom,
        resourceType,
      }),
      spanDataByConstructedId,
    });
  }

  setChildSpanIdsForStack({
    constructedIdOfCurrentStack: constructId({
      resourceIdPerCloudformation: stackResourceIdFromWithinParentStack,
      resourceIdPerTheServiceItsFrom: getStackArn() ?? "",
      resourceType: "AWS::Cloudformation::Stack",
    }),
    spanDataByConstructedId,
  });

  const directlyNestedStackData = getDirectlyNestedStackData();
  //This could probably be done more in parallel with a Promise.all***, but keeping things simple for now in case AWS rate limiting bites
  for (
    const [nestedStackResourceIdFromParentStack, nestedStackName]
      of directlyNestedStackData
  ) {
    await __transformStackEventDataIntoTracingData({
      stackName: nestedStackName,
      cloudformationClientAdapter,
      spanDataByConstructedId,
      stackResourceIdFromWithinParentStack:
        nestedStackResourceIdFromParentStack,
      createSpanForStack: false,
    });
  }
}

function createStackArnFinder(
  { currentStackName }: { currentStackName: string },
) {
  let stackArn: string | undefined;

  return {
    getStackArn() {
      return stackArn;
    },
    lookForStackArn(
      { resourceIdPerCloudformation, resourceIdPerTheServiceItsFrom }:
        IAdaptedStackEvent,
    ) {
      if (resourceIdPerCloudformation !== currentStackName) {
        return;
      }

      if (resourceIdPerTheServiceItsFrom) {
        stackArn = resourceIdPerTheServiceItsFrom;
      }
    },
  };
}

function createDirectlyNestedStackFinder(
  { currentStackName }: { currentStackName: string },
) {
  //TODO - this is pretty grotty
  const directlyNestedStackDataByResourceId = new Map<string, string>();

  return {
    getDirectlyNestedStackData() {
      return directlyNestedStackDataByResourceId;
    },
    lookForAStackResource(
      {
        resourceIdPerCloudformation,
        resourceIdPerTheServiceItsFrom,
        resourceType,
      }: IAdaptedStackEvent,
    ) {
      if (
        (resourceType === "AWS::Cloudformation::Stack") &&
        (resourceIdPerCloudformation !== currentStackName)
      ) {
        //The string being operated on should be the ARN in this case
        const nestedStackName = resourceIdPerTheServiceItsFrom.split("/")[1];

        directlyNestedStackDataByResourceId.set(
          resourceIdPerCloudformation,
          nestedStackName,
        );
      }
    },
  };
}

function createChildSpanIdGatherer(
  { currentStackName }: {
    currentStackName: string;
  },
) {
  const resourceIdsOtherThanTheCurrentStack = new Set<string>();

  return {
    setChildSpanIdsForStack(
      { constructedIdOfCurrentStack, spanDataByConstructedId }: {
        constructedIdOfCurrentStack: string;
        spanDataByConstructedId: Map<string, ISpanData>;
      },
    ) {
      const spanDataForCurrentStack = spanDataByConstructedId.get(
        constructedIdOfCurrentStack,
      );
      if (!spanDataForCurrentStack) {
        throw new Error(
          `Span could not be constructed for stack named ${currentStackName}`,
        );
      }

      const spanDataForCurrentStackWithChildSpanIds = {
        ...spanDataForCurrentStack,
        childSpanIds: resourceIdsOtherThanTheCurrentStack,
      };

      spanDataByConstructedId.set(
        constructedIdOfCurrentStack,
        spanDataForCurrentStackWithChildSpanIds,
      );
    },
    lookForAnyChildSpan({ resourceIdPerCloudformation }: IAdaptedStackEvent) {
      if (resourceIdPerCloudformation !== currentStackName) {
        resourceIdsOtherThanTheCurrentStack.add(resourceIdPerCloudformation);
      }
    },
  };
}

function createSpanDataUpdater(
  { currentStackName, createSpanForStack }: {
    currentStackName: string;
    createSpanForStack: boolean;
  },
) {
  return {
    createOrUpdateSpanData(
      {
        stackEvent: {
          resourceIdPerCloudformation,
          resourceStatus,
          timestamp,
        },
        constructedIdForTheResource,
        spanDataByConstructedId,
      }: {
        stackEvent: IAdaptedStackEvent;
        constructedIdForTheResource: string;
        spanDataByConstructedId: Map<string, ISpanData>;
      },
    ) {
      if (
        (resourceIdPerCloudformation === currentStackName) &&
        !createSpanForStack
      ) {
        //It should have already made a span for the stack while looking at it as a resource in its parent stack
        return;
      }

      if (resourceStatus === "UPDATE_COMPLETE") {
        //TODO - incorporate the startInstant & endInstant so this satisfies TS (and/or adjust the typings all around this)
        const currentTransformedState: ISpanData = spanDataByConstructedId.get(
          constructedIdForTheResource,
        ) ?? {
          childSpanIds: new Set<string>(),
          name: resourceIdPerCloudformation,
        };

        const newTransformedState = {
          ...currentTransformedState,
          endInstant: timestamp,
        };

        spanDataByConstructedId.set(
          constructedIdForTheResource,
          newTransformedState,
        );
      }

      if (resourceStatus === "UPDATE_IN_PROGRESS") {
        //TODO - incorporate the startInstant & endInstant so this satisfies TS (and/or adjust the typings all around this)
        const currentTransformedState: ISpanData = spanDataByConstructedId.get(
          constructedIdForTheResource,
        ) ?? {
          childSpanIds: new Set<string>(),
          name: resourceIdPerCloudformation,
        };

        const newTransformedState = {
          ...currentTransformedState,
          startInstant: timestamp,
        };

        spanDataByConstructedId.set(
          constructedIdForTheResource,
          newTransformedState,
        );
      }
    },
  };
}

interface IConstructIdInputs {
  resourceIdPerCloudformation: string;
  resourceIdPerTheServiceItsFrom: string;
  resourceType: string;
}
function constructId(
  { resourceIdPerCloudformation, resourceIdPerTheServiceItsFrom, resourceType }:
    IConstructIdInputs,
) {
  return `${resourceIdPerCloudformation}-${resourceIdPerTheServiceItsFrom}-${resourceType}`;
}

export { transformStackEventDataIntoTracingData };
export type { IInputs, ISpanData, ITracingData };
