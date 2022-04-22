import {
  IInputs,
  ISpanData,
  ITracingData,
  transformStackEventDataIntoTracingData,
} from "./transform.ts";

import { assertEquals } from "https://deno.land/std@0.132.0/testing/asserts.ts";

Deno.test("Correctly transforms a typical nested stack's events", async () => {
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
                  {
                    //TODO - make this actually satisfy the type definition...
                    resourceIdPerCloudformation: "rootStackName",
                    resourceStatus: "UPDATE_COMPLETE",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:30.000Z"),
                  },
                  {
                    //TODO - make this actually satisfy the type definition...
                    resourceIdPerCloudformation: "rootStackName",
                    resourceStatus: "UPDATE_IN_PROGRESS",
                    resourceType: "AWS::Cloudformation::Stack",
                    timestamp: new Date("2022-04-11T00:00:00.000Z"),
                  },
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
  const spanDataById = new Map<string, ISpanData>();
  spanDataById.set("rootStackName", {
    childSpanIds: new Set<string>(),
    name: "rootStackName",
    startInstant: new Date("2022-04-11T00:00:00.000Z"),
    endInstant: new Date("2022-04-11T00:00:30.000Z"),
  });

  const expectedOutputs: ITracingData = {
    spanDataById,
  };

  assertEquals(outputs, expectedOutputs);
});
