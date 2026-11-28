import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
}

const vite = read('client/vite.config.js');
const router = read('client/src/router.jsx');
const i18n = read('client/src/i18n/index.js');
const css = read('client/src/styles/globals.css');
const logo = read('client/src/components/layout/Logo.jsx');
const packageJson = JSON.parse(read('package.json'));
const health = read('server/api/auth/health.js');
const backend = read('server/index.js');
const rootReadme = read('README.md');
const clientEnv = read('client/.env.example');
const serverEnv = read('server/.env.example');
const button = read('client/src/components/ui/button.jsx');
const componentCard = read('client/src/components/domain/ComponentCard.jsx');
const buildSummary = read('client/src/components/domain/BuildSummaryPanel.jsx');
const gradientMesh = read('client/src/components/shared/GradientMesh.jsx');

check('Vite proxies /api to a standalone backend', /proxy:\s*\{[\s\S]*?['\"]\/api['\"]/.test(vite) && vite.includes('API_PROXY_TARGET'));
check('Node backend exposes independent auth and AI route handlers', backend.includes('signupHandler') && backend.includes('loginHandler') && backend.includes('aiHandler'));
check('Backend includes a health endpoint', backend.includes("pathname === '/api/health'"));
check('Server secrets are isolated from the client env example', serverEnv.includes('SUPABASE_SECRET_KEY') && serverEnv.includes('SUPABASE_PUBLISHABLE_KEY') && serverEnv.includes('GEMINI_API_KEY') && !clientEnv.includes('SUPABASE_SERVICE_ROLE_KEY') && !clientEnv.includes('GEMINI_API_KEY'));
check('Root README documents client/server split', rootReadme.includes('client/') && rootReadme.includes('server/'));
check('React Router v7 startTransition flag is on RouterProvider (supported prop)', /<RouterProvider\s+router=\{router\}\s+future=\{\{\s*v7_startTransition:\s*true\s*\}\}/.test(router) && !/createBrowserRouter\([\s\S]*?future:\s*\{\s*v7_startTransition/.test(router));
check('i18next debug logging explicitly disabled', /debug:\s*false/.test(i18n));
check('RIGPILOT dark canvas token', /--background:\s*10 15 30/.test(css));
check('Signal cyan token', /--primary:\s*66 217 245/.test(css));
check('Orbit violet token', /--secondary:\s*154 135 255/.test(css));
check('Volt lime token', /--accent:\s*184 243 107/.test(css));
check('Chip-and-direction logo mark', logo.includes('RIGPILOT') && logo.includes('rigpilot-chip'));
check('Primary action glow uses Signal Cyan', button.includes('rgba(66,217,245,0.24)'));
check('Hardware cards use the RIGPILOT surface system', componentCard.includes('rigpilot-panel'));
check('Build Score is labelled in the build summary', buildSummary.includes("t('builder.buildScore.label')"));
check('Hero ambient mesh uses brand tokens, not gaming-purple literals', gradientMesh.includes('var(--secondary)') && !gradientMesh.includes('99 102 241'));
check('Auth health reports current release', health.includes("release: '1.2.1'"));
check('Both Supabase auth handlers exist', existsSync(resolve(root, 'server/api/auth/signup.js')) && existsSync(resolve(root, 'server/api/auth/login.js')));
check('Project release version updated', packageJson.version === '1.2.1');

for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
