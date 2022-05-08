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

let diagnosticManager: DiagnosticsManager | undefined = undefined;

function getOrCreateDiagnosticsManagerSingleton():
  & IReportSelfDiagnostics
  & IRegister3rdPartyDiagnostics {
  if (!diagnosticManager) {
    diagnosticManager = new DiagnosticsManager();
  }

  return diagnosticManager;
}

export { getOrCreateDiagnosticsManagerSingleton };
export type { IRegister3rdPartyDiagnostics, IReportSelfDiagnostics };
