#!/usr/bin/env node
// TEAM P02 | STEP P02-052 | Review this file, then remove this marker only.
import { readFileSync, existsSync, statSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
};

const advisor = read('client/src/services/advisorAgent.js');
const provider = read('client/src/services/ai/providers/geminiProvider.js');
const aiModels = read('client/src/services/ai/models.js');
const models = read('client/src/services/ai/models.js');
const hooks = read('client/src/hooks/useComponents.js');
const aggregator = read('client/src/services/retailers/aggregator.js');
const proxy = read('server/lib/geminiProxy.js');
const ui = read('client/src/pages/AIAdvisor.jsx');
const tools = read('client/src/services/aiTools.js');
const buildAgent = read('client/src/services/buildAgent.js');
const shortlist = read('client/src/lib/scoring/candidateShortlist.js');
const buildDoctor = read('client/src/services/buildDoctor.js');

check('AI advisor passes onToken into generate (real token streaming)', /maxOutputTokens:\s*1_?200,[\s\S]*?onToken:/s.test(advisor));
check('interactive model is Gemini 3.5 Flash-Lite', /chat:\s*\['gemini-3\.5-flash-lite'/.test(models));
check('model cache uses current routing version', /nexus:ai:model:v5/.test(models));
check('agent quality tier starts with Gemini 3.8 Flash', /quality:\s*\['gemini-3\.8-flash'/.test(models));
check('interactive thinking is MINIMAL', /thinkingLevel:\s*'MINIMAL'/.test(advisor) && /thinkingConfig:\s*\{\s*thinkingLevel\s*\}/.test(provider));
check('provider uses Gemini SSE endpoint', /streamGenerateContent\?alt=sse/.test(provider));
check('slow first-token requests fall back after a bounded 8s deadline', /FIRST_TOKEN_TIMEOUT_MS = 8_000/.test(provider) && /AbortSignal.any/.test(provider));
check('fallback is limited to actual Google upstream errors', /x-ai-upstream.*google/.test(provider) && /'X-AI-Upstream':\s*'google'/.test(proxy));
check('tool rounds and tool calls are bounded', /MAX_TOOL_ROUNDS\s*=\s*2/.test(advisor) && /MAX_TOOL_CALLS\s*=\s*4/.test(advisor));
check('AI catalogue requests category-specific listings', /loadCatalogueForAI\(category\)/.test(tools) && /category \? \{ category \}/.test(hooks));
check('AI catalogue excludes slow secondary Sigma feed', /createCatalogue\(false, category\)/.test(hooks));
check('category snapshot fallback has short timeout', /retailer_snapshot_by_category/.test(aggregator) && /setTimeout\(\(\) => controller\.abort\(\), 2_500\)/.test(aggregator));
check('mobile rendering batches token updates per animation frame', /requestAnimationFrame/.test(ui) && /pendingTokensRef/.test(ui));
check('build-generation uses the quality tier and agentic thinking', /MAX_OUTPUT_TOKENS = 8_192/.test(buildAgent) && /model:\s*'quality'/.test(buildAgent) && /thinkingLevel:\s*'MEDIUM'/.test(buildAgent) && !/onToken:\s*options\.onNarration/.test(buildAgent) && /if \(result\.text\)\s*options\.onNarration/.test(buildAgent));
check('build-generation has a forced finalization recovery path', /allowedFunctionNames:[\s\S]*?finalize_build/.test(buildAgent) && /forceCatalogue/.test(buildAgent));
check('Smart Builder first attempts a complete AI selection from live catalogue snapshot', /const initialSelection = await selectBuildFromSnapshot/.test(buildAgent) && /getFinalisationSnapshot\(req\.budget, 10\)/.test(buildAgent));
check('Smart Builder has JSON-schema and plain-JSON AI recovery paths', /geminiClient\.structured/.test(buildAgent) && /parseFinalizeJson/.test(buildAgent));
check('AI shortlist preserves affordable parts instead of only the highest-priced performers', /take\(affordable, Math\.ceil\(limit \* 0\.5\)\)/.test(shortlist) && /take\(performance, Math\.ceil\(limit \* 0\.25\)\)/.test(shortlist));
check('fallback diagnostics include actual recovery validation reason', /recovery: \$\{recoveryIssue\.slice\(0, 220\)\}/.test(buildAgent));
check('agent recovers a previously checked full build if finalize_build is omitted', /getValidatedSelections\(\)/.test(buildAgent) && /rememberValidatedSelection/.test(tools) && /ESSENTIAL_CATEGORIES/.test(buildAgent));
check('Google 429 is surfaced without burning quota on fallback models', /\[404, 503\]\.includes\(response\.status\)/.test(provider) && !/\[404, 429, 503\]\.includes/.test(provider));
check('Google quota errors preserve upstream message and retry delay', /parseGoogleApiError/.test(provider) && /Retry-After/.test(proxy) && /retryAfterSeconds/.test(provider));
check('model availability probing stops on the first 429', /result === 'rate_limited'[\s\S]*?rateLimited: true/.test(aiModels));
check('Smart Builder tool loop is bounded to four rounds', /MAX_TOOL_ROUNDS\s*=\s*4/.test(buildAgent));
check('AI upgrade and refinement output is EGP-only', !/\(\+\$|\(-\$|\(\$\$/.test(buildDoctor + buildAgent));
check('category snapshots exist for all supported categories', ['cpu','gpu','motherboard','ram','storage','psu','case','cooling'].every((category) => existsSync(`client/public/data/retailer_snapshot_by_category/${category}.json`)));
check('category snapshots are smaller than the full catalogue', ['cpu','gpu','motherboard','ram','storage','psu','case','cooling'].every((category) => statSync(`client/public/data/retailer_snapshot_by_category/${category}.json`).size < statSync('client/public/data/retailer_snapshot.json').size));

const failed = checks.filter((item) => !item.ok);
console.log(`\nAI performance contract: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
