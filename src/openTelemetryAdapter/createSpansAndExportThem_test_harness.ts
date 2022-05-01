//A manual test harness
//Based on the expected outputs from transform_test.ts

import { createSpansAndExportThem } from "./createSpansAndExportThem.ts";
import { ISpanData, ITracingData } from "./sender.ts";

const spanDataByConstructedId = new Map<string, ISpanData>();
//From root stack
const rootConstructedId =
  "rootStackName-arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName/00aa00a0-a00a-00aa-0a00-00a0a0a00000-AWS::CloudFormation::Stack";

spanDataByConstructedId.set(
  "rootStackName-arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName/00aa00a0-a00a-00aa-0a00-00a0a0a00000-AWS::CloudFormation::Stack",
  {
    childSpanIds: new Set<string>([
      "TheEcsCluster-TheClusterName-AWS::ECS::Cluster",
      "FirstNestedStackResourceName-arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA/00aa00a0-a00a-00aa-0a00-00a0a0a00000-AWS::CloudFormation::Stack",
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
  "FirstNestedStackResourceName-arn:aws:cloudformation:us-east-1:000000000000:stack/rootStackName-FirstNestedStackResourceName-AAAA0AAAAAA/00aa00a0-a00a-00aa-0a00-00a0a0a00000-AWS::CloudFormation::Stack",
  {
    childSpanIds: new Set<string>([
      "TheEcsService--AWS::ECS::Service",
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
  rootConstructedId,
};

await createSpansAndExportThem(expectedOutputs);
