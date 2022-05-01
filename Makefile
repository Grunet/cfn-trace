#--no-check works around the aws-sdk fork having type errors by skipping all type checking altogether. See https://github.com/denoland/deno/issues/5460 and linked issues
#--unstable is here because the aws-sdk fork depends on the Node shim for the "os" library, which uses the Deno.osRelease function, which isn't part of the stable Deno 1.20.3 release 
#--allow-read of cwd is here because the aws-sdk fork depends on Deno's Node shims (at module import evaluation time), in particular the one for the process API, which includes a call to get the cwd - https://deno.land/std@0.79.0/node/process.ts
#--allow-env of all env variables is here because the aws-sdk fork depends on Deno's Node shims (at module import evaluation time), in particular the one for the process API, whose 0.79.0 version (but maybe not more recent ones) has a bug that causes it call Deno.env.toObject() before any env variables have been requested - https://deno.land/std@0.79.0/node/process.ts
#--allow-net is set to all here because Deno doesn't currently allow for wildcards in the hostname (if it did, cloudformation.*.amazonaws.com would suffice, since * would match any region). Issue for this on the Deno repository - https://github.com/denoland/deno/issues/6532
#            is also here to cover the traffic of exporting spans, which could be to any local port or remote endpoint potentially
#--no-prompt is here because the aws-sdk (fork) will try to read from ~/.aws/config and ~/.aws/credentials, and then block while waiting for the user to grant permissions. This instead automatically denies access to them
#--location is here because the otel sdk for the browser relies on it (specifically the 2 usages in this file - https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-web/src/utils.ts#L167). The actual value is irrelevant when it's being used to silence dependency errors, as is mentioned in this Deno doc section - https://deno.land/manual/runtime/location_api#only-use-if-necessary
CUSTOMIZED_DENO_COMPILE = deno compile --no-check --unstable --allow-read=./ --allow-env --allow-net --no-prompt --location=https://github.com/Grunet/cfn-trace

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
	${CUSTOMIZED_DENO_COMPILE} --output ./dist/cfn-trace ./src/index.ts
version: 
	./dist/cfn-trace --version
#Release-related commands
buildBinaryForASingleArchitecture:
	${CUSTOMIZED_DENO_COMPILE} --target ${architecture} --output ${outputPath} ./src/index.ts
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
#   The S3 bucket referenced here was created manually
	aws cloudformation package --template-file ./examples/${dir}/root.yaml --s3-bucket examples-templates --s3-prefix ${dir} --output-template-file ./tmp/${dir}.template
	aws cloudformation deploy --template-file ./tmp/${dir}.template --stack-name ${dir}
	rm -rf ./tmp/
#OpenTelemetry-related commands
startCollector:
	cd ./src/openTelemetryAdapter/local-collector && docker compose up
runCreateSpansAndExportThemTestHarness:
	deno run --no-check --location https://www.example.com --allow-net ./src/openTelemetryAdapter/createSpansAndExportThem_test_harness.ts
