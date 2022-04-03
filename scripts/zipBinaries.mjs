#!/usr/bin/env zx

import { getTargetArchitectures } from "./shared/targetArchitectures.mjs";

const targetArchitectures = getTargetArchitectures();

for (const architecture of targetArchitectures) {
    //"-j" is to remove intermediate directories from the zip, so that the binary should be the only thing inside of it
    await $`zip -j ./release_artifacts/${architecture}/cfn-trace-${architecture}.zip ./release_artifacts/${architecture}/cfn-trace*`;
}