import {
  ICloudformationClientAdapter,
} from "./cloudformationClientAdapter/client.ts";
import {
  transformStackEventDataIntoTracingData,
} from "./transformer/transform.ts"; //Only depend on the function signature/interface/types here

interface IInputs {
  cliArgs: IExpectedCliArgs;
  versionData: IVersionData;
  cloudformationClientAdapter: ICloudformationClientAdapter;
  transformStackEventDataIntoTracingData:
    typeof transformStackEventDataIntoTracingData;
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
  {
    cliArgs,
    logger,
    versionData,
    cloudformationClientAdapter,
    transformStackEventDataIntoTracingData,
  }: IInputs,
) {
  if (cliArgs["version"] === true) {
    logger.info(versionData.version);
  }

  if (cliArgs["stack-name"]) {
    const { spanDataByConstructedId } =
      await transformStackEventDataIntoTracingData({
        stackName: cliArgs["stack-name"],
        dependencies: {
          cloudformationClientAdapter,
        },
      });

    //TODO - remove/adapt this later
    for (const [key, value] of spanDataByConstructedId) {
      console.log(key);
      console.log(value);
    }
  }
}

export { invoke };
export type { IExpectedCliArgs, IVersionData };
