const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('frontend source entry exists', () => {
  const entryPoint = path.join(__dirname, '..', 'src', 'main.tsx');
  assert.ok(fs.existsSync(entryPoint), 'Frontend main entry should exist');
});

test('frontend test folder is discoverable', () => {
  assert.ok(fs.existsSync(__dirname), 'Frontend tests folder should exist');
});
