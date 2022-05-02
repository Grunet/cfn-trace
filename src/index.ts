import { IExpectedCliArgs, invoke, IVersionData } from "./invoke.ts";

import { parse } from "https://deno.land/std@0.132.0/flags/mod.ts";
import versionDataFromFile from "./../version.json" assert { type: "json" };
import {
  createCloudformationClientAdapter,
} from "./cloudformationClientAdapter/client.ts";
import {
  transformStackEventDataIntoTracingData,
} from "./transformer/transform.ts";
import { createTelemetrySender } from "./openTelemetryAdapter/sender.ts";

const cliArgs = parse(Deno.args);

await invoke({
  cliArgs: cliArgs as IExpectedCliArgs,
  versionData: versionDataFromFile as IVersionData,
  cloudformationClientAdapterFactory: () => {
    return createCloudformationClientAdapter({
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "", //TODO - add more explicit validation for these
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "",
      region: Deno.env.get("AWS_DEFAULT_REGION") ?? "",
    });
  },
  transformStackEventDataIntoTracingData,
  telemetrySenderFactory: () => {
    return createTelemetrySender();
  },
  logger: console,
});
