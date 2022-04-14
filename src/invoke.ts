import {
  ICloudformationClientAdapter,
} from "./cloudformationClientAdapter/client.ts";

interface IInputs {
  cliArgs: IExpectedCliArgs;
  versionData: IVersionData;
  cloudformationClientAdapter: ICloudformationClientAdapter;
  logger: ILogger;
}

interface IExpectedCliArgs {
  version?: boolean;
}

interface IVersionData {
  version: string;
}

interface ILogger {
  info: (message: string) => void;
}

function invoke(
  { cliArgs, logger, versionData }: IInputs,
) {
  if (cliArgs["version"] === true) {
    logger.info(versionData.version);
  }
}

export { invoke };
export type { IExpectedCliArgs, IVersionData };
