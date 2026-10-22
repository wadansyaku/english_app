import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const supportedNodeEngines = '>=22.23.4 <23 || >=24.22.1 <25 || >=26.12.1 <27';

export function isSupportedNodeRuntime(version) {
  const match = typeof version === 'string' && /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  const floor = { 22: [23, 4], 24: [22, 1], 26: [12, 1] }[major];
  return Boolean(floor && (minor > floor[0] || (minor === floor[0] && patch >= floor[1])));
}

export function assertSupportedNodeRuntime(version = process.versions.node) {
  if (!isSupportedNodeRuntime(version)) {
    throw new Error(`Unsupported Node.js v${version}. Required: ${supportedNodeEngines}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    assertSupportedNodeRuntime();
    console.log(`Node.js ${process.version} meets the security release requirement.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
