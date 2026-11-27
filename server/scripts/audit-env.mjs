#!/usr/bin/env node
// TEAM P02 | STEP P02-025 | Review this file, then remove this marker only.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const failures = [];
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { failures.push(message); console.error(`FAIL  ${message}`); };

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      if (['.git', 'node_modules', 'dist', 'coverage', '.vite'].includes(name)) return [];
      return walk(path);
    }
    return [path];
  });
}

const files = walk(ROOT);
const envFiles = files.filter((path) => {
  const name = path.split(/[\\/]/).at(-1);
  return name === '.env' || name.startsWith('.env.');
});
const unsafeEnvFiles = envFiles.filter((path) => path.split(/[\\/]/).at(-1) !== '.env.example');
if (unsafeEnvFiles.length) unsafeEnvFiles.forEach((path) => fail(`Real environment file must not be committed: ${relative(ROOT, path)}`));
else pass('No real .env files are present; only safe .env.example templates are included.');

const clientEnvPath = join(ROOT, 'client/.env.example');
const serverEnvPath = join(ROOT, 'server/.env.example');
const clientEnv = readFileSync(clientEnvPath, 'utf8');
const serverEnv = readFileSync(serverEnvPath, 'utf8');
const requiredClient = ['VITE_API_BASE_URL', 'VITE_APP_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
const requiredServer = ['PORT', 'HOST', 'NODE_ENV', 'CLIENT_ORIGIN', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'AI_RATE_LIMIT_SALT', 'GEMINI_API_KEY', 'GEMINI_API_KEY_FALLBACK'];
for (const key of requiredClient) if (!new RegExp(`^${key}=`, 'm').test(clientEnv)) fail(`Missing ${key} in client/.env.example`);
for (const key of requiredServer) if (!new RegExp(`^${key}=`, 'm').test(serverEnv)) fail(`Missing ${key} in server/.env.example`);
if (requiredClient.every((key) => new RegExp(`^${key}=`, 'm').test(clientEnv))) pass('Client template contains the browser settings and only the public Supabase key.');
if (requiredServer.every((key) => new RegExp(`^${key}=`, 'm').test(serverEnv))) pass('Server template contains required backend variables and the current Supabase key names.');
if (/^GEMINI_MODEL=/m.test(serverEnv)) fail('GEMINI_MODEL is not read by the backend and should not be configured in .env.');

const clientSources = files.filter((path) => path.startsWith(join(ROOT, 'client/src') + '/') && /\.(js|jsx|css)$/.test(path));
const clientText = clientSources.map((path) => readFileSync(path, 'utf8')).join('\n');
if (/(?:import\.meta\.env|process\.env)\s*(?:\?\.|\.)\s*(?:VITE_)?(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY(?:_FALLBACK)?)/.test(clientText)) {
  fail('Client source attempts to read a server-only secret from an environment object.');
} else pass('Client source does not read Supabase secret/service_role or Gemini credentials.');

const backendSources = [
  ...files.filter((path) => path.startsWith(join(ROOT, 'server/api') + '/') && /\.(js|mjs)$/.test(path)),
  ...files.filter((path) => path.startsWith(join(ROOT, 'server/lib') + '/') && /\.(js|mjs)$/.test(path)),
  join(ROOT, 'server/index.js'),
];
const backendText = backendSources.map((path) => readFileSync(path, 'utf8')).join('\n');
if (/process\.env\.VITE_[A-Z0-9_]+/.test(backendText)) fail('Backend runtime still reads a VITE_* variable; VITE_* belongs to the client only.');
else pass('Backend runtime does not read VITE_* variables.');

const ignoreFiles = Array.from({ length: 5 }, (_, index) => `.gitignore.person-${String(index + 1).padStart(2, '0')}`);
const sparseFiles = Array.from({ length: 5 }, (_, index) => `.sparse-checkout.person-${String(index + 1).padStart(2, '0')}`);
const allIgnoreFiles = files.filter((path) => path.split(/[\\/]/).at(-1).startsWith('.gitignore'));
if (allIgnoreFiles.length !== 5 || ignoreFiles.some((name) => !existsSync(join(ROOT, name)))) fail(`Expected exactly five .gitignore files in the repository; found ${allIgnoreFiles.length}.`);
else {
  const profiles = ignoreFiles.map((name) => readFileSync(join(ROOT, name), 'utf8'));
  const badProfile = profiles.findIndex((text, index) => {
    const expectedGroups = [1, 2, 3, 4, 5].filter((person) => person !== index + 1).map((person) => `PERSON ${person}`);
    return !text.includes('COMMON: DEPENDENCIES') || !text.includes('COMMON: REAL ENVIRONMENT FILES') || !text.includes('SERVER AUDIT AND MAINTENANCE SCRIPTS') && index !== 1 || expectedGroups.some((group) => !text.includes(group)) || (text.match(/^# GROUP G\d\d —/gm) ?? []).length !== 4;
  });
  if (badProfile >= 0) fail(`Git ignore profile ${ignoreFiles[badProfile]} is missing common rules or one of its four teammate groups.`);
  else pass('Exactly five Git ignore profiles exist; each has shared rules and four ordered teammate groups.');
}
if (sparseFiles.some((name) => !existsSync(join(ROOT, name)))) fail('One or more of the five sparse-checkout profiles is missing.');
else pass('All five sparse-checkout worktree profiles exist (these are not Git ignore files).');
if (existsSync(join(ROOT, '.gitignore'))) fail('Unexpected sixth root .gitignore found; keep the five person profiles only.');
else pass('No sixth root .gitignore file exists.');

if (failures.length) {
  console.error(`\nEnvironment audit failed: ${failures.length} issue(s).`);
  process.exit(1);
}
console.log('\nEnvironment and Git profile audit passed.');
