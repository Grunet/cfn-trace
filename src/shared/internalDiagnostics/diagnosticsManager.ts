interface IReportSelfDiagnostics {
  report: (diagnostic: any) => void; //TODO - improve this interface
}

interface IRegister3rdPartyDiagnostics {
  register: (diagnosticDelegate: () => void) => void;
}

class DiagnosticsManager
  implements IReportSelfDiagnostics, IRegister3rdPartyDiagnostics {
  public report(diagnostic: any): void {
    console.log(diagnostic);
  }

  public register(diagnosticDelegate: () => void): void {
    diagnosticDelegate();
  }
}

function createDiagnosticsManager():
  & IReportSelfDiagnostics
  & IRegister3rdPartyDiagnostics {
  return new DiagnosticsManager();
}

export { createDiagnosticsManager };
export type { IRegister3rdPartyDiagnostics, IReportSelfDiagnostics };
