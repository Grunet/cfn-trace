import {
  ICloudformationClientAdapter,
} from "./cloudformationClientAdapter/client.ts";
import {
  ICreateDiagnosticsManagerInputs,
  ICreateDiagnosticsManagerOutput,
  IRegister3rdPartyDiagnostics,
  IReportSelfDiagnostics,
} from "./shared/internalDiagnostics/diagnosticsManager.ts";
import {
  IInputs as ITransformInputs,
  ITracingData,
} from "./transformer/transform.ts";
import { ITelemetrySender } from "./openTelemetryAdapter/sender.ts";

interface IInputs {
  cliArgs: IExpectedCliArgs;
  versionData: IVersionData;
  createDiagnosticsManager: (
    inputs: ICreateDiagnosticsManagerInputs,
  ) => ICreateDiagnosticsManagerOutput;
  cloudformationClientAdapterFactory: (
    { dependencies: { diagnosticsManager } }: {
      dependencies: { diagnosticsManager: IReportSelfDiagnostics };
    },
  ) => ICloudformationClientAdapter;
  transformStackEventDataIntoTracingData: (
    inputs: ITransformInputs,
  ) => Promise<ITracingData>;
  telemetrySenderFactory: ({ dependencies: { diagnosticsManager } }: {
    dependencies: { diagnosticsManager: IRegister3rdPartyDiagnostics };
  }) => ITelemetrySender;
  consoleWriter: IWriteToTheConsole;
}

interface IExpectedCliArgs {
  debug?: boolean;
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
    createDiagnosticsManager,
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
    const diagnosticsManager = createDiagnosticsManager({
      shouldTurnOnDiagnostics: !!cliArgs["debug"],
    });

    const tracingData = await transformStackEventDataIntoTracingData({
      stackName: cliArgs["stack-name"],
      dependencies: {
        cloudformationClientAdapter: cloudformationClientAdapterFactory({
          dependencies: {
            diagnosticsManager,
          },
        }),
      },
    });

    await telemetrySenderFactory({
      dependencies: {
        diagnosticsManager,
      },
    }).sendTracingData(tracingData);
  }
}

export { invoke };
export type { IExpectedCliArgs, IVersionData };
