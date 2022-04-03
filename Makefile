ci: all
all: format lint test clean build version
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
buildAllArchitectures:
	zx ./scripts/buildBinariesForAllArchitectures.mjs
zipBinaries: 
	zx ./scripts/zipBinaries.mjs
signArtifacts:
	zx ./scripts/signArtifacts.mjs
createRelease:
