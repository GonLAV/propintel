'use strict';

/**
 * Lightweight in-memory Prometheus-compatible metrics.
 *
 * Exposes:
 *   - http_requests_total{method,route,status}       (counter)
 *   - http_request_duration_seconds_bucket{...,le}   (histogram)
 *   - http_request_duration_seconds_sum / _count
 *   - process_resident_memory_bytes                  (gauge)
 *   - process_uptime_seconds                         (gauge)
 *   - nodejs_eventloop_lag_seconds                   (gauge, sampled)
 *   - app_info{version,env}                          (gauge=1)
 *
 * No external dependency; safe in a single-process container.
 * For multi-process deployments, swap to prom-client + cluster aggregator.
 */

const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

const counters = new Map();   // key -> count
const histSums = new Map();   // key -> sum
const histCounts = new Map(); // key -> n
const histBuckets = new Map(); // key|le -> count

let lastEventLoopLag = 0;
const startTime = Date.now();

function k(name, labels) {
  const lbl = Object.entries(labels)
    .map(([n, v]) => `${n}="${String(v).replace(/"/g, '\\"')}"`)
    .join(',');
  return `${name}{${lbl}}`;
}

function inc(name, labels, n = 1) {
  const key = k(name, labels);
  counters.set(key, (counters.get(key) || 0) + n);
}

function observe(name, labels, value) {
  const base = k(name, labels);
  histSums.set(base, (histSums.get(base) || 0) + value);
  histCounts.set(base, (histCounts.get(base) || 0) + 1);
  for (const le of buckets) {
    if (value <= le) {
      const bk = `${base}|${le}`;
      histBuckets.set(bk, (histBuckets.get(bk) || 0) + 1);
    }
  }
  // +Inf bucket
  const bkInf = `${base}|+Inf`;
  histBuckets.set(bkInf, (histBuckets.get(bkInf) || 0) + 1);
}

function sampleEventLoopLag() {
  const t = Date.now();
  setImmediate(() => { lastEventLoopLag = (Date.now() - t) / 1000; });
}
setInterval(sampleEventLoopLag, 5000).unref();

// Pulls a stable route label from req (avoids cardinality blowup from path params).
function routeLabel(req) {
  if (req.route && req.route.path) {
    const base = req.baseUrl || '';
    return base + req.route.path;
  }
  // Fallback: collapse uuids and numeric ids
  return (req.originalUrl || req.url || '/')
    .split('?')[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

function middleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status: String(res.statusCode),
    };
    inc('http_requests_total', labels);
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    observe('http_request_duration_seconds', labels, seconds);
  });
  next();
}

function escapeLabels(labels) {
  return Object.entries(labels)
    .map(([n, v]) => `${n}="${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`)
    .join(',');
}

function render() {
  const lines = [];
  const env = process.env.NODE_ENV || 'development';
  const version = process.env.npm_package_version || '1.0.0';

  lines.push('# HELP app_info Application metadata');
  lines.push('# TYPE app_info gauge');
  lines.push(`app_info{version="${version}",env="${env}"} 1`);

  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${(Date.now() - startTime) / 1000}`);

  lines.push('# HELP process_resident_memory_bytes Resident set size');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${process.memoryUsage().rss}`);

  lines.push('# HELP nodejs_eventloop_lag_seconds Event loop lag (sampled)');
  lines.push('# TYPE nodejs_eventloop_lag_seconds gauge');
  lines.push(`nodejs_eventloop_lag_seconds ${lastEventLoopLag}`);

  // counters
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, val] of counters) {
    if (key.startsWith('http_requests_total{')) lines.push(`${key} ${val}`);
  }

  const customCounterNames = new Set();
  for (const key of counters.keys()) {
    const name = key.slice(0, key.indexOf('{'));
    if (name !== 'http_requests_total') customCounterNames.add(name);
  }
  for (const name of customCounterNames) {
    lines.push(`# TYPE ${name} counter`);
    for (const [key, val] of counters) {
      if (key.startsWith(`${name}{`)) lines.push(`${key} ${val}`);
    }
  }

  // histogram
  lines.push('# HELP http_request_duration_seconds Request latency in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');
  // Group histogram keys by base
  const bases = new Set();
  for (const k2 of histSums.keys()) bases.add(k2);
  for (const base of bases) {
    if (!base.startsWith('http_request_duration_seconds{')) continue;
    const labelPart = base.slice('http_request_duration_seconds'.length);
    const labelInner = labelPart.slice(1, -1);
    for (const le of buckets) {
      const bk = `${base}|${le}`;
      const v = histBuckets.get(bk) || 0;
      lines.push(`http_request_duration_seconds_bucket{${labelInner},le="${le}"} ${v}`);
    }
    const inf = histBuckets.get(`${base}|+Inf`) || 0;
    lines.push(`http_request_duration_seconds_bucket{${labelInner},le="+Inf"} ${inf}`);
    lines.push(`http_request_duration_seconds_sum${labelPart} ${histSums.get(base)}`);
    lines.push(`http_request_duration_seconds_count${labelPart} ${histCounts.get(base)}`);
  }

  return lines.join('\n') + '\n';
}

function handler(req, res) {
  res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(render());
}

// Allow services to record custom counters (e.g. valuations completed).
function counter(name, labels = {}, n = 1) { inc(name, labels, n); }

// Test helper.
function _reset() {
  counters.clear(); histSums.clear(); histCounts.clear(); histBuckets.clear();
}

module.exports = { middleware, handler, counter, escapeLabels, _reset };
