'use strict';

// Real Postgres + Redis, no mocks — exercises the report-export loop that
// used to be a stub: register -> create property -> add comparable sales ->
// run a valuation -> create a PDF report -> download the actual PDF bytes,
// extract their text, and confirm real Hebrew content and real numbers from
// this run appear in it (not just "a PDF was produced").
//
// This also guards a real bug found during manual verification: Postgres
// returns `numeric` columns (valuations.estimated_value, .confidence) as
// strings, which silently broke `Number.isFinite(...)` checks in the
// template (confidence rendered as "—%", the quick-sale-value row vanished
// entirely) without any error — a byte-count/magic-number check alone would
// never have caught it, hence the text-content assertions below.
//
// Requires migrations already applied to DATABASE_URL. Skips itself if
// Postgres isn't reachable, same convention as the other *.e2e.test.js files.

const request = require('supertest');
const { randomUUID } = require('node:crypto');
const pdfParse = require('pdf-parse');

let dbReachable = true;

const { pool } = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const { buildApp } = require('../../src/app');
const { closeBrowser } = require('../../src/api/v1/services/pdf/pdfRenderer');

function downloadBinary(app, url, token) {
  return request(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
}

async function pdfText(buffer) {
  const { text } = await pdfParse(buffer);
  return text;
}

describe('report PDF export end-to-end (real Postgres + Redis)', () => {
  const slug = `e2e-rep-${randomUUID().slice(0, 8)}`;
  const email = `${slug}@propintel.test`;
  const password = 'TestPass123!';
  const city = 'חיפה';
  const address = 'רחוב הנביאים 12';
  let app;
  let token;
  let propertyId;
  let comparablesValuationId;
  let reconciledValuationId;
  let secondPropertyId;
  let secondPropertyValuationId;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
      return;
    }
    app = buildApp();

    const reg = await request(app).post('/api/v1/auth/register').send({
      email, password, fullName: 'שמאי בדיקה', tenantName: 'משרד שמאות בדיקה', tenantSlug: slug,
    });
    token = reg.body.accessToken;

    const prop = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${token}`)
      .send({
        address, city, propertyType: 'apartment',
        areaSqm: 90, rooms: 4, floor: 3, yearBuilt: 2010,
      });
    propertyId = prop.body.id;

    for (let i = 1; i <= 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/v1/comparables')
        .set('Authorization', `Bearer ${token}`)
        .send({
          city, propertyType: 'apartment', areaSqm: 85 + i, rooms: 4, floor: i + 1, yearBuilt: 2009,
          salePrice: 2100000 + i * 40000, soldAt: `2025-0${i}-10`, source: 'test',
        });
    }

    const compVal = await request(app)
      .post('/api/v1/valuations')
      .set('Authorization', `Bearer ${token}`)
      .send({ propertyId, method: 'comparables' });
    comparablesValuationId = compVal.body.id;

    const reconVal = await request(app)
      .post('/api/v1/valuations')
      .set('Authorization', `Bearer ${token}`)
      .send({ propertyId, method: 'reconciled' });
    reconciledValuationId = reconVal.body.id;

    // A second, unrelated property+valuation — used to prove the
    // `propertyId` list filter actually scopes to one property instead of
    // returning every report in the tenant.
    const secondProp = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${token}`)
      .send({
        address: 'שדרות רוטשילד 5', city: 'תל אביב', propertyType: 'apartment',
        areaSqm: 60, rooms: 2, floor: 1, yearBuilt: 2015,
      });
    secondPropertyId = secondProp.body.id;

    for (let i = 1; i <= 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/v1/comparables')
        .set('Authorization', `Bearer ${token}`)
        .send({
          city: 'תל אביב', propertyType: 'apartment', areaSqm: 58 + i, rooms: 2, floor: i,
          yearBuilt: 2014, salePrice: 1800000 + i * 30000, soldAt: `2025-0${i}-15`, source: 'test',
        });
    }

    const secondVal = await request(app)
      .post('/api/v1/valuations')
      .set('Authorization', `Bearer ${token}`)
      .send({ propertyId: secondPropertyId, method: 'comparables' });
    secondPropertyValuationId = secondVal.body.id;
  });

  afterAll(async () => {
    await closeBrowser().catch(() => {});
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug = $1', [slug]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('comparables-method PDF report contains real property/valuation data as Hebrew text', async () => {
    if (!dbReachable) return;

    const valRes = await request(app)
      .get(`/api/v1/valuations/${comparablesValuationId}`)
      .set('Authorization', `Bearer ${token}`);
    const estimatedValue = Math.round(Number(valRes.body.estimated_value));
    const confidencePct = Math.round(Number(valRes.body.confidence) * 100);

    const createRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ valuationId: comparablesValuationId, title: 'שומה לדוגמה - השוואת מכירות', format: 'pdf' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.format).toBe('pdf');
    expect(createRes.body.storage_url).toBe(`/api/v1/reports/${createRes.body.id}/pdf`);

    const pdfRes = await downloadBinary(app, createRes.body.storage_url, token);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');

    const buf = pdfRes.body;
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(15000);

    const text = await pdfText(buf);

    // Structure: professional Hebrew heading + the numbered-section shape.
    expect(text).toContain('שומת מקרקעין');
    expect(text).toContain('זיהוי הנכס');
    expect(text).toContain('השומה');

    // Real property facts from this exact run.
    expect(text).toContain(city);
    expect(text).toContain('הנביאים');

    // Real numbers: the estimated value must appear, formatted as ILS
    // currency (grouped thousands), and confidence must NOT be the "—%"
    // placeholder that a numeric-coercion regression produces.
    const groupedValue = estimatedValue.toLocaleString('en-US');
    expect(text).toContain(groupedValue);
    expect(text).toContain(`${confidencePct}%`);
    expect(text).not.toContain('רמת ביטחון: —');

    // Quick-sale value (market value − 15%, a standard Israeli-appraisal
    // convention) must be present and must NOT silently vanish — this is
    // exactly the row a numeric-coercion bug (string vs number) dropped.
    const quickSale = Math.round(estimatedValue * 0.85).toLocaleString('en-US');
    expect(text).toContain('שווי למימוש מהיר');
    expect(text).toContain(quickSale);

    // Comparable sales actually used by the engine for this method.
    expect(text).toContain('עסקאות השוואה ששימשו לחישוב');
    expect(text).toContain((2100000 + 40000).toLocaleString('en-US')); // comp #1 sale price
  }, 30000);

  test('a report created with format "json" has no storage_url and its /pdf route 400s', async () => {
    if (!dbReachable) return;

    const createRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ valuationId: reconciledValuationId, title: 'שומה - JSON בלבד', format: 'json' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.storage_url).toBeNull();

    const pdfRes = await request(app)
      .get(`/api/v1/reports/${createRes.body.id}/pdf`)
      .set('Authorization', `Bearer ${token}`);
    expect(pdfRes.status).toBe(400);
  });

  test('reconciled-method PDF report includes the per-method breakdown table', async () => {
    if (!dbReachable) return;

    const createRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ valuationId: reconciledValuationId, title: 'שומה משולבת', format: 'pdf' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.storage_url).not.toBeNull();

    const pdfRes = await downloadBinary(app, createRes.body.storage_url, token);
    expect(pdfRes.status).toBe(200);

    const text = await pdfText(pdfRes.body);
    expect(text).toContain('פירוט השילוב בין השיטות');
    expect(text).toContain('השוואת מכירות');
    expect(text).toContain('גישת העלות');
    expect(text).toContain('גישת ההיוון');
    // Reconciled reports render an extra methods-breakdown table, so the
    // PDF should be meaningfully bigger than a bare single-method report.
    expect(pdfRes.body.length).toBeGreaterThan(15000);
  }, 30000);

  test('GET /reports?propertyId= scopes results to that property only, and enriches with property/valuation info', async () => {
    if (!dbReachable) return;

    // Reports already created against `propertyId` above (comparables +
    // json + reconciled). Create one more against the unrelated
    // `secondPropertyId` to prove cross-property leakage doesn't happen.
    const otherReport = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ valuationId: secondPropertyValuationId, title: 'שומה - נכס שני', format: 'json' });
    expect(otherReport.status).toBe(201);

    const scoped = await request(app)
      .get(`/api/v1/reports?propertyId=${propertyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(scoped.status).toBe(200);
    expect(scoped.body.items.length).toBeGreaterThan(0);
    for (const item of scoped.body.items) {
      expect(item.property.id).toBe(propertyId);
      expect(item.property.address).toBe(address);
      expect(item.property.city).toBe(city);
    }
    expect(scoped.body.items.some((r) => r.id === otherReport.body.id)).toBe(false);

    const scopedOther = await request(app)
      .get(`/api/v1/reports?propertyId=${secondPropertyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(scopedOther.status).toBe(200);
    expect(scopedOther.body.items.length).toBe(1);
    expect(scopedOther.body.items[0].id).toBe(otherReport.body.id);
    expect(scopedOther.body.items[0].property.address).toBe('שדרות רוטשילד 5');
    expect(scopedOther.body.items[0].valuation_summary.method).toBe('comparables');
    expect(typeof scopedOther.body.items[0].valuation_summary.estimatedValue).toBe('number');
  });

  test('GET /reports with no filter returns every report across both properties for this tenant', async () => {
    if (!dbReachable) return;

    const all = await request(app)
      .get('/api/v1/reports?pageSize=100')
      .set('Authorization', `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(all.body.total).toBeGreaterThanOrEqual(4);

    const propertyIds = new Set(all.body.items.map((r) => r.property?.id).filter(Boolean));
    expect(propertyIds.has(propertyId)).toBe(true);
    expect(propertyIds.has(secondPropertyId)).toBe(true);

    // Newest-first ordering.
    const timestamps = all.body.items.map((r) => new Date(r.created_at).getTime());
    const sorted = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sorted);
  });
});
