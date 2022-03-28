all: format lint test version
format:
	deno fmt
lint:
	deno lint 
test:
	deno test
version: 
	deno run src/index.ts --version