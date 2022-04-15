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
  "stack-name"?: string;
}

interface IVersionData {
  version: string;
}

interface ILogger {
  info: (message: string) => void;
}

async function invoke(
  { cliArgs, logger, versionData, cloudformationClientAdapter }: IInputs,
) {
  if (cliArgs["version"] === true) {
    logger.info(versionData.version);
  }

  if (cliArgs["stack-name"]) {
    const { stackEvents } = await cloudformationClientAdapter
      .getEventsFromMostRecentDeploy({
        stackName: cliArgs["stack-name"],
      });
    console.log(stackEvents);
  }
}

export { invoke };
export type { IExpectedCliArgs, IVersionData };
