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
  cloudformationClientAdapterFactory: () => ICloudformationClientAdapter;
  transformStackEventDataIntoTracingData:
    typeof transformStackEventDataIntoTracingData;
  telemetrySenderFactory: () => ITelemetrySender;
  consoleWriter: IWriteToTheConsole;
}

interface IExpectedCliArgs {
  version?: boolean;
  "stack-name"?: string;
}

interface IVersionData {
  version: string;
}

interface IWriteToTheConsole {
  write: (message: string) => void;
}

async function invoke(
  {
    cliArgs, //TODO - validate this input with zod, iots, etc...
    versionData,
    cloudformationClientAdapterFactory,
    transformStackEventDataIntoTracingData,
    telemetrySenderFactory,
    consoleWriter,
  }: IInputs,
) {
  if (cliArgs["version"] === true) {
    consoleWriter.write(versionData.version);
  }

  if (cliArgs["stack-name"]) {
    const tracingData = await transformStackEventDataIntoTracingData({
      stackName: cliArgs["stack-name"],
      dependencies: {
        cloudformationClientAdapter: cloudformationClientAdapterFactory(),
      },
    });

    await telemetrySenderFactory().sendTracingData(tracingData);
  }
}

export { invoke };
export type { IExpectedCliArgs, IVersionData };
