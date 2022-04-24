import { ICloudformationClientAdapter } from "../cloudformationClientAdapter/client.ts";

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

  //TODO - combine "stackName" and "cloudformationClientAdapter" into a delegate that can be constructed then passed instead
  const { stackEvents } = await cloudformationClientAdapter
    .getEventsFromMostRecentDeploy({
      stackName: currentStackName,
    });

  const resourceIdsOtherThanTheCurrentStack = new Set<string>();

  //TODO - this is pretty grotty
  const directlyNestedStackDataByStackName = new Map<string, string>();

  let currentStackArn: string | undefined; //TODO - is this always guaranteed to be populated after the loop? (see usage below)

  for (
    const {
      resourceIdPerCloudformation,
      resourceIdPerTheServiceItsFrom,
      resourceStatus,
      resourceType,
      timestamp,
    } of stackEvents
  ) {
    if (resourceIdPerCloudformation === currentStackName) {
      if (resourceIdPerTheServiceItsFrom) {
        currentStackArn = resourceIdPerTheServiceItsFrom;
      }
    }

    if (
      (resourceIdPerCloudformation === currentStackName) && !createSpanForStack
    ) {
      //It should have already made a span for the stack while looking at it as a resource in its parent stack
      continue;
    }

    if (
      (resourceType === "AWS::Cloudformation::Stack") &&
      (resourceIdPerCloudformation !== currentStackName)
    ) {
      //The string being operated on should be the ARN in this case
      const nestedStackName = resourceIdPerTheServiceItsFrom.split("/")[1];
      directlyNestedStackDataByStackName.set(
        nestedStackName,
        resourceIdPerCloudformation,
      );
    }

    if (resourceIdPerCloudformation !== currentStackName) {
      resourceIdsOtherThanTheCurrentStack.add(resourceIdPerCloudformation);
    }

    if (resourceStatus === "UPDATE_COMPLETE") {
      //TODO - incorporate the startInstant & endInstant so this satisfies TS (and/or adjust the typings all around this)
      const currentTransformedState: ISpanData = spanDataByConstructedId.get(
        constructId({
          resourceIdPerCloudformation,
          resourceIdPerTheServiceItsFrom,
          resourceType,
        }),
      ) ?? {
        childSpanIds: new Set<string>(),
        name: resourceIdPerCloudformation,
      };

      const newTransformedState = {
        ...currentTransformedState,
        endInstant: timestamp,
      };

      spanDataByConstructedId.set(
        constructId({
          resourceIdPerCloudformation,
          resourceIdPerTheServiceItsFrom,
          resourceType,
        }),
        newTransformedState,
      );

      continue;
    }

    if (resourceStatus === "UPDATE_IN_PROGRESS") {
      //TODO - incorporate the startInstant & endInstant so this satisfies TS (and/or adjust the typings all around this)
      const currentTransformedState: ISpanData = spanDataByConstructedId.get(
        constructId({
          resourceIdPerCloudformation,
          resourceIdPerTheServiceItsFrom,
          resourceType,
        }),
      ) ?? {
        childSpanIds: new Set<string>(),
        name: resourceIdPerCloudformation,
      };

      const newTransformedState = {
        ...currentTransformedState,
        startInstant: timestamp,
      };

      spanDataByConstructedId.set(
        constructId({
          resourceIdPerCloudformation,
          resourceIdPerTheServiceItsFrom,
          resourceType,
        }),
        newTransformedState,
      );

      continue;
    }
  }

  const spanDataForCurrentStack = spanDataByConstructedId.get(
    constructId({
      resourceIdPerCloudformation: stackResourceIdFromWithinParentStack,
      resourceIdPerTheServiceItsFrom: currentStackArn ?? "",
      resourceType: "AWS::Cloudformation::Stack",
    }),
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
    constructId({
      resourceIdPerCloudformation: stackResourceIdFromWithinParentStack,
      resourceIdPerTheServiceItsFrom: currentStackArn ?? "",
      resourceType: "AWS::Cloudformation::Stack",
    }),
    spanDataForCurrentStackWithChildSpanIds,
  );

  //This could probably be done more in parallel with a Promise.all***, but keeping things simple for now in case AWS rate limiting bites
  for (
    const [nestedStackName, nestedStackResourceIdFromParentStack]
      of directlyNestedStackDataByStackName
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
