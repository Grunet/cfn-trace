#!/usr/bin/env zx

const targetArchitectures = [
    "x86_64-unknown-linux-gnu", 
    "x86_64-pc-windows-msvc", 
    "x86_64-apple-darwin", 
    "aarch64-apple-darwin"
];

for (const architecture of targetArchitectures) {
    await $`zip ./release_artifacts/${architecture}/cfn-trace-${architecture}.zip ./release_artifacts/${architecture}/cfn-trace-${architecture}*`;
}