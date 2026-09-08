'use strict';

const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * Append a structured audit entry. Failures are logged but never thrown.
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
async function writeAudit(entry) {
  const {
    tenantId = null, userId = null, action,
    entity = null, entityId = null,
    ip = null, userAgent = null, metadata = {},
  } = entry;

  if (!action) {
    logger.warn({ entry }, 'writeAudit called without action');
    return;
  }

  try {
    await query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [tenantId, userId, action, entity, entityId, ip, userAgent, JSON.stringify(metadata)],
    );
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit log');
  }
}

module.exports = { writeAudit };
