'use strict';

/**
 * Module dependencies.
 */

const { StatsD } = require('hot-shots');
const debugnyan = require('debugnyan');
const path = require('path');
const pm2 = require('pm2');
const pmx = require('pmx');

/**
 * Constants.
 */

const logger = debugnyan('pm2-datadog');
const { global_tags: globalTags, host, interval, port } = pmx.initModule();
const dogstatsd = new StatsD({ globalTags, host, port });
const { CHECKS: { OK } } = dogstatsd;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Log errors.
 */

dogstatsd.socket.on('error', error => {
  logger.error({ error }, 'Error reporting to DogStatsd');
});

/**
 * Process pm2 events.
 */

pm2.launchBus((err, bus) => {
  logger.info('PM2 connection established');

  bus.on('process:event', ({ at, event, process }) => {
    const { name, pm_cwd, pm_uptime, restart_time, status, versioning } = process;
    const aggregation_key = `${name}-${pm_uptime}`;
    const { version } = require(path.resolve(pm_cwd, 'package.json'));
    const tags = [
      `name:${name}`,
      `status:${status}`,
      `version:${version}`
    ];

    logger.info(`Received event '${event}' with status '${status}'`);

    if (versioning && versioning.branch !== 'HEAD') {
      tags.push(`branch:${versioning.branch}`);
    }

    // `delete` is triggered when an app is deleted from PM2.
    if (event === 'delete') {
      dogstatsd.event(`PM2 process '${name}' was deleted`, null, { date_happened: at }, tags);

      return;
    }

    // `exit` is triggered when an app exits.
    if (event === 'exit') {
      dogstatsd.event(`PM2 process '${name}' is ${status}`, null, { aggregation_key, alert_type: 'warning', date_happened: at }, tags);
      dogstatsd.timing('pm2.processes.uptime', new Date() - pm_uptime, tags);

      return;
    }

    // `restart` is triggered when an app is restarted, either manually or due to a crash.
    if (event === 'restart') {
      dogstatsd.event(`PM2 process '${name}' was restarted`, null, { alert_type: 'success', date_happened: at }, tags);
      dogstatsd.check('app.is_ok', OK, { date_happened: at }, tags);
      dogstatsd.gauge('pm2.processes.restart', restart_time, tags);

      return;
    }

    // `restart overlimit` is triggered when an app exceeds the restart limit.
    if (event === 'restart overlimit') {
      dogstatsd.event(`PM2 process '${name}' has exceeded the restart limit`, null, { aggregation_key, alert_type: 'error', date_happened: at }, tags);

      return;
    }

    // `start` is triggered when an app is manually started.
    if (event === 'start') {
      dogstatsd.event(`PM2 process '${name}' was manually started`, null, { alert_type: 'success', date_happened: at }, tags);
      dogstatsd.check('app.is_ok', OK, { date_happened: at }, tags);

      return;
    }

    // `stop` is triggered when an app is manually stopped.
    if (event === 'stop') {
      dogstatsd.event(`PM2 process '${name}' was manually stopped`, null, { alert_type: 'error', date_happened: at }, tags);

      return;
    }
  });
});

/**
 * Report metrics to DataDog.
 */

async function start() {
  pm2.list((err, processes) => {
    dogstatsd.gauge('pm2.processes.installed', processes.length);

    for (const process of processes) {
      dogstatsd.gauge('pm2.processes.cpu', process.monit.cpu);
      dogstatsd.gauge('pm2.processes.memory', process.monit.memory);
    }
  });

  await sleep(interval);
  await start();
}

logger.info({ globalTags, host, interval, port }, `Starting pm2-datadog`);

start();
