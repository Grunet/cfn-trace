import { context, trace } from "https://cdn.skypack.dev/@opentelemetry/api?dts";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-base?dts";
import { OTLPTraceExporter } from "https://cdn.skypack.dev/@opentelemetry/exporter-trace-otlp-http";
import { WebTracerProvider } from "https://cdn.skypack.dev/@opentelemetry/sdk-trace-web?dts";
import { ZoneContextManager } from "https://cdn.skypack.dev/@opentelemetry/context-zone?dts";
import { B3Propagator } from "https://cdn.skypack.dev/@opentelemetry/propagator-b3?dts";

//navigator.sendBeacon doesn't exist in Deno, so this replaces it's invocations in otel-js with a call to fetch
import "https://cdn.deno.land/sendbeacon_polyfill/versions/0.0.1/raw/index.js";

import { ITracingData } from "./sender.ts";

async function createSpansAndExportThem(tracingData: ITracingData) {
  //Hacks - start
  globalThis.document = {
    createElement: function () { //For this line - https://github.com/open-telemetry/opentelemetry-js/blob/bdb61f7e56b7fbe7d281262e69e5bc8683a52014/packages/opentelemetry-sdk-trace-web/src/utils.ts#L33
      return {
        protocol: ":", //For this line - https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-xml-http-request/src/xhr.ts#L170
      };
    },
  };
  //globalThis.location = {}; //For this line - https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-web/src/utils.ts#L424
  console.log("What is the value of globalThis.location?");
  console.log(globalThis.location);

  performance.clearResourceTimings = function () {}; //For this line and Deno Deploy bug - https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-fetch/src/fetch.ts#L181
  //Hacks - end

  const provider = new WebTracerProvider();

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
  //   provider.register({
  //     contextManager: new ZoneContextManager(),
  //     propagator: new B3Propagator(),
  //   });
  provider.register();

  const tracer = provider.getTracer("tracer-deno");

  const parentSpan = tracer.startSpan("main");
  for (let i = 0; i < 10; i += 1) {
    const ctx = trace.setSpan(context.active(), parentSpan);
    const span = tracer.startSpan("doWork", undefined, ctx);

    // simulate some random work.
    for (let i = 0; i <= Math.floor(Math.random() * 40000000); i += 1) {
      // empty
    }

    // Set attributes to the span.
    span.setAttribute("key", "value");

    // Annotate our span to capture metadata about our operation
    span.addEvent("invoking doWork");

    span.end();
  }
  // Be sure to end the span.
  parentSpan.end();

  // flush and close the connection.
  await provider.forceFlush();
}

await createSpansAndExportThem();

export { createSpansAndExportThem };
