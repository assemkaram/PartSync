// TEAM P02 | STEP P02-030 | Review this file, then remove this marker only.
/** Report dependencies that no source file imports. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync('client/package.json', 'utf8'));
const serverPkg = JSON.parse(readFileSync('server/package.json', 'utf8'));
const walk = (dir) =>
  readdirSync(dir).flatMap((e) => {
    const f = join(dir, e);
    return statSync(f).isDirectory() ? walk(f) : /\.(js|jsx|css)$/.test(e) ? [f] : [];
  });

const sources = [...walk('client/src'), ...walk('server/supabase'), 'client/vite.config.js', 'client/tailwind.config.js']
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

// A dependency is "used" if it appears in any import, in a css @import, or is a
// type-only package referenced via a `@types/` counterpart.
const unused = [];
for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
  const bare = name.replace(/^@/, '').replace(/\//g, '\\/');
  const patterns = [
    new RegExp(`['"]${name.replace(/[/.]/g, '\\$&')}(\\/[^'"]*)?['"]`),
    new RegExp(`@import\\s+['"]${name.replace(/[/.]/g, '\\$&')}`),
  ];
  if (!patterns.some((p) => p.test(sources))) unused.push(`${name} ${version}`);
}

console.log(unused.length ? `Unused client dependencies (${unused.length}):` : 'No unused client dependencies.');
unused.forEach((u) => console.log('  ' + u));
