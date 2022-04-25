import {
  IInputs,
  ISpanData,
  ITracingData,
  transformStackEventDataIntoTracingData,
} from "./transform.ts";
import { IAdaptedStackEvent } from "../cloudformationClientAdapter/client.ts";

import { assertEquals } from "https://deno.land/std@0.132.0/testing/asserts.ts";

Deno.test("Correctly transforms the events from a 2-tier nested stack with 1 non-stack resource in each", async () => {
  //ARRANGE
  const inputs: IInputs = {
    stackName: "rootStackName",
    dependencies: {
      cloudformationClientAdapter: {
        getEventsFromMostRecentDeploy({ stackName }) {
          switch (stackName) {
            case "rootStackName":
              return Promise.resolve({
                stackEvents: [
                  createStackEvent({
                    resourceIdPerCloudformation: "rootStackName",
                    resourceIdPerTheServiceItsFrom:
                      "arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName/00aa00a0-a00a-00aa-0a00-00a0a0a00000",
                    resourceStatus: "UPDATE_COMPLETE",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:30.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation: "FirstNestedStackResourceName",
                    resourceIdPerTheServiceItsFrom:
                      "arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA/00aa00a0-a00a-00aa-0a00-00a0a0a00000",
                    resourceStatus: "UPDATE_COMPLETE",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:20.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation: "FirstNestedStackResourceName",
                    resourceIdPerTheServiceItsFrom:
                      "arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA/00aa00a0-a00a-00aa-0a00-00a0a0a00000",
                    resourceStatus: "UPDATE_IN_PROGRESS",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:15.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation: "TheEcsCluster",
                    resourceIdPerTheServiceItsFrom: "TheClusterName",
                    resourceStatus: "UPDATE_COMPLETE",
                    resourceType: "AWS::ECS::Cluster",
                    timestamp: new Date("2022-04-11T00:00:10.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation: "TheEcsCluster",
                    resourceIdPerTheServiceItsFrom: "TheClusterName",
                    resourceStatus: "UPDATE_IN_PROGRESS",
                    resourceType: "AWS::ECS::Cluster",
                    timestamp: new Date("2022-04-11T00:00:05.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation: "rootStackName",
                    resourceIdPerTheServiceItsFrom:
                      "arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName/00aa00a0-a00a-00aa-0a00-00a0a0a00000",
                    resourceStatus: "UPDATE_IN_PROGRESS",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:00.000Z"),
                  }),
                ],
              });
            case "rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA":
              return Promise.resolve({
                stackEvents: [
                  createStackEvent({
                    resourceIdPerCloudformation:
                      "rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA",
                    resourceIdPerTheServiceItsFrom:
                      "arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA/00aa00a0-a00a-00aa-0a00-00a0a0a00000",
                    resourceStatus: "UPDATE_COMPLETE",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:19.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation: "TheEcsService",
                    resourceIdPerTheServiceItsFrom: "", //Simulates the resource having been newly created during this deploy
                    resourceStatus: "UPDATE_COMPLETE",
                    resourceType: "AWS::ECS::Service",
                    timestamp: new Date("2022-04-11T00:00:18.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation: "TheEcsService",
                    resourceIdPerTheServiceItsFrom: "", //Simulates the resource having been newly created during this deploy
                    resourceStatus: "UPDATE_IN_PROGRESS",
                    resourceType: "AWS::ECS::Service",
                    timestamp: new Date("2022-04-11T00:00:17.000Z"),
                  }),
                  createStackEvent({
                    resourceIdPerCloudformation:
                      "rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA",
                    resourceIdPerTheServiceItsFrom:
                      "arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA/00aa00a0-a00a-00aa-0a00-00a0a0a00000",
                    resourceStatus: "UPDATE_IN_PROGRESS",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:16.000Z"),
                  }),
                ],
              });
            default:
              throw new Error(`${stackName} not found in the mock's setup`);
          }
        },
      },
    },
  };

  //ACT
  const outputs = await transformStackEventDataIntoTracingData(inputs);

  //ASSERT
  const spanDataByConstructedId = new Map<string, ISpanData>();
  //From root stack
  spanDataByConstructedId.set(
    "rootStackName-arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName/00aa00a0-a00a-00aa-0a00-00a0a0a00000-AWS::Cloudformation::Stack",
    {
      childSpanIds: new Set<string>([
        "TheEcsCluster",
        "FirstNestedStackResourceName",
      ]),
      name: "rootStackName",
      startInstant: new Date("2022-04-11T00:00:00.000Z"),
      endInstant: new Date("2022-04-11T00:00:30.000Z"),
    },
  );
  spanDataByConstructedId.set(
    "TheEcsCluster-TheClusterName-AWS::ECS::Cluster",
    {
      childSpanIds: new Set<string>(),
      name: "TheEcsCluster",
      startInstant: new Date("2022-04-11T00:00:05.000Z"),
      endInstant: new Date("2022-04-11T00:00:10.000Z"),
    },
  );
  //1st nested stack as resource of the root stack
  spanDataByConstructedId.set(
    "FirstNestedStackResourceName-arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA/00aa00a0-a00a-00aa-0a00-00a0a0a00000-AWS::Cloudformation::Stack",
    {
      childSpanIds: new Set<string>([
        "TheEcsService",
      ]),
      name: "FirstNestedStackResourceName",
      startInstant: new Date("2022-04-11T00:00:15.000Z"),
      endInstant: new Date("2022-04-11T00:00:20.000Z"),
    },
  );
  //From 1st nested stack's resources
  spanDataByConstructedId.set("TheEcsService--AWS::ECS::Service", {
    childSpanIds: new Set<string>(),
    name: "TheEcsService",
    startInstant: new Date("2022-04-11T00:00:17.000Z"),
    endInstant: new Date("2022-04-11T00:00:18.000Z"),
  });

  const expectedOutputs: ITracingData = {
    spanDataByConstructedId,
  };

  assertEquals(outputs, expectedOutputs);
});

function createStackEvent(
  partialStackEvent: Partial<IAdaptedStackEvent>,
): IAdaptedStackEvent {
  return {
    resourceIdPerCloudformation:
      partialStackEvent.resourceIdPerCloudformation ?? "unused",
    resourceIdPerTheServiceItsFrom:
      partialStackEvent.resourceIdPerTheServiceItsFrom ?? "unused",
    resourceProperties: partialStackEvent.resourceProperties ?? "unused",
    resourceStatus: partialStackEvent.resourceStatus ?? "unused",
    resourceStatusReason: partialStackEvent.resourceStatusReason ?? "unused",
    resourceType: partialStackEvent.resourceType ?? "unused",
    stackArn: partialStackEvent.stackArn ?? "unused",
    stackName: partialStackEvent.stackName ?? "unused",
    timestamp: partialStackEvent.timestamp ?? new Date(),
  };
}
