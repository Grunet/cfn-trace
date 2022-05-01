import {
  Context,
  context,
  trace,
  Tracer,
} from "https://cdn.skypack.dev/@opentelemetry/api@v1.1.0?dts";
import {
  // ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-base@v1.2.0?dts";
import { OTLPTraceExporter } from "https://cdn.skypack.dev/@opentelemetry/exporter-trace-otlp-http@v0.27.0"; //v0.28.0 doesn't work as of this writing because the new @opentelemetry/otlp-exporter-base dependency that was very recently factored out doesn't exist in Skypack yet (may need to write up an issue somehwere if it never does)
import { WebTracerProvider } from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-web@v1.2.0?dts";

import "./setupShimsToMakeOtelForBrowserWorkForDeno.ts"; //has side effects

import { ISpanData, ITracingData } from "./sender.ts";

async function createSpansAndExportThem(tracingData: ITracingData) {
  const provider = new WebTracerProvider();

  //BatchSpanProcessor may be a better fit if cases come up with a large number of spans
  // provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter())); //TODO - put this behind some sort of "debug" flag

  //These settings were copied/adjusted from here - https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-trace-otlp-http#traces-in-web
  const collectorOptions = {
    url: "http://localhost:4318/v1/traces", // url is optional and can be omitted, BUT Skypack's bundling is currently doing something very odd and setting the default to the old value of http://localhost:55681/v1/traces (if you go to definition on OTLPTraceExporter you'll see this), so the new default port of 4318 has to be explicitly used here to workaround this
    //"headers" cannot be included here as of this writing because the otel sdk will need to switch to using XmlHttpRequest instead of navigator.sendBeacon for that
  };
  provider.addSpanProcessor(
    new SimpleSpanProcessor(new OTLPTraceExporter(collectorOptions)), //TODO - figure out if TS's complaints are justified here
  );
  provider.register();

  const tracer = provider.getTracer("tracer-deno");

  const { spanDataByConstructedId, rootConstructedId } = tracingData;
  if (!rootConstructedId) {
    throw new Error(
      `rootConstructedId was unexpectedly falsy: ${rootConstructedId}`,
    );
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
      throw new Error(
        `spanRawData was unexpectedly falsy: ${spanRawData}`,
      );
    }

    const { name, startInstant, endInstant } = spanRawData;
    if (!name) {
      throw new Error(
        `name was unexpectedly falsy: ${name}`,
      );
    }

    if (!startInstant) {
      throw new Error(
        `startInstant was unexpectedly falsy: ${startInstant}`,
      );
    }

    if (!endInstant) {
      throw new Error(
        `endInstant was unexpectedly falsy: ${endInstant}`,
      );
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
