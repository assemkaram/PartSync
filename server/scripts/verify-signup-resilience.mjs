import { readFileSync } from 'node:fs';
const route = readFileSync('server/api/auth/signup.js', 'utf8');
const login = readFileSync('server/api/auth/login.js', 'utf8');
const hook = readFileSync('client/src/hooks/useAuth.js', 'utf8');
const backend = readFileSync('server/index.js', 'utf8');
const serverEnv = readFileSync('server/.env.example', 'utf8');
const health = readFileSync('server/api/auth/health.js', 'utf8');
const checks = [
  ['signup handler exposes a Web Standard fetch entry point', /export default\s*\{\s*async fetch\(request\)/.test(route)],
  ['signup avoids an additional database RPC in the critical path', !/consume_username_signup_slot/.test(route)],
  ['local signup abuse throttle remains active', /checkLocalRateLimit\(clientIp\)/.test(route)],
  ['admin create-user request has a bounded 12 second timeout', /\},\s*12_000\)/.test(route)],
  ['signup password grant has a bounded 10 second timeout', /\},\s*10_000\)/.test(route)],
  ['signup returns access and refresh tokens', /session:\s*\{\s*access_token:[\s\S]*?refresh_token:/m.test(route)],
  ['duplicate signup attempts to recover the existing session', /isDuplicate\(createMessage\)[\s\S]*?auth\/v1\/token\?grant_type=password/.test(route)],
  ['login uses the same synthetic username email alias', /@accounts\.nexus\.invalid/.test(login)],
  ['login is server-proxied and returns a regular Supabase session', /auth\/v1\/token\?grant_type=password/.test(login) && /access_token/.test(login) && /refresh_token/.test(login)],
  ['client persists both signup and login sessions with setSession', /supabase\.auth\.setSession/.test(hook)],
  ['client login calls the server login endpoint', /api\/auth\/login/.test(hook)],
  ['auth routes emit request IDs and stage diagnostics', /requestId/.test(route) && /requestId/.test(login) && /password_grant_rejected/.test(login)],
  ['safe auth health endpoint exposes readiness without secret values', /signupReady/.test(health) && /loginReady/.test(health) && !/SERVICE_ROLE_KEY\s*:\s*serviceRoleKey/.test(health)],
  ['standalone Node backend mounts signup and login endpoints', /path === '\/api\/auth\/signup'/.test(backend) && /path === '\/api\/auth\/login'/.test(backend)],
  ['server environment example documents Supabase server secrets', /SUPABASE_SECRET_KEY/.test(serverEnv) && /SUPABASE_PUBLISHABLE_KEY/.test(serverEnv) && /GEMINI_API_KEY/.test(serverEnv)],
  ['signup timeout warns against creating a duplicate account', /لا تنشئ حسابًا جديدًا/.test(route)],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\nSignup/auth checks: ${checks.length - failed.length}/${checks.length}`);
if (failed.length) process.exit(1);
