'use strict';

const { NotFound } = require('../../../utils/errors');
const tenantsRepo = require('../repositories/tenants.repository');

async function getById(id) {
  const t = await tenantsRepo.findById(id);
  if (!t) throw NotFound('Tenant not found');
  return t;
}

async function updateName(id, name) {
  const t = await tenantsRepo.updateName(id, name);
  if (!t) throw NotFound('Tenant not found');
  return t;
}

module.exports = { getById, updateName };
