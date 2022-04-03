#!/usr/bin/env zx

const targetArchitectures = [
    "x86_64-unknown-linux-gnu", 
    "x86_64-pc-windows-msvc", 
    "x86_64-apple-darwin", 
    "aarch64-apple-darwin"
];

for (const architecture of targetArchitectures) {
    const { stdout:stdoutOfPathLookup } = await $`find -type f -name '*${architecture}*.zip'`;
    const pathToZip = stdoutOfPathLookup.trim();

    console.log(pathToZip);

    await $`COSIGN_EXPERIMENTAL=1 cosign sign-blob --output-certificate ${pathToZip}.pem --output-signature ${pathToZip}.sig ${pathToZip}`;
}