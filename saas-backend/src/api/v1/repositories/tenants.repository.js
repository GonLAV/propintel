'use strict';

const { query } = require('../../../config/database');

async function findById(id) {
  const { rows } = await query(
    `SELECT id, name, slug, status, created_at, updated_at
       FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await query(
    `SELECT id, name, slug, status
       FROM tenants WHERE slug = $1 AND deleted_at IS NULL`,
    [slug],
  );
  return rows[0] || null;
}

async function create(client, { name, slug, createdBy = null }) {
  const { rows } = await client.query(
    `INSERT INTO tenants (name, slug, created_by) VALUES ($1, $2, $3)
     RETURNING id, name, slug, status, created_at, updated_at`,
    [name, slug, createdBy],
  );
  return rows[0];
}

async function updateName(id, name) {
  const { rows } = await query(
    `UPDATE tenants SET name = $2
       WHERE id = $1 AND deleted_at IS NULL
   RETURNING id, name, slug, status, created_at, updated_at`,
    [id, name],
  );
  return rows[0] || null;
}

module.exports = { findById, findBySlug, create, updateName };
