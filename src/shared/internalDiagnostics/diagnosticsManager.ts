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

interface IGetOrCreateDiagnosticsManagerSingletonInputs {
  shouldTurnOnDiagnostics: boolean;
}

interface IGetOrCreateDiagnosticsManagerSingletonOutput
  extends IReportSelfDiagnostics, IRegister3rdPartyDiagnostics {}

let diagnosticManagers:
  | IGetOrCreateDiagnosticsManagerSingletonOutput
  | undefined = undefined;

function getOrCreateDiagnosticsManagerSingleton(
  { shouldTurnOnDiagnostics }: IGetOrCreateDiagnosticsManagerSingletonInputs,
): IGetOrCreateDiagnosticsManagerSingletonOutput {
  if (!diagnosticManagers) {
    if (shouldTurnOnDiagnostics) {
      diagnosticManagers = new DiagnosticsManager();
    } else {
      diagnosticManagers = new NullManager();
    }
  }

  return diagnosticManagers;
}

export { getOrCreateDiagnosticsManagerSingleton };
export type { IRegister3rdPartyDiagnostics, IReportSelfDiagnostics };
