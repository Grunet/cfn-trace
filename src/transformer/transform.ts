import {
  IAdaptedStackEvent,
  ICloudformationClientAdapter,
} from "../cloudformationClientAdapter/client.ts";
import { ISpanData, ITracingData } from "../openTelemetryAdapter/sender.ts";

interface IInputs {
  stackName: string;
  dependencies: IDependencies;
}

interface IDependencies {
  cloudformationClientAdapter: ICloudformationClientAdapter;
}

async function transformStackEventDataIntoTracingData(
  inputs: IInputs,
): Promise<ITracingData> {
  const { stackName, dependencies: { cloudformationClientAdapter } } = inputs;

  const spanDataByConstructedId = new Map<string, ISpanData>();

  const { constructedIdForTheCurrentStack: rootConstructedId } =
    await __transformStackEventDataIntoTracingData({
      stackName,
      cloudformationClientAdapter,
      spanDataByConstructedId, //This will mutate/populate spanDataByConstructedId
      stackConstructedIdFromWithinParentStack: constructId({
        stackNameResourceIsFrom: stackName,
        resourceIdPerCloudformation: stackName,
      }), //This isn't quite logically correct for the root stack, but it works out (see comment below)
      createSpanForStack: true,
    });

  return {
    spanDataByConstructedId,
    rootConstructedId,
  };
}

interface IPrivateRecursiveInputs {
  stackName: string;
  cloudformationClientAdapter: ICloudformationClientAdapter;
  spanDataByConstructedId: Map<string, ISpanData>;
  //This is needed because of the choice to use the data from the stack when it's a child of its parent stack to create its span (vs the data from its own stack events)
  //With this decision, there needs to be some way to know what that span was when processing its own stack events, so its child span pointers can be set from there
  stackConstructedIdFromWithinParentStack: string;
  createSpanForStack: boolean;
}

async function __transformStackEventDataIntoTracingData({
  stackName,
  cloudformationClientAdapter,
  spanDataByConstructedId,
  stackConstructedIdFromWithinParentStack,
  createSpanForStack,
}: IPrivateRecursiveInputs): Promise<
  { constructedIdForTheCurrentStack: string | undefined }
> {
  const currentStackName = stackName;

  const { stackEvents } = await cloudformationClientAdapter
    .getEventsFromMostRecentDeploy({
      stackName: currentStackName,
    });

  const { getCurrentStackConstructedId, lookForCurrentStackConstructedId } =
    createCurrentStackConstructedIdFinder({
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
    const {
      stackName: stackNameResourceIsFrom,
      resourceIdPerCloudformation,
    } = stackEvent;

    const constructedIdForTheResource = constructId({
      stackNameResourceIsFrom,
      resourceIdPerCloudformation,
    });

    lookForCurrentStackConstructedId({
      stackEvent,
      constructedIdForTheResource,
    });

    lookForAStackResource(stackEvent);

    lookForAnyChildSpan({
      stackEvent,
      constructedIdForTheResource,
    });

    createOrUpdateSpanData({
      stackEvent,
      constructedIdForTheResource,
      spanDataByConstructedId,
    });
  }

  setChildSpanIdsForStack({
    constructedIdOfCurrentStack: stackConstructedIdFromWithinParentStack,
    spanDataByConstructedId,
  });

  const directlyNestedStackData = getDirectlyNestedStackData();
  //This could probably be done more in parallel with a Promise.all***, but keeping things simple for now in case AWS rate limiting bites
  for (
    const [nestedStackConstructedIdFromParentStack, nestedStackName]
      of directlyNestedStackData
  ) {
    await __transformStackEventDataIntoTracingData({
      stackName: nestedStackName,
      cloudformationClientAdapter,
      spanDataByConstructedId,
      stackConstructedIdFromWithinParentStack:
        nestedStackConstructedIdFromParentStack,
      createSpanForStack: false,
    });
  }

  return {
    constructedIdForTheCurrentStack: getCurrentStackConstructedId(),
  };
}

function createCurrentStackConstructedIdFinder(
  { currentStackName }: { currentStackName: string },
) {
  let stackConstructedId: string | undefined;

  return {
    getCurrentStackConstructedId() {
      return stackConstructedId;
    },
    lookForCurrentStackConstructedId(
      {
        stackEvent: { resourceIdPerCloudformation },
        constructedIdForTheResource,
      }: {
        stackEvent: IAdaptedStackEvent;
        constructedIdForTheResource: string;
      },
    ) {
      if (resourceIdPerCloudformation !== currentStackName) {
        return;
      }

      stackConstructedId = constructedIdForTheResource;
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
        if (
          !resourceIdPerTheServiceItsFrom.startsWith("arn:aws:cloudformation")
        ) {
          return;
        }

        const nestedStackName = resourceIdPerTheServiceItsFrom.split("/")[1];

        if (nestedStackName) {
          directlyNestedStackDataByResourceId.set(
            //TODO - factor this call further out
            constructId({
              stackNameResourceIsFrom: currentStackName,
              resourceIdPerCloudformation,
            }),
            nestedStackName,
          );
        }
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
          `Span could not be constructed for stack with constructed id ${constructedIdOfCurrentStack}`,
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
    lookForAnyChildSpan({
      stackEvent: {
        resourceIdPerCloudformation,
      },
      constructedIdForTheResource,
    }: {
      stackEvent: IAdaptedStackEvent;
      constructedIdForTheResource: string;
    }): void {
      if (resourceIdPerCloudformation !== currentStackName) {
        resourceIdsOtherThanTheCurrentStack.add(constructedIdForTheResource);
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

      //TODO - deduplicate these constants with the ones defined in the cloudformation client adapter, or see if the AWS SDK already provides them
      if (
        resourceStatus === "UPDATE_COMPLETE" ||
        resourceStatus === "CREATE_COMPLETE"
      ) {
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

      if (
        resourceStatus === "UPDATE_IN_PROGRESS" ||
        resourceStatus === "CREATE_IN_PROGRESS"
      ) {
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
  stackNameResourceIsFrom: string;
  resourceIdPerCloudformation: string;
}
function constructId(
  { stackNameResourceIsFrom, resourceIdPerCloudformation }: IConstructIdInputs,
) {
  return `${stackNameResourceIsFrom}-${resourceIdPerCloudformation}`;
}

export { transformStackEventDataIntoTracingData };
export type { IInputs, ISpanData, ITracingData };
