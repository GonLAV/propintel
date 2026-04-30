#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, '..');

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

console.log(`\n📁 Creating directory structure in: ${baseDir}\n`);

let successCount = 0;
let existingCount = 0;
let errorCount = 0;

dirs.forEach(dir => {
    const fullPath = path.join(baseDir, dir.replace(/\//g, path.sep));
    try {
        if (fs.existsSync(fullPath)) {
            console.log(`↻ Already exists: ${dir}`);
            existingCount++;
        } else {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`✓ Created: ${dir}`);
            successCount++;
        }
    } catch (error) {
        console.error(`✗ Error with ${dir}: ${error.message}`);
        errorCount++;
    }
});

console.log(`\n📊 Summary:`);
console.log(`  ✓ Created: ${successCount} directories`);
console.log(`  ↻ Already existed: ${existingCount} directories`);
if (errorCount > 0) {
    console.log(`  ✗ Failed: ${errorCount} directories`);
} else {
    console.log(`  ✗ Failed: 0 directories`);
}

console.log('\n✅ Directory structure setup complete!\n');
