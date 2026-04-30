'use strict';

function clamp(n, min, max) {
  return Math.min(Math.max(Number(n) || min, min), max);
}

function paginate({ page = 1, pageSize = 20 }, { maxPageSize = 100 } = {}) {
  const p = clamp(page, 1, 100000);
  const ps = clamp(pageSize, 1, maxPageSize);
  return { page: p, pageSize: ps, limit: ps, offset: (p - 1) * ps };
}

module.exports = { paginate };
