all: format lint
format:
	deno fmt
lint:
	deno lint 
version: 
	deno run src/index.ts --version