#!/usr/bin/env zx

import { getTargetArchitectures } from "./shared/targetArchitectures.mjs";

const targetArchitectures = getTargetArchitectures();

for (const architecture of targetArchitectures) {
    const { stdout:stdoutOfPathLookup } = await $`find -type f -name '*${architecture}*.zip'`;
    const pathToZip = stdoutOfPathLookup.trim();

    console.log(pathToZip);

    await $`COSIGN_EXPERIMENTAL=1 cosign sign-blob --output-certificate ${pathToZip}.pem --output-signature ${pathToZip}.sig ${pathToZip}`;
}