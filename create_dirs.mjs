#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const baseDir = path.resolve(process.cwd());
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
    'saas-backend/tests/integration',
    '.github/workflows',
];

console.log(`Base directory: ${baseDir}`);
console.log('Creating directories...\n');

let successCount = 0;
let errorCount = 0;

dirs.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✓ Created: ${dir}`);
        successCount++;
    } catch (error) {
        console.error(`✗ Error creating ${dir}: ${error.message}`);
        errorCount++;
    }
});

console.log(`\n✓ Successfully created ${successCount} directories`);
if (errorCount > 0) {
    console.log(`✗ Failed to create ${errorCount} directories`);
}
