import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSupportedNodeRuntime, assertSupportedNodeRuntime, supportedNodeEngines } from '../scripts/check-node-runtime.mjs';

for (const version of ['22.23.4', '22.23.5', '22.24.0', '24.22.1', '24.22.2', '24.23.0', '26.12.1', '26.12.2', '26.13.0']) {
  test(`accepts patched supported runtime ${version}`, () => {
    assert.equal(isSupportedNodeRuntime(version), true);
    assert.doesNotThrow(() => assertSupportedNodeRuntime(version));
  });
}
for (const version of ['18.20.0', '20.20.2', '22.19.0', '22.23.3', '24.4.1', '24.15.0', '24.22.0', '23.9.0', '25.9.0', '26.12.0', '27.0.0', '28.0.0', '22.23.4-rc.1', '22.23.4+custom', 'not-a-version', '', undefined]) {
  test(`rejects unsupported or unverified runtime ${String(version)}`, () => {
    assert.equal(isSupportedNodeRuntime(version), false);
    if (version !== undefined) assert.throws(() => assertSupportedNodeRuntime(version), /Unsupported Node.js/);
  });
}
test('package metadata matches the enforced runtime policy', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.engines.node, supportedNodeEngines);
});
