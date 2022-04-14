ci: format lint test clean build version
format:
	deno fmt
lint:
	deno lint
test:
#--no-check works around the aws-sdk fork having type errors by skipping all type checking altogether. See https://github.com/denoland/deno/issues/5460 and linked issues
	deno test --no-check
clean:
	rm -rf dist
	rm -rf release_artifacts
build:
#--no-check works around the aws-sdk fork having type errors by skipping all type checking altogether. See https://github.com/denoland/deno/issues/5460 and linked issues
#--allow-read of cwd is here because the aws-sdk fork depends on Deno's Node shims (at module import evaluation time), in particular the one for the process API, which includes a call to get the cwd - https://deno.land/std@0.79.0/node/process.ts
	deno compile --no-check --allow-read=./ --output ./dist/cfn-trace ./src/index.ts
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
deployStack:
	mkdir -p ./tmp/
#The S3 bucket referenced here was created manually
	aws cloudformation package --template-file ./examples/${dir}/root.yaml --s3-bucket examples-templates --s3-prefix ${dir} --output-template-file ./tmp/${dir}.template
	aws cloudformation deploy --template-file ./tmp/${dir}.template --stack-name ${dir}
	rm -rf ./tmp/
