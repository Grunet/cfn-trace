#!/usr/bin/env zx

import {  } from "./shared/targetArchitectures.mjs";

const targetArchitectures = [
    "x86_64-unknown-linux-gnu", 
    "x86_64-pc-windows-msvc", 
    "x86_64-apple-darwin", 
    "aarch64-apple-darwin"
];

for (const architecture of targetArchitectures) {
    await $`deno compile --target ${architecture} --output ./release_artifacts/${architecture}/cfn-trace-${architecture} ./src/index.ts`;
}