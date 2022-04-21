import { ICloudformationClientAdapter } from "../cloudformationClientAdapter/client.ts";

interface IInputs {
  stackName: string;
  dependencies: IDependencies;
}

interface IDependencies {
  cloudformationClientAdapter: ICloudformationClientAdapter;
}

interface ITracingData {
}

function transformStackEventDataIntoTracingData(inputs: IInputs): ITracingData {
  const { stackName, dependencies: { cloudformationClientAdapter } } = inputs;
}

export { transformStackEventDataIntoTracingData };
