#!/usr/bin/env node
// TEAM P02 | STEP P02-065 | Review this file, then remove this marker only.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isPlaceholderPrice, isPriceStale, isValidComponentPrice, rankOffers } from '../../client/src/lib/offerRanking.js';
import { calculateBuildTotals } from '../../client/src/lib/buildTotals.js';
import { selectBudgetBalancedCandidates } from '../../client/src/lib/scoring/candidateShortlist.js';
import { valueScore } from '../../client/src/lib/scoring/buildScore.js';

const snapshot = JSON.parse(await readFile(new URL('../../client/public/data/retailer_snapshot.json', import.meta.url), 'utf8'));
const buildSummary = await readFile(new URL('../../client/src/components/domain/BuildSummaryPanel.jsx', import.meta.url), 'utf8');
const prebuilt = await readFile(new URL('../../client/src/lib/prebuiltFromCatalogue.js', import.meta.url), 'utf8');
const buildService = await readFile(new URL('../../client/src/services/buildsService.js', import.meta.url), 'utf8');
const fallbackBuild = await readFile(new URL('../../client/src/lib/scoring/fallbackBuild.js', import.meta.url), 'utf8');
const searchService = await readFile(new URL('../../client/src/services/searchService.js', import.meta.url), 'utf8');
const buildDetail = await readFile(new URL('../../client/src/pages/BuildDetail.jsx', import.meta.url), 'utf8');
const doctorPage = await readFile(new URL('../../client/src/pages/BuildDoctor.jsx', import.meta.url), 'utf8');
const fail = (message) => { throw new Error(message); };

assert.equal(isValidComponentPrice({ price: 1, currency: 'EGP' }), false, '1 EGP is a placeholder, not a component price');
assert.equal(isValidComponentPrice({ price: 99 }), false, 'currency-less values are treated as EGP');
assert.equal(isValidComponentPrice({ price: 100, currency: 'EGP' }), true);
assert.equal(isValidComponentPrice({ price: 20_000, currency: 'USD' }), false, 'foreign currency must never be formatted or budgeted as EGP');
assert.equal(isValidComponentPrice({ price: Number.NaN, currency: 'EGP' }), false);
console.log('PASS shared price validation (5 checks)');

const totals = calculateBuildTotals([
  { category: 'cpu', price: 12_000, currency: 'EGP', powerDrawWatts: 65 },
  { category: 'gpu', price: 1, currency: 'EGP', powerDrawWatts: 250 },
]);
assert.equal(totals.totalPrice, 12_000);
assert.equal(totals.totalWatts, 315, 'power draw still includes parts with invalid prices');
assert.equal(totals.selectedCount, 2);
assert.equal(totals.priceComplete, false);
assert.equal(totals.itemCount, 1);
assert.equal(totals.invalidPriceCount, 1);
const mixed = calculateBuildTotals([
  { category: 'cpu', price: 12_000, currency: 'EGP' },
  { category: 'gpu', price: 20_000, currency: 'USD' },
]);
assert.equal(mixed.mixedCurrencies, false);
assert.equal(mixed.totalPrice, 12_000, 'only the valid EGP subtotal is retained internally');
assert.equal(mixed.invalidPriceCount, 1);
assert.equal(mixed.priceComplete, false, 'a partial subtotal must never be presented as a build total');
console.log('PASS build totals exclude placeholders and mixed currencies (6 checks)');

const shortlist = selectBudgetBalancedCandidates([
  { id: 'bad', price: 1, currency: 'EGP', performanceScore: 100, stockStatus: 'in_stock' },
  { id: 'good', price: 15_000, currency: 'EGP', performanceScore: 70, stockStatus: 'in_stock' },
], 30_000);
assert.deepEqual(shortlist.map((item) => item.id), ['good']);
console.log('PASS AI shortlist filters placeholder prices');

