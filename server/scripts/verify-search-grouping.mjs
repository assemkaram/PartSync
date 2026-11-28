import { readFileSync } from 'node:fs';
import { skuKey, groupLabel, partnerKey } from '../../client/src/lib/skuGrouping.js';
import { extractBrand, sameBrand } from '../../client/src/lib/brand.js';
import { isPlaceholderPrice, rankOffers } from '../../client/src/lib/offerRanking.js';

const snapshot = JSON.parse(readFileSync('client/public/data/retailer_snapshot.json', 'utf8'));

function groupListings(listings) {
  const buckets = new Map();
  const usableListings = listings.filter((listing) => !isPlaceholderPrice(listing));
  for (const listing of usableListings) {
    const key = skuKey(listing.name);
    if (!key) {
      buckets.set(`listing:${listing.id}`, [listing]);
      continue;
    }
    const brand = (extractBrand(listing.name) ?? 'unknown').toLowerCase();
    const base = `sku:${listing.category ?? 'misc'}:${brand}:${key}`;
    const bucket = buckets.get(base) ?? [];
    const sameRetailerCount = bucket.filter((existing) => existing.retailerId === listing.retailerId).length;
    const brandCompatible = bucket.every((existing) => sameBrand(existing.name, listing.name));
    if (sameRetailerCount === 0 && brandCompatible) {
      bucket.push(listing);
      buckets.set(base, bucket);
      continue;
    }
    const partner = partnerKey(listing.name) || listing.id;
    const soloId = `${base}|${partner}`;
    const solo = buckets.get(soloId) ?? [];
    solo.push(listing);
    buckets.set(soloId, solo);
  }
  return [...buckets.entries()].flatMap(([id, offers]) => {
    const ranked = rankOffers(offers);
    const best = ranked[0];
    if (!best) return [];
    const inStock = ranked.filter((offer) => offer.stockStatus === 'in_stock');
    const distinctRetailers = new Set(inStock.map((offer) => offer.retailerId)).size;
    const cheapest = inStock[0]?.priceEgp ?? best.priceEgp;
    const dearest = inStock[inStock.length - 1]?.priceEgp ?? best.priceEgp;
    return [{
      id,
      name: groupLabel(ranked.map((offer) => offer.name)),
      category: ranked[0].category,
      offers: ranked,
      best,
      retailerIds: [...new Set(ranked.map((offer) => offer.retailerId))],
      savingsEgp: inStock.length > 0 && distinctRetailers > 1 ? Math.max(0, Math.round(dearest - cheapest)) : 0,
    }];
  });
}

const all = groupListings(snapshot.products);

let fails = 0;
const invalidGroups = all.filter((group) => isPlaceholderPrice(group.best) || group.offers.some(isPlaceholderPrice));
if (invalidGroups.length) {
  fails += 1;
  console.error(`FAIL  ${invalidGroups.length} search groups still contain an invalid placeholder price`);
} else {
  console.log('PASS  invalid/placeholder prices are excluded before search grouping');
}

console.log(`listings ${snapshot.products.length} → groups ${all.length}\n`);

const multi = all
  .filter((g) => g.retailerIds.length > 1)
  .sort((a, b) => b.retailerIds.length - a.retailerIds.length);
console.log(`Cross-retailer groups: ${multi.length}`);
const DISPLAY_LIMIT = 12;
for (const g of multi.slice(0, DISPLAY_LIMIT)) {
  console.log(
    `  ${g.retailerIds.length}× ${g.category.padEnd(11)} ${String(Math.round(g.best.priceEgp)).padStart(7)} EGP  save ${String(g.savingsEgp).padStart(6)}  ${g.best.name.slice(0, 46)}`,
  );
  for (const o of g.offers) {
    console.log(
      `       ${o.retailerId.padEnd(10)} ${String(Math.round(o.priceEgp)).padStart(7)}  ${o.name.slice(0, 58)}`,
    );
  }
}
if (multi.length > DISPLAY_LIMIT) console.log(`  ... ${multi.length - DISPLAY_LIMIT} additional groups checked (not printed).`);

console.log('\nQuery checks:');
const QUERIES = ['rtx 5060', 'rtx 5070', 'ryzen', 'core ultra', 'rx 9060'];
for (const q of QUERIES) {
  const terms = q.toLowerCase().split(/\s+/);
  const hits = all.filter((g) => terms.every((t) => g.name.toLowerCase().includes(t)));
  const retailers = [...new Set(hits.flatMap((g) => g.retailerIds))];
  console.log(`  "${q}" → ${hits.length} groups, retailers: ${retailers.join(', ') || 'none'}`);
}

console.log('\nSKU separation checks:');
const PAIRS = [
  ['GIGABYTE GeForce RTX 5060 Ti 8GB', 'GIGABYTE GeForce RTX 5060 Ti 16GB', 'memory size'],
  ['ASUS GeForce RTX 5070', 'ASUS GeForce RTX 5070 Ti', 'Ti variant'],
  ['GeForce RTX 5080', 'GeForce RTX 5080 SUPER', 'Super variant'],
  ['AMD Ryzen 5 5600X', 'AMD Ryzen 5 5600', 'different CPU model'],
  ['Radeon RX 9060 XT', 'Radeon RX 9070 XT', 'different GPU model'],
];
for (const [a, b, why] of PAIRS) {
  const same = skuKey(a) === skuKey(b);
  if (same) fails += 1;
  console.log(`  ${same ? 'FAIL' : 'PASS'}  ${why.padEnd(18)} ${skuKey(a)} vs ${skuKey(b)}`);
}

console.log('\nMerge checks (must be equal):');
const MERGES = [
  ['ASUS TUF Gaming GeForce RTX 5070 Ti 16GB', 'PNY GeForce RTX 5070 Ti 16GB', 'board partners'],
  ['AMD Ryzen 7 7800X3D MPK', 'AMD Ryzen 7 7800X3D Tray Processor', 'MPK vs Tray'],
  ['MSI Ventus GeForce RTX 5060 8GB', 'PNY GeForce RTX 5060 8GB', 'board partners'],
];
for (const [a, b, why] of MERGES) {
  const same = skuKey(a) === skuKey(b);
  if (!same) fails += 1;
  console.log(`  ${same ? 'PASS' : 'FAIL'}  ${why.padEnd(18)} ${skuKey(a)} vs ${skuKey(b)}`);
}

console.log(fails ? `\n✗ ${fails} grouping failure(s)` : '\n✓ grouping rules verified');
process.exit(fails ? 1 : 0);
