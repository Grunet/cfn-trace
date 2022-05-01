# cfn-trace

Captures Cloudformation nested stack deploy events as traces

(TODO - put a screenshot here illustrating what that looks like)

## Getting Started

### Download the Zip And Unpack the Binary

#### Linux

#### Windows

#### MacOS (with Intel chip)

#### MacOS (with Apple chip)

### Setup a Local OpenTelemetry Collector

### Try it Out Using a Local AWS Access Key and Secret

## CLI Reference

There isn't a `--help` argument yet, but here is a short list of the arguments
that are available

- `--version` - this will echo the version of the binary to the console
- `--stack-name` - set this to the name of a root Cloudformation stack to
  generate a trace from it's most recent deploy

And for the moment, the only way to pass AWS credentials and the region for the
binary to use is via environment variables, specifically

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_DEFAULT_REGION

You can find their definitions in
[this AWS doc](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html).

## Validating the Binaries Haven't Been Compromised Since They Were Published

TODO

## Why is a Collector Needed In the First Place?

TODO

## Contributing

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/Grunet/cfn-trace)

The easiest way to get started playing with the repository is to click on the
above link and create a (free) Gitpod account using your Github credentials.
This will open a workspace in your browser that should have all of the necessary
tools ready to go (you can do the same from a fork if you're working on a PR,
just use your fork's repository in the URL instead of this one's.)

FYI there are no commit hooks or CI commands currently that will save and
re-commit any changes made by the code auto-formatter, so you may have to run
`make format` before you finish a PR to make up for this.
