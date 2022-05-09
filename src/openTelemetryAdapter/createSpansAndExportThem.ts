import { IRegister3rdPartyDiagnostics } from "../shared/internalDiagnostics/diagnosticsManager.ts";
import {
  Context,
  context,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  trace,
  Tracer,
} from "https://cdn.skypack.dev/@opentelemetry/api@v1.1.0?dts";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  SpanExporter,
} from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-base@v1.2.0?dts";
import { OTLPTraceExporter } from "https://cdn.skypack.dev/@opentelemetry/exporter-trace-otlp-http@v0.27.0"; //v0.28.0 doesn't work as of this writing because the new @opentelemetry/otlp-exporter-base dependency that was very recently factored out doesn't exist in Skypack yet (may need to write up an issue somehwere if it never does)
import { WebTracerProvider } from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-web@v1.2.0?dts";
//TODO - pin versions on these
import { Resource } from "https://cdn.skypack.dev/@opentelemetry/resources";
import { SemanticResourceAttributes } from "https://cdn.skypack.dev/@opentelemetry/semantic-conventions";

import "./setupShimsToMakeOtelForBrowserWorkForDeno.ts"; //has side effects

import { ISpanData, ITracingData } from "./sender.ts";

interface ICreateSpansAndExportThemInputs {
  tracingData: ITracingData;
  dependencies: IDependencies;
}

interface IDependencies {
  diagnosticsManager: IRegister3rdPartyDiagnostics;
}

function getTracer(serviceName: string) {
  // diagnosticsManager.register(() => {
  // diag.setLogger(
  //   new DiagConsoleLogger(),
  //   DiagLogLevel.DEBUG,
  // );
  // });

  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });

  // diagnosticsManager.register(() => {
  provider.addSpanProcessor(
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
  );
  // });
  provider.addSpanProcessor(
    new SimpleSpanProcessor( //BatchSpanProcessor may be a better fit if cases come up with a large number of spans
      new OTLPTraceExporter({
        //These settings were copied/adjusted from here - https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-trace-otlp-http#traces-in-web
        url: "http://localhost:4318/v1/traces", // url is optional and can be omitted, BUT Skypack's bundling is currently doing something very odd and setting the default to the old value of http://localhost:55681/v1/traces (if you go to definition on OTLPTraceExporter you'll see this), so the new default port of 4318 has to be explicitly used here to workaround this
        //"headers" cannot be included here as of this writing because the otel sdk will need to switch to using XmlHttpRequest instead of navigator.sendBeacon for that
      }) as unknown as SpanExporter, //Skypack's bundling for OTLPTraceExporter uses prototypal inheritance in a way that TS can't understand (and so misses methods it has) as you can see by going to definition on it, hence this explicit type casting to get rid of the red squiggle
    ),
  );
  provider.register();

  const tracer = provider.getTracer("tracer-deno");

  return {
    tracer,
    provider,
  };
}

async function createSpansAndExportThem(
  { tracingData, dependencies: { diagnosticsManager } }:
    ICreateSpansAndExportThemInputs,
) {
  // diagnosticsManager.register(() => {
  diag.setLogger(
    new DiagConsoleLogger(),
    DiagLogLevel.DEBUG,
  );
  // });

  // const provider = new WebTracerProvider();

  // diagnosticsManager.register(() => {
  //   provider.addSpanProcessor(
  //     new SimpleSpanProcessor(new ConsoleSpanExporter()),
  //   );
  // });
  // provider.addSpanProcessor(
  //   new SimpleSpanProcessor( //BatchSpanProcessor may be a better fit if cases come up with a large number of spans
  //     new OTLPTraceExporter({
  //       //These settings were copied/adjusted from here - https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-trace-otlp-http#traces-in-web
  //       url: "http://localhost:4318/v1/traces", // url is optional and can be omitted, BUT Skypack's bundling is currently doing something very odd and setting the default to the old value of http://localhost:55681/v1/traces (if you go to definition on OTLPTraceExporter you'll see this), so the new default port of 4318 has to be explicitly used here to workaround this
  //       //"headers" cannot be included here as of this writing because the otel sdk will need to switch to using XmlHttpRequest instead of navigator.sendBeacon for that
  //     }) as unknown as SpanExporter, //Skypack's bundling for OTLPTraceExporter uses prototypal inheritance in a way that TS can't understand (and so misses methods it has) as you can see by going to definition on it, hence this explicit type casting to get rid of the red squiggle
  //   ),
  // );
  // provider.register();

  // const tracer = provider.getTracer("tracer-deno");

  const { spanDataByConstructedId, rootConstructedId } = tracingData;
  if (!rootConstructedId) {
    throw new Error(
      `rootConstructedId was unexpectedly falsy: ${rootConstructedId}`,
    );
  }

  const { recursivelyCreateSpans } = createSpanCreator({
    spanDataByConstructedId,
  });

  await recursivelyCreateSpans(rootConstructedId);
}

function createSpanCreator(
  { spanDataByConstructedId }: {
    spanDataByConstructedId: Map<string, ISpanData>;
  },
) {
  async function recursivelyCreateSpans(
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

    const { tracer, provider } = getTracer(
      `someServiceName ${Math.floor(Math.random() * 100)}`,
    );

    const span = tracer.startSpan(name, { startTime }, ctx);

    const { childSpanIds: childConstructedIds } = spanRawData;

    childConstructedIds.forEach((childConstructedId: string) => {
      const newActiveCtx = trace.setSpan(context.active(), span);
      recursivelyCreateSpans(childConstructedId, newActiveCtx);
    });

    span.end(endTime);

    await provider.forceFlush();
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
