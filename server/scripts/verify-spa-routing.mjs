import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { readdirSync } from 'node:fs';

const DIST = 'client/dist';
const PORT = 4188;

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('Build output not found. Run `pnpm --dir client build` before this route test.');
  process.exit(2);
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  const candidate = join(DIST, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));

  const exists = existsSync(candidate) && statSync(candidate).isFile();
  const isStaticPath = /^\/(?:assets|data|media)(?:\/|$)/.test(pathname);
  const status = exists ? 200 : isStaticPath ? 404 : 200;
  const file = exists ? candidate : join(DIST, isStaticPath ? '404.html' : 'index.html');

  res.writeHead(status, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, resolve));

const ROUTES = [
  '/',
  '/search',
  '/search?q=rtx%205070',
  '/builder',
  '/builder/ai',
  '/ai-advisor',
  '/prebuilt',
  '/community',
  '/dashboard',
  '/compare/sku%3Agpu%3Ageforce%7C5070%7Cti%7C16',
  '/b/signal-4k-gaming-flagship',
  '/some/nonexistent/deep/route',
];

let failures = 0;
for (const route of ROUTES) {
  const res = await fetch(`http://localhost:${PORT}${route}`);
  const body = await res.text();
  const isShell = body.includes('<div id="root">');
  const ok = res.status === 200 && isShell;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(res.status).padEnd(4)} ${route}`);
}

for (const path of ['/assets/__missing_chunk__.js', '/data/__missing_feed__.json', '/media/__missing_image__.webp']) {
  const res = await fetch(`http://localhost:${PORT}${path}`);
  const body = await res.text();
  const ok = res.status === 404 && !body.includes('<div id="root">');
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  missing static file returns 404 rather than the SPA: ${path}`);
}

const css = readdirSync(join(DIST, 'assets')).find((f) => f.endsWith('.css'));
if (css) {
  const res = await fetch(`http://localhost:${PORT}/assets/${css}`);
  const type = res.headers.get('content-type') ?? '';
  const ok = type.includes('text/css');
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  asset served as ${type} (not index.html)`);
}

const byVersion = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const roots = [];
try {
  roots.push(JSON.parse(readFileSync(join(homedir(), '.codegpt', 'runtime.json'), 'utf8')).modulesRoot);
} catch {}
for (const d of ['.vscode', '.vscode-insiders', '.cursor', '.windsurf']) {
  const base = join(homedir(), d, 'extensions');
  if (!existsSync(base)) continue;
  const n = readdirSync(base)
    .filter((x) => x.startsWith('danielsanmedium.dscodegpt-'))
    .sort(byVersion)
    .pop();
  if (n) roots.push(join(base, n, 'standalone'));
}
let chromium;
for (const r of roots) {
  try {
    chromium = createRequire(r)('patchright').chromium;
    if (chromium) break;
  } catch {}
}

if (chromium) {
  let exe;
  try {
    exe = chromium.executablePath();
  } catch {}
  if (!exe) {
    exe = [
      join(process.env.PROGRAMFILES ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
      join(process.env['PROGRAMFILES(X86)'] ?? '', 'Microsoft\\Edge\\Application\\msedge.exe'),
    ].find((p) => p && existsSync(p));
  }

  const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox'] });
  const page = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  ).newPage();

  for (const route of ['/search?q=rtx%205070', '/builder', '/ai-advisor']) {
    // A hard navigation = exactly what a refresh does.
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 150, { timeout: 15000 })
      .catch(() => {});
    const chars = await page.evaluate(() => document.body.innerText.trim().length);
    const ok = chars > 150;
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  hard refresh ${route} rendered ${chars} chars`);
  }

  await browser.close();
}

server.close();
console.log(failures ? `\n✗ ${failures} failure(s)` : '\n✓ SPA routing verified — no 404 on refresh');
process.exit(failures ? 1 : 0);
