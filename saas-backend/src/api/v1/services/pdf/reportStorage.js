'use strict';

// Local-disk storage for generated report PDFs — the simplest thing that
// works for the MVP. Files live under <repo>/storage/reports/<tenantId>/<reportId>.pdf,
// keyed by tenant so one tenant can never even theoretically be served
// another tenant's path. Swap for S3/GCS later behind the same two functions
// without touching callers.

const fs = require('node:fs/promises');
const path = require('node:path');

const REPORTS_DIR = process.env.REPORTS_STORAGE_DIR
  || path.join(__dirname, '..', '..', '..', '..', '..', 'storage', 'reports');

function pdfPath(tenantId, reportId) {
  return path.join(REPORTS_DIR, tenantId, `${reportId}.pdf`);
}

async function savePdf(tenantId, reportId, buffer) {
  const filePath = pdfPath(tenantId, reportId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function readPdf(tenantId, reportId) {
  const filePath = pdfPath(tenantId, reportId);
  return fs.readFile(filePath);
}

module.exports = { pdfPath, savePdf, readPdf, REPORTS_DIR };
