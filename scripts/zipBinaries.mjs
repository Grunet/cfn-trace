#!/usr/bin/env zx

import { getTargetArchitectures } from "./shared/targetArchitectures.mjs";

const targetArchitectures = getTargetArchitectures();

for (const architecture of targetArchitectures) {
    await $`zip ./release_artifacts/${architecture}/cfn-trace-${architecture}.zip ./release_artifacts/${architecture}/cfn-trace-${architecture}*`;
}