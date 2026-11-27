#!/usr/bin/env node
// TEAM P02 | STEP P02-056 | Review this file, then remove this marker only.
/**
 * Release checks for the PC Builder catalogue, stock states, compatibility
 * filter, numbered pagination and Smart Builder proxy model allowlist.
 * Runs without app dependencies.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const [builder, card, catalogue, comparison, modal, comparePage, wizard, proxy, agent, aggregator, freshness, buildService, scraper, search, defaultRules, compatibilityFilter, useCatalogue, componentsService, candidateShortlist, aiTools, offerRanking] = await Promise.all([
  source('client/src/pages/Builder.jsx'),
  source('client/src/components/domain/ComponentCard.jsx'),
  source('client/src/lib/retailerCatalogue.js'),
  source('client/src/components/retail/CompareTable.jsx'),
  source('client/src/components/retail/ComparePricesModal.jsx'),
  source('client/src/pages/Compare.jsx'),
  source('client/src/components/domain/SmartBuildWizard.jsx'),
  source('server/api/ai/[...path].js'),
  source('client/src/services/buildAgent.js'),
  source('client/src/services/retailers/aggregator.js'),
  source('client/src/lib/stockFreshness.js'),
  source('client/src/services/buildsService.js'),
  source('server/supabase/functions/retailer-sync/parsers.js'),
  source('client/src/services/searchService.js'),
  source('client/src/lib/compatibility/defaultRules.js'),
  source('client/src/lib/compatibility/filter.js'),
  source('client/src/hooks/useCatalogue.js'),
  source('client/src/services/componentsService.js'),
  source('client/src/lib/scoring/candidateShortlist.js'),
  source('client/src/services/aiTools.js'),
  source('client/src/lib/offerRanking.js'),
]);

const checks = [];
function check(name, run) {
  try {
    run();
    checks.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    checks.push({ name, ok: false });
    console.error(`FAIL  ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

check('Builder paginates catalogue items in pages of 12', () => {
  assert.match(builder, /const COMPONENTS_PER_PAGE = 12/);
  assert.match(builder, /visible\.slice\(\(currentPage - 1\) \* COMPONENTS_PER_PAGE/);
  assert.match(builder, /<Pagination[\s\S]*?totalPages=\{totalPages\}/);
});
check('only-compatible toggle filters candidates against selected build', () => {
  assert.match(builder, /const \[onlyCompatible, setOnlyCompatible\] = useState\(false\)/);
  assert.match(builder, /const pairedRules = rules\.filter/);
  assert.match(builder, /evaluateCompatibility\(candidateItems, pairedRules\)/);
  assert.match(builder, /report\.checkedRules === 0/);
  assert.match(builder, /passesCompatibilityFilter\(status, onlyCompatible\)/);
  assert.match(builder, /import \{ passesCompatibilityFilter \} from '@\/lib\/compatibility\/filter'/);
});
check('compatible filter does not hide unverified/review candidates', () => {
  assert.match(compatibilityFilter, /return status !== 'incompatible'/);
  assert.match(builder, /passesCompatibilityFilter\(status, onlyCompatible\)/);
});
check('database compatibility rules merge with bundled safety rules', () => {
  assert.match(defaultRules, /DEFAULT_COMPATIBILITY_RULES/);
  assert.match(defaultRules, /remoteByKey\.get\(rule\.ruleKey\) \?\? rule/);
  assert.match(useCatalogue, /mergeCompatibilityRules\(remoteRules\)/);
  assert.match(componentsService, /mergeCompatibilityRules\(remote\)/);
});
check('missing counterpart/rules are labelled unverified rather than green-compatible', () => {
  assert.match(builder, /pairedRules\.length === 0/);
  assert.match(builder, /Hide only proven hard conflicts|Hide only parts with a confirmed conflict/);
  assert.match(builder, /report\.unverified\?\.length/);
  assert.match(builder, /hasReviewWarning/);
  assert.match(builder, /builder\.selection\.waitingForParts/);
});
check('page resets when catalogue filters or selections change', () => {
  assert.match(builder, /setPage\(1\);[\s\S]*?\}, \[category, query, sort, onlyCompatible, items\]\)/);
});
check('selecting a known-incompatible part is blocked with a reason', () => {
  assert.match(builder, /if \(report\.errors\.length > 0\)[\s\S]*?toast\.error[\s\S]*?return;/);
  assert.match(builder, /builder\.selection\.unverified/);
  assert.match(builder, /builder\.selection\.waitingForParts/);
});
check('unknown retailer stock is never converted to out-of-stock', () => {
  assert.match(catalogue, /return 'unknown';/);
  assert.match(catalogue, /stockStatus: link\.stockStatus \?\? component\.stockStatus/);
});
check('canonical offer ranking chooses in-stock before unknown/out-of-stock', () => {
  assert.match(catalogue, /rankOffers\(group\.offers\.filter/);
  assert.match(catalogue, /return rankOffers\(offers\)/);
});
check('each retailer keeps its own stock status and update timestamp', () => {
  assert.match(catalogue, /stockStatus: offer\.stockStatus/);
  assert.match(catalogue, /stockUpdatedAt: offer\.lastScrapedAt/);
});
check('comparison prefers fresh offers over stale cheaper offers', () => {
  assert.match(offerRanking, /aStale - bStale/);
  assert.match(candidateShortlist, /stale\(a\) - stale\(b\)/);
});
check('builder uses the retailer ID from the selected offer without guessing a store', () => {
  assert.match(builder, /retailerId: component\.storeLinks\[0\]\?\.retailerId/);
  assert.doesNotMatch(builder, /\?\? 'elbadr'/);
});
check('saving a build rejects zero, placeholder, and invalid component prices', () => {
  assert.match(buildService, /isValidComponentPrice\(component\)/);
  assert.match(buildService, /priceIsStale: component\.priceIsStale \?\? true/);
});
check('component cards show four distinct stock states', () => {
  for (const state of ['in_stock', 'limited', 'out_of_stock', 'stockUnknown']) assert.ok(card.includes(state));
  assert.match(card, /compatibilityStatus === 'review'/);
});
check('retailer comparison only labels a confirmed in-stock offer as buy', () => {
  assert.match(comparison, /offer\.stockStatus === 'in_stock' \? t\('retail\.buy'\) : t\('retail\.visit'\)/);
  assert.match(modal, /offer\.stockStatus === 'in_stock' \? t\('retail\.buy'\) : t\('retail\.visit'\)/);
  assert.match(comparePage, /offer\.stockStatus === 'in_stock'/);
});
check('Smart Builder budget slider is bounded but manual entry remains unrestricted', () => {
  assert.match(wizard, /type="text"[\s\S]*?onChange=\{\(event\) => setBudgetInput\(event\.target\.value\.replace\(\/\[\^0-9\]\/g, ''\)\)\}/);
  assert.match(wizard, /type="range"[\s\S]*?min=\{10_000\}[\s\S]*?max=\{1_000_000\}/);
  assert.match(wizard, /Math\.min\(1_000_000, Math\.max\(10_000/);
});
check('AI catalogue shortlist includes low-cost, high-performance and best-value candidates', () => {
  assert.match(candidateShortlist, /affordable/);
  assert.match(candidateShortlist, /performance/);
  assert.match(candidateShortlist, /value/);
  assert.match(aiTools, /selectBudgetBalancedCandidates\(await this\.catalogue\(category\), budget, perCategory\)/);
  assert.match(aiTools, /selectBudgetBalancedCandidates\([\s\S]*?12/);
});
check('Backend proxy allows the Gemini 3.8 quality-tier model', () => {
  assert.ok(proxy.includes('gemini-3\\.8-flash'));
  assert.match(agent, /model: 'quality'/);
});
check('Smart Builder preserves parallel tool results before finalisation', () => {
  assert.match(agent, /contents\.push\(\{\s*role:\s*'user',\s*parts:\s*responseParts\s*\}\)/s);
  assert.match(agent, /allowedFunctionNames:[\s\S]*?finalize_build/);
});
check('stale or undated retailer stock is converted to unknown across all feeds', () => {
  assert.match(freshness, /STOCK_STATUS_MAX_AGE_MS = 48 \* 60 \* 60 \* 1000/);
  assert.match(aggregator, /getFreshStockStatus\(product\.stockStatus, feed\.capturedAt\)/);
  assert.match(aggregator, /getFreshStockStatus\(product\.stockStatus, capturedAt\)/);
  assert.match(aggregator, /getFreshStockStatus\(row\.stock_status\s*\?\?\s*[\'\"]unknown[\'\"],\s*row\.last_scraped_at\)/);
});
check('legacy saved builds do not invent an in-stock status', () => {
  assert.match(buildService, /stockStatus: 'unknown'/);
});
check('schema.org missing or unfamiliar availability is not marked in stock', () => {
  assert.match(scraper, /parseSchemaOrgStockStatus\(offers\?\.availability\)/);
  assert.match(scraper, /if \(!normalized\)\s*return 'unknown'/);
  assert.match(scraper, /return 'unknown';\s*\}/);
});
check('price savings require confirmed in-stock offers from multiple retailers', () => {
  assert.match(aggregator, /distinctBuyableRetailers > 1 \? Math\.max\(0, dearest - cheapest\) : 0/);
  assert.match(search, /const pool = inStock/);
  assert.match(search, /distinctRetailers > 1/);
});

const failed = checks.filter((item) => !item.ok);
console.log(`\nBuilder release contract: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
