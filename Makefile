ci: format lint test clean build version
format:
	deno fmt
lint:
	deno lint 
test:
	deno test
clean:
	rm -rf dist
	rm -rf release_artifacts
build:
	deno compile --output ./dist/cfn-trace ./src/index.ts
version: 
	./dist/cfn-trace --version
#Release-related commands
buildBinariesForAllArchitectures:
	zx ./scripts/buildBinariesForAllArchitectures.mjs
zipBinaries: 
	zx ./scripts/zipBinaries.mjs
signArtifacts:
	zx ./scripts/signArtifacts.mjs
createRelease:
	zx ./scripts/createRelease.mjs
#Cloudformation-related commands
lintTemplates:
	cfn-lint ./examples/**/*
	cfn_nag_scan --input-path ./examples
