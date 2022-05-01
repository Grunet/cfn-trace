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
}

interface ITelemetrySender {
  sendTracingData(tracingData: ITracingData): Promise<void>;
}

class TelemetrySender implements ITelemetrySender {
  async sendTracingData(tracingData: ITracingData): Promise<void> {
    await createSpansAndExportThem(tracingData);
  }
}

function createTelemetrySender(): ITelemetrySender {
  return new TelemetrySender();
}

export { createTelemetrySender };
export type { ITelemetrySender };
export type { ISpanData, ITracingData };
