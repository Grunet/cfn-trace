import { IRegister3rdPartyDiagnostics } from "../shared/internalDiagnostics/diagnosticsManager.ts";
import { createSpansAndExportThem } from "./createSpansAndExportThem.ts";

interface ITracingData {
  spanDataByConstructedId: Map<string, ISpanData>;
  rootConstructedId: string | undefined;
}

interface ISpanData {
  childSpanIds: Set<string>;
  //TS isn't aware of the structure the stackEvents array SHOULD have, so it needs this to be extra cautious about these pieces of data maybe never existing
  name?: string;
  startInstant?: Date;
  endInstant?: Date;
  serviceName: string;
}

interface ITelemetrySender {
  sendTracingData(tracingData: ITracingData): Promise<void>;
}

class TelemetrySender implements ITelemetrySender {
  constructor(
    { dependencies: { diagnosticsManager } }: ICreateTelemetrySenderInputs,
  ) {
    this.diagnosticsManager = diagnosticsManager;
  }

  private diagnosticsManager: IRegister3rdPartyDiagnostics;

  async sendTracingData(tracingData: ITracingData): Promise<void> {
    await createSpansAndExportThem({
      tracingData,
      dependencies: { diagnosticsManager: this.diagnosticsManager },
    });
  }
}

interface ICreateTelemetrySenderInputs {
  dependencies: IDependencies;
}

interface IDependencies {
  diagnosticsManager: IRegister3rdPartyDiagnostics;
}

function createTelemetrySender(
  inputs: ICreateTelemetrySenderInputs,
): ITelemetrySender {
  return new TelemetrySender(inputs);
}

export { createTelemetrySender };
export type { ITelemetrySender };
export type { ISpanData, ITracingData };
