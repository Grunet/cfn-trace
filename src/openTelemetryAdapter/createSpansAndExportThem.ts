import { context, trace } from "https://cdn.skypack.dev/@opentelemetry/api?dts";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-base?dts";
import { OTLPTraceExporter } from "https://cdn.skypack.dev/@opentelemetry/exporter-trace-otlp-http@0.27.0";
import { WebTracerProvider } from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-web?dts";

import "./setupShimsToMakeOtelForBrowserWorkForDeno.ts"; //has side effects

import { ITracingData } from "./sender.ts";

async function createSpansAndExportThem(tracingData: ITracingData) {
  const provider = new WebTracerProvider();

  //TODO - consider this
  // Note: For production consider using the "BatchSpanProcessor" to reduce the number of requests
  // to your exporter. Using the SimpleSpanProcessor here as it sends the spans immediately to the
  // exporter without delay

  const collectorOptions = {
    url: "http://localhost:4318/", // url is optional and can be omitted - default is http://localhost:4318/v1/traces
    headers: {}, // an optional object containing custom headers to be sent with each request
    concurrencyLimit: 10, // an optional limit on pending requests
  };

  provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  provider.addSpanProcessor(
    new SimpleSpanProcessor(new OTLPTraceExporter()),
  );
  provider.register();

  const tracer = provider.getTracer("tracer-deno");

  const { spanDataByConstructedId, rootConstructedId } = tracingData;
  if (!rootConstructedId) {
    //TODO - throw instead of returning, since this should never happen unless something's busted upstream
    return;
  }

  createSpans(rootConstructedId);

  function createSpans(constructedId: string, ctx = undefined) {
    const spanRawData = spanDataByConstructedId.get(constructedId);
    if (!spanRawData) {
      //TODO - throw instead of returning, since this should never happen unless something's busted upstream
      return;
    }

    const { name, startInstant, endInstant } = spanRawData;
    if (!name || !startInstant || !endInstant) {
      //TODO - throw instead of returning, since this should never happen unless something's busted upstream
      return;
    }

    const startTime = [
      startInstant.getTime() / Math.pow(10, 3), //seconds
      0, //additional nanoseconds
    ];

    const endTime = [
      endInstant.getTime() / Math.pow(10, 3), //seconds
      0, //additional nanoseconds
    ];

    //TODO - get TS to stop complaining about the potential type widening after startTime and endTime are declared above (e.g. if in theory their array lengths were changed before this)
    const span = tracer.startSpan(name, { startTime }, ctx);

    const { childSpanIds: childConstructedIds } = spanRawData;

    childConstructedIds.forEach((childConstructedId: string) => {
      const newActiveCtx = trace.setSpan(context.active(), span);
      createSpans(childConstructedId, newActiveCtx);
    });

    span.end(endTime);
  }

  // const parentSpan = tracer.startSpan("main");
  // for (let i = 0; i < 10; i += 1) {
  //   const ctx = trace.setSpan(context.active(), parentSpan);
  //   const span = tracer.startSpan("doWork", undefined, ctx);

  //   // simulate some random work.
  //   for (let i = 0; i <= Math.floor(Math.random() * 40000000); i += 1) {
  //     // empty
  //   }

  //   // Set attributes to the span.
  //   span.setAttribute("key", "value");

  //   // Annotate our span to capture metadata about our operation
  //   span.addEvent("invoking doWork");

  //   span.end();
  // }
  // // Be sure to end the span.
  // parentSpan.end();

  // flush and close the connection.
  await provider.forceFlush();
}

//TODO - turn the below into a manual test harness

//I copied this from the transform_test.ts file
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

export { createSpansAndExportThem };
