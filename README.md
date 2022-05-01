# cfn-trace

Captures Cloudformation nested stack deploy events as traces

(TODO - put a screenshot here illustrating what that looks like)

## Getting Started

Before you start, you'll need to have an
[AWS access key and secret](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html#access-keys-and-secret-access-keys)
on hand, as well as the name of a Cloudformation stack you have permissions to
call
[the DescribeStackEvents API](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_DescribeStackEvents.html)
on.

### Download the Zip And Extract the Binary

Use one of the following sets of commands, depending on your operating system.
Alternatively you can download the zip directly from
[the releases page](https://github.com/Grunet/cfn-trace/releases).

#### Linux

```
wget https://github.com/Grunet/cfn-trace/releases/latest/download/cfn-trace-x86_64-unknown-linux-gnu.zip
unzip cfn-trace-x86_64-unknown-linux-gnu.zip
rm cfn-trace-x86_64-unknown-linux-gnu.zip
```

Leaves a binary named `cfn-trace` in the current working directory.

#### Windows

```
Invoke-WebRequest https://github.com/Grunet/cfn-trace/releases/latest/download/cfn-trace-x86_64-pc-windows-msvc.zip -OutFile ./cfn-trace-x86_64-pc-windows-msvc.zip
Expand-Archive -LiteralPath .\cfn-trace-x86_64-pc-windows-msvc.zip -DestinationPath .\
rm .\cfn-trace-x86_64-pc-windows-msvc.zip
```

Leaves an executable named `cfn-trace.exe` in the current working directory.

#### MacOS (with Intel chip)

```
TODO
```

#### MacOS (with Apple chip)

```
TODO
```

### Setup a Local OpenTelemetry Collector

If you use Docker, the following should get you setup. Otherwise check out
[its official docs](https://opentelemetry.io/docs/collector/getting-started/)
for alternative approaches.

Create a docker-compose.yaml file as follows

```
version: "3.9"
services:
  otel-collector:
    image: otel/opentelemetry-collector
    volumes:
      - ./config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4318:4318"
```

And then in the same directory, create a config.yaml file as follows to override
the default the image comes with

```
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
```

Then to start the collector run `docker compose up` from this directory.

### Try it Out Using a Local AWS Access Key and Secret

TODO

#### How to Export to a Vendor?

TODO

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
