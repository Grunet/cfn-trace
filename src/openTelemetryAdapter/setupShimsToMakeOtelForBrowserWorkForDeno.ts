//navigator.sendBeacon doesn't exist in Deno, so this replaces it's invocations in otel-js with a call to fetch
import "https://cdn.deno.land/sendbeacon_polyfill/versions/0.0.1/raw/index.js";

if (!globalThis.document) {
  globalThis.document = {
    createElement: function () { //For this line - https://github.com/open-telemetry/opentelemetry-js/blob/bdb61f7e56b7fbe7d281262e69e5bc8683a52014/packages/opentelemetry-sdk-trace-web/src/utils.ts#L33
      return {
        protocol: ":", //For this line - https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-xml-http-request/src/xhr.ts#L170
      };
    },
  };
}

if (!performance.clearResourceTimings) {
  performance.clearResourceTimings = function () {}; //For this line - https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-fetch/src/fetch.ts#L181 and this Deno Deploy bug - https://github.com/denoland/deno/issues/13605
}
