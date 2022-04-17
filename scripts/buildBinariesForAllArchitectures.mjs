#!/usr/bin/env zx

import { getTargetArchitectures } from "./shared/targetArchitectures.mjs";

const targetArchitectures = getTargetArchitectures();

for (const architecture of targetArchitectures) {
  await $
    `make buildBinaryForASingleArchitecture architecture=${architecture} outputPath=./release_artifacts/${architecture}/cfn-trace`;
}
