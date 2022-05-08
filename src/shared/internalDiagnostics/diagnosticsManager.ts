interface IReportSelfDiagnostics {
  report: (message: string, diagnosticData: unknown) => void;
}

interface IRegister3rdPartyDiagnostics {
  register: (diagnosticDelegate: () => void) => void;
}

class DiagnosticsManager
  implements IReportSelfDiagnostics, IRegister3rdPartyDiagnostics {
  public report(message: string, diagnosticData: unknown): void {
    console.log(message, diagnosticData);
  }

  public register(diagnosticDelegate: () => void): void {
    diagnosticDelegate();
  }
}

class NullManager
  implements IReportSelfDiagnostics, IRegister3rdPartyDiagnostics {
  public report(_message: string, _diagnosticData: unknown): void {
  }

  public register(_diagnosticDelegate: () => void): void {
  }
}

interface ICreateDiagnosticsManagerInputs {
  shouldTurnOnDiagnostics: boolean;
}

interface ICreateDiagnosticsManagerOutput
  extends IReportSelfDiagnostics, IRegister3rdPartyDiagnostics {}

function createDiagnosticsManager(
  { shouldTurnOnDiagnostics }: ICreateDiagnosticsManagerInputs,
): ICreateDiagnosticsManagerOutput {
  if (shouldTurnOnDiagnostics) {
    return new DiagnosticsManager();
  } else {
    return new NullManager();
  }
}

export { createDiagnosticsManager };
export type {
  ICreateDiagnosticsManagerInputs,
  ICreateDiagnosticsManagerOutput,
};
export type { IRegister3rdPartyDiagnostics, IReportSelfDiagnostics };
