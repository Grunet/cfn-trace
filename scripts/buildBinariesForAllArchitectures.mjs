#!/usr/bin/env zx

import { getTargetArchitectures } from "./shared/targetArchitectures.mjs";

const targetArchitectures = getTargetArchitectures();

for (const architecture of targetArchitectures) {
  await $
    `deno compile --target ${architecture} --output ./release_artifacts/${architecture}/cfn-trace ./src/index.ts`;
}
