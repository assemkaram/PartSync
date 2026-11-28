import { createClient } from 'npm:@supabase/supabase-js@2';
import { isSupabaseApiKeyAuthorized } from '../../../lib/supabaseKeyAuth.js';
import { RETAILERS, isAllowed, pageUrl } from './parsers.js';
const USER_AGENT = 'NexusPCBuilderBot/1.0 (+https://nexus-pc-builder.example/bot)';
const REQUEST_DELAY_MS = 2000;
const MAX_RUNTIME_MS = 240_000;
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
            redirect: 'follow',
            signal: controller.signal,
        });
        return { status: response.status, body: await response.text(), finalUrl: response.url };
    }
    catch {
        return { status: 0, body: '', finalUrl: url };
    }
    finally {
        clearTimeout(timer);
    }
}

function tokens(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
const STOPWORDS = new Set([
    'the',
    'and',
    'with',
    'for',
    'gaming',
    'edition',
    'new',
    'original',
    'lhr',
    'graphics',
    'card',
    'processor',
    'tray',
    'box',
    'retail',
    'gt',
    'series',
    'super',
    'ti',
    'xt',
    'xtx',
    'oc',
    'mb',
    'gb',
    'khz',
    'mhz',
    'core',
    'thread',
    'threads',
    'desktop',
    'unlocked',
    'mpk',
    'ddr4',
    'ddr5',
    'ddr6',
    'gddr6',
    'gddr7',
    'rgb',
    'argb',
    'white',
    'black',
    'fan',
    'fans',
    'كارت',
    'شاشة',
    'معالج',
    'ذاكرة',
    'مزود',
    'طاقة',
    'اصلية',
    'جديد',
]);
const modelTokens = (name) => tokens(name).filter((t) => /\d/.test(t));
export function scoreMatch(productName, catalogueName) {
    const productTokens = new Set(tokens(productName));
    const catalogueTokens = tokens(catalogueName);
    if (!catalogueTokens.length)
        return { score: 0, coverage: 0, modelMatch: false };
    let covered = 0;
    for (const token of catalogueTokens)
        if (productTokens.has(token))
            covered += 1;
    const coverage = covered / catalogueTokens.length;
    const productModels = new Set(modelTokens(productName));
    const catalogueModels = modelTokens(catalogueName);
    const modelMatch = catalogueModels.every((m) => productModels.has(m));
    const variant = catalogueModels.some((m) => [...productModels].some((p) => p !== m && p.startsWith(m)));
    const valid = modelMatch && !variant;
    return {
        score: Number((valid ? coverage : coverage * 0.3).toFixed(3)),
        coverage: Number(coverage.toFixed(3)),
        modelMatch: valid,
    };
}

export function matchComponent(product, catalogue) {
    let best = null;
    for (const entry of catalogue) {
        if (entry.category !== product.category)
            continue;
        const { score } = scoreMatch(product.name, entry.name);
        if (!best || score > best.confidence)
            best = { id: entry.id, confidence: score };
    }

    return best && best.confidence >= 0.5 ? best : null;
}

async function syncRetailer(supabase, retailer, catalogue) {
    const stats = { pages: 0, seen: 0, upserted: 0, matched: 0 };
    const failures = [];
    const started = Date.now();
    const origin = new URL(retailer.home).origin;
    const robots = await fetchText(`${origin}/robots.txt`);
    if (robots.status === 200) {
        for (const target of retailer.targets) {
            if (!isAllowed(robots.body, new URL(target.url).pathname)) {
                failures.push(`robots.txt disallows ${target.url}`);
            }
        }
        if (failures.length === retailer.targets.length) {
            return { stats, status: 'blocked', error: failures.join('; ') };
        }
    }
    const byExternalId = new Map();
    for (const target of retailer.targets) {
        if (Date.now() - started > MAX_RUNTIME_MS) {
            failures.push('runtime budget exhausted');
            break;
        }
        if (failures.some((f) => f.includes(target.url)))
            continue;

        const pageCount = Math.max(1, target.pages ?? 1);
        for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
            if (Date.now() - started > MAX_RUNTIME_MS) {
                failures.push('runtime budget exhausted');
                break;
            }
            const page = await fetchText(pageUrl(target, pageNo));
            stats.pages += 1;
            if (page.status !== 200 || !page.body) {
                if (pageNo === 1)
                    failures.push(`${target.url} → HTTP ${page.status || 'error'}`);
                break;
            }
            let products = [];
            try {
                products = retailer.parse(page.body, page.finalUrl);
            }
            catch (error) {
                if (pageNo === 1)
                    failures.push(`${target.url} → parse: ${error.message}`);
                break;
            }
            if (products.length === 0 && pageNo > 1)
                break;
            for (const product of products) {
                const match = matchComponent(product, catalogue);
                byExternalId.set(product.externalId, {
                    ...product,
                    matchedId: match?.id ?? null,
                    confidence: match ? Number(match.confidence.toFixed(3)) : null,
                });
            }
            await sleep(REQUEST_DELAY_MS);
        }
    }
    const rows = [...byExternalId.values()];
    stats.seen = rows.length;
    if (rows.length > 0) {

        const payload = rows.map((row) => ({
            retailer_id: row.retailerId,
            external_id: row.externalId,
            name: row.name.slice(0, 400),
            category: row.category,
            price_egp: row.priceEgp,
            original_price_egp: row.originalPriceEgp,
            currency: 'EGP',
            stock_status: row.stockStatus,
            product_url: row.productUrl,
            image_url: row.imageUrl,
            specs: row.specs,
            matched_component_id: row.matchedId,
            match_confidence: row.confidence,
            last_scraped_at: new Date().toISOString(),
        }));
        const { error } = await supabase
            .from('retailer_products')
            .upsert(payload, { onConflict: 'retailer_id,external_id' });
        if (error) {
            return { stats, status: 'failed', error: `upsert failed: ${error.message}` };
        }
        stats.upserted = payload.length;
        stats.matched = rows.filter((r) => r.matchedId).length;
    }
    const status = rows.length === 0 ? 'blocked' : failures.length > 0 ? 'partial' : 'ok';
    return {
        stats,
        status,
        error: failures.length ? failures.join('; ').slice(0, 500) : null,
    };
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    let managedSecretKey = '';
    try {
        const secretKeyMap = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
        managedSecretKey = typeof secretKeyMap.default === 'string' ? secretKeyMap.default : '';
    } catch {
        managedSecretKey = '';
    }
    const secretKey = managedSecretKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !secretKey) {
        return new Response(JSON.stringify({ error: 'Supabase env is not configured.' }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
    if (!isSupabaseApiKeyAuthorized(request, secretKey)) {
        return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
            status: 401,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
    let mode = 'all';
    try {
        const body = (await request.json());
        if (body?.mode)
            mode = body.mode;
    }
    catch {
    }
    const supabase = createClient(supabaseUrl, secretKey, {
        auth: { persistSession: false },
    });
    const { data: components, error: catalogueError } = await supabase
        .from('components')
        .select('id, name, category')
        .eq('is_active', true);
    if (catalogueError) {
        return new Response(JSON.stringify({ error: `catalogue read failed: ${catalogueError.message}` }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
    const catalogue = (components ?? []);
    const targets = RETAILERS.filter((r) => mode === 'all' || r.id === mode);
    const results = [];
    for (const retailer of targets) {
        const { data: runRow } = await supabase
            .from('retailer_sync_runs')
            .insert({ retailer_id: retailer.id, status: 'running' })
            .select('id')
            .single();
        const startedAt = new Date().toISOString();
        let outcome;
        try {
            outcome = await syncRetailer(supabase, retailer, catalogue);
        }
        catch (error) {
            outcome = {
                stats: { pages: 0, seen: 0, upserted: 0, matched: 0 },
                status: 'failed',
                error: error.message,
            };
        }
        if (runRow?.id) {
            await supabase
                .from('retailer_sync_runs')
                .update({
                status: outcome.status,
                finished_at: new Date().toISOString(),
                pages_fetched: outcome.stats.pages,
                products_seen: outcome.stats.seen,
                products_upserted: outcome.stats.upserted,
                products_matched: outcome.stats.matched,
                error: outcome.error,
            })
                .eq('id', runRow.id);
        }
        results.push({
            retailer: retailer.id,
            status: outcome.status,
            startedAt,
            ...outcome.stats,
            error: outcome.error,
        });
    }
    return new Response(JSON.stringify({ ok: true, results }, null, 2), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });
});