const ranked = rankOffers([
  { retailerId: 'stale-cheap', priceEgp: 17_000, stockStatus: 'in_stock', priceIsStale: true },
  { retailerId: 'fresh', priceEgp: 18_000, stockStatus: 'in_stock', priceIsStale: false },
]);
assert.equal(ranked[0].retailerId, 'fresh');
console.log('PASS fresh retailer quote ranks above stale cheaper quote');

const fixedNow = Date.parse('2026-11-18T12:00:00.000Z');
assert.equal(isPriceStale(snapshot.capturedAt, fixedNow), true, 'the bundled price snapshot must show a freshness warning');
const invalidSnapshotRows = snapshot.products.filter((row) => isPlaceholderPrice({ priceEgp: row.priceEgp }));
assert.ok(invalidSnapshotRows.length > 0, 'the current snapshot should have invalid listing rows filtered at runtime');
console.log(`PASS snapshot freshness + placeholder filtering (${invalidSnapshotRows.length} invalid rows are excluded)`);

assert.match(buildSummary, /isValidComponentPrice\(component\)/);
assert.match(buildSummary, /priceUnavailable/);
assert.match(buildSummary, /stalePrices/);
assert.match(buildSummary, /priceUnavailable \? <span/);
assert.match(buildSummary, /unavailable=\{priceUnavailable\}/);
assert.match(prebuilt, /calculateBuildTotals\(items\)/);
assert.match(fallbackBuild, /calculateBuildTotals\(chosen\)/);
assert.match(buildService, /calculateBuildTotals\(lineItems/);
assert.match(buildService, /isValidComponentPrice\(component\)/);
assert.match(await readFile(new URL('../../client/src/lib/buildTotals.js', import.meta.url), 'utf8'), /totalWatts \+=/);
assert.match(await readFile(new URL('../../client/src/pages/AIAdvisor.jsx', import.meta.url), 'utf8'), /priceComplete: buildTotals\.priceComplete/);
const doctor = await readFile(new URL('../../client/src/services/buildDoctor.js', import.meta.url), 'utf8');
const doctorPrompt = await readFile(new URL('../../client/src/services/prompts/buildDoctor.js', import.meta.url), 'utf8');
assert.match(doctor, /if \(!base\.priceComplete\)\s*return \[\]/);
assert.match(doctor, /priceComplete,\s*invalidPriceCount/);
assert.match(doctorPrompt, /do not calculate a partial total/);
const smartBuilder = await readFile(new URL('../../client/src/pages/SmartBuilder.jsx', import.meta.url), 'utf8');
assert.match(smartBuilder, /totals\.itemCount !== components\.length/);
assert.match(searchService, /isPlaceholderPrice\(listing\)/);
// Saved builds must be re-priced from their historical line items, never from
// a stale cached total, and the share/detail route must render those rows.
assert.match(buildService, /mapBuildRowsWithPriceHealth/);
assert.match(buildService, /price_at_add, component_key, component_snapshot/);
assert.ok(buildService.includes('const priceComplete = missingItems === 0 && mapped.length === (items ?? []).length && totals.priceComplete')); 
assert.ok(buildService.includes('totalPowerWatts: missingItems === 0 ? totals.totalWatts : null'));
assert.match(buildDetail, /getBuildBySlug\(slug\)/);
assert.match(buildDetail, /savedBuild\?\.priceComplete === true/);
assert.match(buildDetail, /calculateBuildTotals\(components\)/);
assert.match(buildDetail, /item\.priceAtAdd/);
assert.match(buildDetail, /missingItems > 0/);
assert.match(buildDetail, /isSavedBuild \? savedBuild\.totalPowerWatts \?\? null : null/);
assert.match(doctorPage, /doctor\.missingParts/);
console.log('PASS saved-build lookup, historical price validation, missing-part handling, and power totals');
console.log('PASS shared totals, save, prebuilt, fallback, and search use the price policy');

assert.equal(valueScore(90, 100_000, 'EGP'), 100);
assert.equal(valueScore(90, 200_000, 'EGP'), 50);
console.log('PASS EGP build value score uses EGP reference curve');

console.log('\n✓ Price integrity checks passed');
