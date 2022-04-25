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
  //TS isn't aware of the structure the stackEvents array SHOULD have, so it needs this to be extra cautious about these pieces of data maybe never existing
  name?: string;
  startInstant?: Date;
  endInstant?: Date;
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
    stackResourceIdFromWithinParentStack: stackName, //This isn't quite logically correct for the root stack, but it works out (see comment below)
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
  //This is needed because of the choice to use the data from the stack when it's a child of its parent stack to create its span (vs the data from its own stack events)
  //With this decision, there needs to be some way to know what that span was when processing its own stack events, so its child span pointers can be set from there
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
      resourceType: "AWS::CloudFormation::Stack",
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
  //TODO - this doesn't feel great to have a map between strings (easy to get mixed up)
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
        (resourceType === "AWS::CloudFormation::Stack") &&
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
