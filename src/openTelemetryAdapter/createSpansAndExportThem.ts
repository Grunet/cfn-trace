import {
  Context,
  context,
  trace,
  Tracer,
} from "https://cdn.skypack.dev/@opentelemetry/api?dts";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-base?dts";
import { OTLPTraceExporter } from "https://cdn.skypack.dev/@opentelemetry/exporter-trace-otlp-http@0.27.0";
import { WebTracerProvider } from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-web?dts";

import "./setupShimsToMakeOtelForBrowserWorkForDeno.ts"; //has side effects

import { ISpanData, ITracingData } from "./sender.ts";

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

  const { recursivelyCreateSpans } = createSpanCreator({
    tracer,
    spanDataByConstructedId,
  });

  recursivelyCreateSpans(rootConstructedId);

  await provider.forceFlush();
}

function createSpanCreator(
  { tracer, spanDataByConstructedId }: {
    tracer: Tracer;
    spanDataByConstructedId: Map<string, ISpanData>;
  },
) {
  function recursivelyCreateSpans(
    constructedId: string,
    ctx: Context | undefined = undefined,
  ) {
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

    const startTime = convertInstantToOtelTimeInput(startInstant);
    const endTime = convertInstantToOtelTimeInput(endInstant);

    const span = tracer.startSpan(name, { startTime }, ctx);

    const { childSpanIds: childConstructedIds } = spanRawData;

    childConstructedIds.forEach((childConstructedId: string) => {
      const newActiveCtx = trace.setSpan(context.active(), span);
      recursivelyCreateSpans(childConstructedId, newActiveCtx);
    });

    span.end(endTime);
  }

  return {
    recursivelyCreateSpans,
  };
}

function convertInstantToOtelTimeInput(instant: Date): [number, number] {
  return [
    instant.getTime() / Math.pow(10, 3), //seconds
    0, //additional nanoseconds
  ];
}

export { createSpansAndExportThem };
