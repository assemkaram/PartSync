#!/usr/bin/env node
// TEAM P02 | STEP P02-064 | Review this file, then remove this marker only.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isModuleLoadError } from '../../client/src/lib/moduleRecovery.js';

for (const message of [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Unable to preload CSS for /assets/page.123.css',
  'Failed to load module script: Expected a JavaScript-or-Wasm module script',
  'Loading chunk 7 failed',
]) assert.equal(isModuleLoadError(new Error(message)), true, message);
assert.equal(isModuleLoadError(new Error('Cannot read properties of undefined')), false);
console.log('PASS module-load error recognition (6 cases)');

const lazy = await readFile(new URL('../../client/src/lib/lazyWithRetry.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../../client/src/main.jsx', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../../client/vercel.json', import.meta.url), 'utf8'));
const redirects = await readFile(new URL('../../client/public/_redirects', import.meta.url), 'utf8');
const headers = await readFile(new URL('../../client/public/_headers', import.meta.url), 'utf8');
const apache = await readFile(new URL('../../client/public/.htaccess', import.meta.url), 'utf8');
assert.match(lazy, /RETRY_DELAYS_MS = \[180, 550\]/);
assert.match(lazy, /recoverFromModuleLoadError\(lastError\)/);
assert.match(await readFile(new URL('../../client/src/lib/moduleRecovery.js', import.meta.url), 'utf8'), /RECOVERY_KEY}:\$\{window\.location\.pathname\}/);
assert.match(main, /vite:preloadError/);
assert.match(main, /clearRecoveryUrlMarker\(\)/);
assert.ok(vercel.rewrites.some((rule) => /assets\/\|data\/\|media\//.test(rule.source)));
assert.match(JSON.stringify(vercel.headers), /no-cache, no-store, must-revalidate/);
assert.match(redirects, /\/assets\/\*\s+\/404\.html\s+404/);
assert.match(redirects, /\/\*\s+\/index\.html\s+200/);
assert.match(headers, /\/index\.html[\s\S]*?no-cache, no-store, must-revalidate/);
assert.match(apache, /RewriteRule \^\(assets\|data\|media\)\(\/\|\$\) - \[L\]/);
console.log('PASS retry/recovery, static asset routing, and HTML cache policy');

// Exercise the reload guard with a mocked browser: one retry per route, without
// allowing one broken route to block recovery on another route.
const recoveryCalls = [];
const storage = new Map();
let route = '/builder';
globalThis.window = {
  location: {
    get pathname() { return route; },
    get href() { return `https://rigpilot.example${route}`; },
    reload() { recoveryCalls.push(`reload:${route}`); },
    replace(url) { recoveryCalls.push(`replace:${url}`); },
  },
  sessionStorage: {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, value); },
  },
};
const runtimeRecovery = await import('../../client/src/lib/moduleRecovery.js?recovery-runtime-test');
assert.equal(runtimeRecovery.recoverFromModuleLoadError(new Error('Failed to fetch dynamically imported module')), true);
assert.deepEqual(recoveryCalls, ['reload:/builder']);
assert.equal(runtimeRecovery.recoverFromModuleLoadError(new Error('Failed to fetch dynamically imported module')), false);
route = '/search';
assert.equal(runtimeRecovery.recoverFromModuleLoadError(new Error('Failed to fetch dynamically imported module')), true);
assert.deepEqual(recoveryCalls, ['reload:/builder', 'reload:/search']);
delete globalThis.window;
console.log('PASS runtime reload guard retries once per route (not globally)');

console.log('\n✓ Module recovery checks passed');
