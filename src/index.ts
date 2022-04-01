import { parse } from "https://deno.land/std@0.132.0/flags/mod.ts";
import versionDataFromFile from "./../version.json" assert { type: "json" };

const cliArgs = parse(Deno.args);
invoke({
  cliArgs: cliArgs as IExpectedCliArgs,
  logger: console,
  versionData: versionDataFromFile as IVersionData,
}); //TODO - validate this input with zod, iots, etc...

interface IInputs {
  cliArgs: IExpectedCliArgs;
  logger: ILogger;
  versionData: IVersionData;
}

interface IExpectedCliArgs {
  version?: boolean;
}

interface ILogger {
  info: (message: string) => void;
}

interface IVersionData {
  version: string;
}

function invoke(
  { cliArgs, logger, versionData }: IInputs,
) {
  if (cliArgs["version"] === true) {
    logger.info(versionData.version);
  }
}

export { invoke };
