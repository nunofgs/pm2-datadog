# pm2-datadog

This is a PM2 module to report application metrics and events in `pm2` to Datadog.

## Quick start

Install the module:

```sh
pm2 install uphold/pm2-datadog
```

## Configuration variables

Variable    | Description                                           | Default
----------- | ----------------------------------------------------- | -----------
global_tags | A list of global tags to send with every metric/event | _[None]_
host        | The hostname or IP address of the DogStatsD daemon    | _localhost_
interval    | The polling interval for reporting metrics            | _10000_
port        | The port for the DogStatsD daemon                     | _8125_

To set a configuration variable, please run the following in your project directory:

`pm2 set pm2-datadog:<variable> <value>`

## Release

```sh
❯ npm version [<new version> | major | minor | patch] -m "Release %s"
```

## License

MIT
