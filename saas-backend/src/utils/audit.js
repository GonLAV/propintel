'use strict';

const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Append a structured audit entry. Best-effort by default; callers performing
 * sensitive mutations can pass { required: true, client } to make failure
 * abort their transaction.
 *
 * @param {object} entry
 * @param {string=} entry.tenantId
 * @param {string=} entry.userId
 * @param {string}  entry.action     dotted action name e.g. 'auth.login.success'
 * @param {string=} entry.entity     e.g. 'user'
 * @param {string=} entry.entityId
 * @param {string=} entry.ip
 * @param {string=} entry.userAgent
 * @param {object=} entry.metadata
 */
async function writeAudit(entry, { required = false, client = null } = {}) {
  const {
    tenantId = null, userId = null, action,
    entity = null, entityId = null,
    ip = null, userAgent = null, metadata = {},
  } = entry;

  if (!action) {
    const err = new Error('Audit action is required');
    if (required) throw err;
    logger.warn({ entry }, 'writeAudit called without action');
    return;
  }

  try {
    const execute = client ? client.query.bind(client) : query;
    await execute(
      `INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [tenantId, userId, action, entity, entityId, ip, userAgent, JSON.stringify(metadata)],
    );
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit log');
    if (required) throw err;
  }
}

module.exports = { writeAudit };
