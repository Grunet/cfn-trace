#!/usr/bin/env zx

import { readFile } from 'fs/promises';

const { version } = JSON.parse(await readFile("version.json"));

console.log(version);

//This requires the GITHUB_TOKEN be set as an environment variable to work
//This appears to be where the assets glob is processed - https://github.com/release-it/release-it/blob/832528d113956c003f018e26a78425d6561504df/lib/plugin/github/GitHub.js#L289
//    It looks like it's using this library for that - https://www.npmjs.com/package/globby
await $`npx release-it@14.14.0 ${version} --ci --github.release --github.assets ./release_artifacts/**/**/*.zip*`;