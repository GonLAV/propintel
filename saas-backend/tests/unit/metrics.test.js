'use strict';

const metrics = require('../../src/middleware/metrics');

describe('metrics middleware', () => {
  beforeEach(() => metrics._reset());

  test('records counter and renders prometheus format', () => {
    metrics.counter('valuations_total', { method: 'comparables', status: 'completed' }, 3);
    metrics.counter('valuations_total', { method: 'comparables', status: 'completed' });
    const req = { method: 'GET', route: { path: '/properties' }, baseUrl: '/api/v1' };
    const handlers = {};
    const res = { statusCode: 200, on(ev, fn) { handlers[ev] = fn; } };
    metrics.middleware(req, res, () => {});
    handlers.finish();

    const out = metrics.handler.toString;
    // Render directly via handler:
    const fakeRes = { setHeader() {}, send: jest.fn() };
    metrics.handler({}, fakeRes);
    const body = fakeRes.send.mock.calls[0][0];

    expect(body).toContain('# TYPE http_requests_total counter');
    expect(body).toContain('valuations_total{method="comparables",status="completed"} 4');
    expect(body).toContain('http_requests_total{method="GET",route="/api/v1/properties",status="200"} 1');
    expect(body).toContain('# TYPE http_request_duration_seconds histogram');
    expect(body).toContain('process_uptime_seconds');
    expect(out).toBeTruthy();
  });

  test('collapses uuid path segments to :id', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/properties/3fa85f64-5717-4562-b3fc-2c963f66afa6/edit',
    };
    const handlers = {};
    const res = { statusCode: 200, on(ev, fn) { handlers[ev] = fn; } };
    metrics.middleware(req, res, () => {});
    handlers.finish();
    const fakeRes = { setHeader() {}, send: jest.fn() };
    metrics.handler({}, fakeRes);
    const body = fakeRes.send.mock.calls[0][0];
    expect(body).toContain('/api/v1/properties/:id/edit');
  });
});
