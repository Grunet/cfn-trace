import {
  ICloudformationClientAdapter,
} from "./cloudformationClientAdapter/client.ts";
import {
  transformStackEventDataIntoTracingData,
} from "./transformer/transform.ts"; //Only depend on the function signature/interface/types here
import { ITelemetrySender } from "./openTelemetryAdapter/sender.ts";

interface IInputs {
  cliArgs: IExpectedCliArgs;
  versionData: IVersionData;
  cloudformationClientAdapter: ICloudformationClientAdapter;
  transformStackEventDataIntoTracingData:
    typeof transformStackEventDataIntoTracingData;
  telemetrySender: ITelemetrySender;
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
    cliArgs, //TODO - validate this input with zod, iots, etc...
    versionData,
    cloudformationClientAdapter,
    transformStackEventDataIntoTracingData,
    telemetrySender,
    logger,
  }: IInputs,
) {
  if (cliArgs["version"] === true) {
    logger.info(versionData.version);
  }

  if (cliArgs["stack-name"]) {
    const tracingData = await transformStackEventDataIntoTracingData({
      stackName: cliArgs["stack-name"],
      dependencies: {
        cloudformationClientAdapter,
      },
    });

    await telemetrySender.sendTracingData(tracingData);
  }
}

export { invoke };
export type { IExpectedCliArgs, IVersionData };
