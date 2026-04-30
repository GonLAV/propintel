#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = __dirname;

const dirs = [
  'saas-backend/src/config',
  'saas-backend/src/api/v1/routes',
  'saas-backend/src/api/v1/controllers',
  'saas-backend/src/api/v1/services',
  'saas-backend/src/api/v1/repositories',
  'saas-backend/src/api/v1/validators',
  'saas-backend/src/middleware',
  'saas-backend/src/utils',
  'saas-backend/src/db',
  'saas-backend/sql',
  'saas-backend/tests/unit',
  'saas-backend/tests/integration'
];

console.log('Creating directories...');
dirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  // Create .gitkeep file
  fs.writeFileSync(path.join(fullPath, '.gitkeep'), '');
  console.log(`✓ Created: ${dir}/.gitkeep`);
});

console.log('\n✓ All 12 directories created with .gitkeep files');
