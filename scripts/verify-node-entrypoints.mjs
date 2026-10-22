import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { isSupportedNodeRuntime } from './check-node-runtime.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const accepted = process.argv.includes('--expect-accept');
assert.equal(accepted !== process.argv.includes('--expect-reject'), true, 'Choose exactly one expected result.');
assert.equal(isSupportedNodeRuntime(process.versions.node), accepted, 'The actual runtime must match the expected test case.');
const npmCli = [process.env.npm_execpath, resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'), resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')].find(p => p && existsSync(p));
assert.ok(npmCli, 'Use the npm CLI bundled with the selected Node.js runtime.');
const state = mkdtempSync(join(tmpdir(), 'english-node-policy-'));
const env = { PATH: [dirname(process.execPath), '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(':'), HOME: join(state, 'home'), TMPDIR: join(state, 'tmp'), CI: '1', npm_config_cache: join(state, 'cache'), npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' };
for (const p of [env.HOME, env.TMPDIR, join(state, 'scripts')]) mkdirSync(p, { recursive: true });
const results = [];
function npm(args, cwd = state) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd, env, encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  return { ...result, output: result.stdout + result.stderr };
}
async function unusedPort() {
  const server = createServer();
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
  const port = server.address().port;
  await new Promise(ok => server.close(ok));
  return port;
}
async function probe(command) {
  const port = await unusedPort();
  const child = spawn(process.execPath, [npmCli, 'run', command, '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', b => { output += b; });
  child.stderr.on('data', b => { output += b; });
  try {
    let ok = false;
    for (let i = 0; i < 200; i++) {
      if (child.exitCode !== null) break;
      try { const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) }); ok = response.status === 200 && (await response.text()).includes('<div id="root"></div>'); } catch {}
      if (ok) break;
      await delay(100);
    }
    assert.ok(ok, `${command} must serve the real app shell: ${output}`);
    assert.ok(output.includes(`Node.js ${process.version} meets`), 'The actual entrypoint must execute the runtime guard.');
    results.push({ check: `actual ${command} entrypoint`, status: 'passed', actualNode: process.version });
  } finally {
    if (child.exitCode === null) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch {}
      await Promise.race([new Promise(ok => child.once('close', ok)), delay(5000)]);
      if (child.exitCode === null) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
    }
  }
}
try {
  copyFileSync(join(root, 'scripts/check-node-runtime.mjs'), join(state, 'scripts/check-node-runtime.mjs'));
  writeFileSync(join(state, 'package.json'), JSON.stringify({ name: 'english-runtime-policy-fixture', version: '1.0.0', private: true, type: 'module', engines: pkg.engines, scripts: { preinstall: pkg.scripts.preinstall } }, null, 2));
  writeFileSync(join(state, '.npmrc'), 'engine-strict=true\naudit=false\nfund=false\n');
  const strict = npm(['install', '--offline', '--ignore-scripts']);
  assert.equal(strict.status === 0, accepted, strict.output);
  if (!accepted) assert.match(strict.output, /EBADENGINE/);
  results.push({ check: 'actual npm engine-strict install (zero dependencies, offline)', expected: accepted ? 'accept' : 'reject', status: 'passed' });
  const lifecycle = npm(['install', '--offline', '--engine-strict=false']);
  assert.equal(lifecycle.status === 0, accepted, lifecycle.output);
  assert.match(lifecycle.output, accepted ? /meets the security release requirement/ : /Unsupported Node.js/);
  results.push({ check: 'actual npm preinstall even when engine-strict is disabled (zero dependencies, offline)', expected: accepted ? 'accept' : 'reject', status: 'passed' });
  if (!accepted) {
    for (const command of ['dev', 'build', 'preview']) {
      const result = npm(['run', command], root);
      assert.notEqual(result.status, 0, result.output);
      assert.match(result.output, /Unsupported Node.js/);
      results.push({ check: `actual ${command} rejects before Vite`, status: 'passed' });
    }
  } else if (process.argv.includes('--probe')) {
    await probe('dev');
    await probe('preview');
  }
  console.log(JSON.stringify({ actualNode: process.version, actualNpmCli: npmCli, expected: accepted ? 'accept' : 'reject', results, isolatedChildEnvironment: true, registryRequests: false }, null, 2));
} finally {
  rmSync(state, { recursive: true, force: true });
}
