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

export type { ISpanData, ITracingData };
