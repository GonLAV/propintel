'use strict';

/**
 * One-shot seed script for development.
 *
 * Usage:
 *   node seed.js
 *
 * Idempotent: re-running upserts the demo tenant/owner and inserts more comps.
 *
 * Creates:
 *   - tenant   "Demo Co"        (slug: demo)
 *   - user     owner@demo.test  (password: DemoPass123!)
 *   - 1 sample property
 *   - 8 comparable_sales rows for Tel Aviv apartments
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');
const { pool, query } = require('./src/config/database');
const config = require('./src/config');

async function main() {
  console.log('Seeding development data…');

  // Tenant
  const slug = 'demo';
  let tenant = (await query(
    `SELECT id, name, slug FROM tenants WHERE slug = $1 AND deleted_at IS NULL`,
    [slug],
  )).rows[0];
  if (!tenant) {
    const r = await query(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
      ['Demo Co', slug],
    );
    tenant = r.rows[0];
    console.log(`  ✓ created tenant ${tenant.slug} (${tenant.id})`);
  } else {
    console.log(`  • tenant ${tenant.slug} already exists (${tenant.id})`);
  }

  // Owner user
  const ownerEmail = 'owner@demo.test';
  let user = (await query(
    `SELECT id, email FROM users WHERE tenant_id = $1 AND email = $2 AND deleted_at IS NULL`,
    [tenant.id, ownerEmail],
  )).rows[0];
  if (!user) {
    const passwordHash = await bcrypt.hash('DemoPass123!', config.bcryptRounds);
    const r = await query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'owner') RETURNING id, email`,
      [tenant.id, ownerEmail, passwordHash, 'Demo Owner'],
    );
    user = r.rows[0];
    console.log(`  ✓ created owner ${user.email} (password: DemoPass123!)`);
  } else {
    console.log(`  • owner ${user.email} already exists`);
  }

  // One sample property if none yet
  const propCount = Number((await query(
    `SELECT COUNT(*)::int AS c FROM properties WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenant.id],
  )).rows[0].c);
  if (propCount === 0) {
    const id = randomUUID();
    await query(
      `INSERT INTO properties (id, tenant_id, address, city, property_type,
                               area_sqm, rooms, floor, year_built, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, tenant.id, '12 Rothschild Blvd', 'Tel Aviv', 'apartment',
        85, 3.5, 6, 2012, user.id],
    );
    console.log('  ✓ created sample property');
  }

  // Comparable sales — only insert if tenant has fewer than 5
  const compsCount = Number((await query(
    `SELECT COUNT(*)::int AS c FROM comparable_sales WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenant.id],
  )).rows[0].c);
  if (compsCount < 5) {
    const today = new Date();
    const year = today.getFullYear();
    const samples = [
      { area: 80, rooms: 3, floor: 4, yb: 2010, price: 2_550_000, daysAgo: 90  },
      { area: 75, rooms: 3, floor: 6, yb: 2011, price: 2_400_000, daysAgo: 150 },
      { area: 90, rooms: 4, floor: 3, yb: 2008, price: 2_700_000, daysAgo: 200 },
      { area: 82, rooms: 3, floor: 5, yb: 2012, price: 2_650_000, daysAgo: 60  },
      { area: 78, rooms: 3, floor: 7, yb: 2014, price: 2_580_000, daysAgo: 30  },
      { area: 95, rooms: 4, floor: 2, yb: 2009, price: 2_750_000, daysAgo: 250 },
      { area: 70, rooms: 2.5, floor: 8, yb: 2015, price: 2_350_000, daysAgo: 100 },
      { area: 88, rooms: 3.5, floor: 4, yb: 2010, price: 2_690_000, daysAgo: 180 },
    ];
    for (const s of samples) {
      const sold = new Date(today.getTime() - s.daysAgo * 24 * 3600 * 1000);
      await query(
        `INSERT INTO comparable_sales
           (tenant_id, city, property_type, area_sqm, rooms, floor, year_built,
            sale_price, currency, sold_at, source)
         VALUES ($1, 'Tel Aviv', 'apartment', $2, $3, $4, $5, $6, 'ILS', $7, 'seed')`,
        [tenant.id, s.area, s.rooms, s.floor, s.yb, s.price, sold.toISOString().slice(0, 10)],
      );
    }
    console.log(`  ✓ inserted ${samples.length} comparable sales for Tel Aviv apartments`);
  } else {
    console.log(`  • tenant already has ${compsCount} comparable sales — skipping`);
  }

  console.log('\nDone. Login with:');
  console.log('  email:    owner@demo.test');
  console.log('  password: DemoPass123!');
  console.log(`  tenant:   ${slug}`);
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error('Seed failed:', e);
    pool.end().catch(() => {});
    process.exit(1);
  });
