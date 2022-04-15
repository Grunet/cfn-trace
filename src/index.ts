import { IExpectedCliArgs, invoke, IVersionData } from "./invoke.ts";

import { parse } from "https://deno.land/std@0.132.0/flags/mod.ts";
import versionDataFromFile from "./../version.json" assert { type: "json" };
import {
  createCloudformationClientAdapter,
} from "./cloudformationClientAdapter/client.ts";

const cliArgs = parse(Deno.args);

await invoke({
  cliArgs: cliArgs as IExpectedCliArgs,
  versionData: versionDataFromFile as IVersionData,
  cloudformationClientAdapter: createCloudformationClientAdapter({
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "", //TODO - add actual validation for these
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "",
    region: Deno.env.get("AWS_DEFAULT_REGION") ?? "",
  }),
  logger: console,
}); //TODO - validate this input with zod, iots, etc...
