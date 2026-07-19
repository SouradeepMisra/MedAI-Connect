const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('backend test suite can run', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..')), 'Backend folder should exist');
});

test('shared types module is present', () => {
  const sharedTypesPath = path.join(__dirname, '..', '..', 'shared', 'types.ts');
  assert.ok(fs.existsSync(sharedTypesPath), 'Shared types file should exist');
});
