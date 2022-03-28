all: format lint test clean build version
format:
	deno fmt
lint:
	deno lint 
test:
	deno test
clean:
	rm -rf dist
build:
	deno compile --output ./dist/cfn-trace ./src/index.ts
version: 
	./dist/cfn-trace --version