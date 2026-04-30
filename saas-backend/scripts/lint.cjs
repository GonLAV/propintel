'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const eslintPackage = require.resolve('eslint/package.json');
const eslintBin = path.join(path.dirname(eslintPackage), 'bin', 'eslint.js');
const result = spawnSync(
  process.execPath,
  [eslintBin, 'src/**/*.js', 'tests/**/*.js', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' },
    shell: false,
  },
);

process.exit(result.status ?? 1);