import { parse } from "https://deno.land/std@0.132.0/flags/mod.ts";

const cliArgs = parse(Deno.args);
invoke({ cliArgs: cliArgs as IExpectedCliArgs, logger: console }); //TODO - validate this input with zod, iots, etc...

interface IInputs {
  cliArgs: IExpectedCliArgs;
  logger: ILogger;
}

interface IExpectedCliArgs {
  version?: boolean;
}

interface ILogger {
  info: (message: string) => void;
}

function invoke(
  { cliArgs, logger }: IInputs,
) {
  if (cliArgs["version"] === true) {
    logger.info("Version is 0.0.0");
  }
}

export { invoke };
