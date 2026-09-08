'use strict';

// Real Postgres + Redis, no mocks — regression coverage for the fields added
// in response to Nachshon's (persona appraiser) review (agent-hq/appraiser-review.md):
//   1. report client_name (מזמין השומה) + purpose (מטרת השומה)
//   2. property block/parcel/sub_parcel (גוש/חלקה/תת-חלקה)
//   3. property visit_date (מועד ביקור), rendered as the determining date
//   4. user license_number (מספר רישיון שמאי), rendered in the signature block
//   5. properties list exposing valuations_count/reports_count for case-status badges
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

describe('appraiser-review follow-up fields (real Postgres + Redis)', () => {
  const slug = `e2e-rev-${randomUUID().slice(0, 8)}`;
  const email = `${slug}@propintel.test`;
  const password = 'TestPass123!';
  const city = 'ירושלים';
  const address = 'רחוב יפו 100';
  const licenseNumber = '78901';
  const block = '30045';
  const parcel = '112';
  const subParcel = '7';
  const visitDate = '2026-08-15';
  const clientName = 'בנק דיסקונט למשכנתאות';
  const purpose = 'משכנתא';
  let app;
  let token;
  let propertyId;
  let valuationId;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
      return;
    }
    app = buildApp();

    const reg = await request(app).post('/api/v1/auth/register').send({
      email, password, fullName: 'משה סגל', tenantName: 'משרד בדיקה', tenantSlug: slug, licenseNumber,
    });
    token = reg.body.accessToken;

    // Registration echoes the stored (safe) user row — license_number must
    // round-trip, not just be silently accepted.
    expect(reg.body.user.license_number).toBe(licenseNumber);

    const prop = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${token}`)
      .send({
        address, city, propertyType: 'apartment',
        areaSqm: 90, rooms: 4, floor: 3, yearBuilt: 2010,
        block, parcel, subParcel, visitDate,
      });
    propertyId = prop.body.id;
    expect(prop.body.block).toBe(block);
    expect(prop.body.parcel).toBe(parcel);
    expect(prop.body.sub_parcel).toBe(subParcel);
    expect(prop.body.visit_date).toContain('2026-08-15');

    for (let i = 1; i <= 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/v1/comparables')
        .set('Authorization', `Bearer ${token}`)
        .send({
          city, propertyType: 'apartment', areaSqm: 85 + i, rooms: 4, floor: i + 1, yearBuilt: 2009,
          salePrice: 2200000 + i * 40000, soldAt: `2025-0${i}-10`, source: 'test',
        });
    }

    const val = await request(app)
      .post('/api/v1/valuations')
      .set('Authorization', `Bearer ${token}`)
      .send({ propertyId, method: 'comparables' });
    valuationId = val.body.id;
  });

  afterAll(async () => {
    await closeBrowser().catch(() => {});
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug = $1', [slug]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('properties list exposes valuations_count/reports_count for the status badge, with no report yet', async () => {
    if (!dbReachable) return;

    const list = await request(app)
      .get('/api/v1/properties')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const item = list.body.items.find((p) => p.id === propertyId);
    expect(item).toBeTruthy();
    expect(item.valuations_count).toBe(1);
    expect(item.reports_count).toBe(0);
  });

  test('PDF report renders client name, purpose, parcel identifiers, visit date, and license number', async () => {
    if (!dbReachable) return;

    const createRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        valuationId, title: 'שומה למשכנתא', format: 'pdf', clientName, purpose,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.client_name).toBe(clientName);
    expect(createRes.body.purpose).toBe(purpose);
    expect(createRes.body.storage_url).toBe(`/api/v1/reports/${createRes.body.id}/pdf`);

    const pdfRes = await downloadBinary(app, createRes.body.storage_url, token);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.body.slice(0, 5).toString('latin1')).toBe('%PDF-');

    const { text } = await pdfParse(pdfRes.body);

    // 1. Client + purpose (מזמין/מטרה) — real values, not the gap-note placeholder.
    expect(text).toContain(clientName);
    expect(text).toContain(`מטרת ההזמנה: ${purpose}`);
    expect(text).not.toContain('פרטי מזמין/ה השומה לא צוינו');
    expect(text).not.toContain('מטרת הזמנה עסקית ספציפית');

    // 2. Parcel identifiers (גוש/חלקה/תת-חלקה) — real values, gap-note gone.
    expect(text).toContain(block);
    expect(text).toContain(parcel);
    expect(text).toContain(subParcel);
    expect(text).not.toContain('גוש / חלקה / תת-חלקה לא צוינו');

    // 3. Visit date shown as the determining date instead of the "no
    // tracked visit" warning.
    expect(text).toContain('מועד הביקור בנכס');
    expect(text).toContain('15.08.2026');
    expect(text).not.toContain('הופקה ללא תאריך ביקור מתועד');

    // 4. License number in the signature block (PDF text extraction can
    // reorder RTL/number runs, so check both pieces rather than one
    // concatenated string — same approach as the parcel fields above).
    expect(text).toContain('מספר רישיון');
    expect(text).toContain(licenseNumber);
  }, 30000);

  test('properties list reports_count becomes 1 after a report exists for the property', async () => {
    if (!dbReachable) return;

    const list = await request(app)
      .get('/api/v1/properties')
      .set('Authorization', `Bearer ${token}`);
    const item = list.body.items.find((p) => p.id === propertyId);
    expect(item.valuations_count).toBe(1);
    expect(item.reports_count).toBe(1);
  });

  test('a report created without clientName/purpose still renders the honest gap notes', async () => {
    if (!dbReachable) return;

    const val2 = await request(app)
      .post('/api/v1/valuations')
      .set('Authorization', `Bearer ${token}`)
      .send({ propertyId, method: 'comparables' });

    const createRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ valuationId: val2.body.id, title: 'שומה ללא פרטי מזמין', format: 'pdf' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.client_name).toBeNull();
    expect(createRes.body.purpose).toBeNull();

    const pdfRes = await downloadBinary(app, createRes.body.storage_url, token);
    const { text } = await pdfParse(pdfRes.body);
    expect(text).toContain('פרטי מזמין/ה השומה לא צוינו');
    expect(text).toContain('מטרת הזמנה עסקית ספציפית');
  }, 30000);
});
