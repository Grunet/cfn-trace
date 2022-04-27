interface ITracingData {
  spanDataByConstructedId: Map<string, ISpanData>;
}

interface ISpanData {
  childSpanIds: Set<string>;
  //TS isn't aware of the structure the stackEvents array SHOULD have, so it needs this to be extra cautious about these pieces of data maybe never existing
  name?: string;
  startInstant?: Date;
  endInstant?: Date;
}

interface ITelemetrySender {
  sendTracingData(tracingData: ITracingData): void;
}

class TelemetrySender implements ITelemetrySender {
  sendTracingData(tracingData: ITracingData): void {
  }
}

function createTelemetrySender(): ITelemetrySender {
  return new TelemetrySender();
}

export { createTelemetrySender };
export type { ISpanData, ITracingData };
