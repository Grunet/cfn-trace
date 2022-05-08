interface IReportSelfDiagnostics {
  report: (diagnostic: unknown) => void; //TODO - improve this interface
}

interface IRegister3rdPartyDiagnostics {
  register: (diagnosticDelegate: () => void) => void;
}

class DiagnosticsManager
  implements IReportSelfDiagnostics, IRegister3rdPartyDiagnostics {
  public report(diagnostic: unknown): void {
    console.log(diagnostic);
  }

  public register(diagnosticDelegate: () => void): void {
    diagnosticDelegate();
  }
}

class NullManager
  implements IReportSelfDiagnostics, IRegister3rdPartyDiagnostics {
  public report(_diagnostic: unknown): void {
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
