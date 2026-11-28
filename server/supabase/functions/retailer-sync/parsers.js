export const MIN_REAL_PRICE_EGP = 100;

export const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
};
export const BOT_USER_AGENT = 'NexusPCBuilderBot/1.0 (+https://nexus-pc-builder.example/bot)';

export function headersFor(url) {
    try {
        return { ...BROWSER_HEADERS, Referer: `${new URL(url).origin}/` };
    }
    catch {
        return { ...BROWSER_HEADERS };
    }
}

const PATH_CATEGORY_RULES = [
    [
        /(?:^|\/)chassis(?:\/|$)|(?:^|\/)pc[-_]?cases?(?:\/|$)|(?:^|\/)cases?(?:\/|$)/,
        'case',
    ],
    [
        /cpu[-_]?coolers?(?:\/|$)|(?:^|\/)cooling(?:\/|$)|(?:^|\/)coolers?(?:\/|$)|water[-_]?cooling|liquid[-_]?cool(?:ing)?|(?:^|\/)aio(?:\/|$)|(?:^|\/)fans?(?:\/|$)|fans[-_]?coolers(?:\/|$)|heatsinks?(?:\/|$)|air[-_]?cooling/,
        'cooling',
    ],
    [
        /(?:^|\/)graphics?[-_]?cards?(?:\/|$)|(?:^|\/)graphics?(?:\/|$)|(?:^|\/)vga(?:\/|$)|(?:^|\/)gpus?(?:\/|$)|video[-_]?cards?(?:\/|$)/,
        'gpu',
    ],
    [
        /(?:^|\/)processors?(?:\/|$)|(?:^|\/)cpus?(?:\/|$)|cpu[-_]?processor(?:\/|$)|microprocessor(?:\/|$)/,
        'cpu',
    ],
    [/(?:^|\/)motherboards?(?:\/|$)|mainboards?(?:\/|$)/, 'motherboard'],
    [/(?:^|\/)ram(?:\/|$)|desktop[-_]?memory(?:\/|$)|(?:^|\/)memory(?:\/|$)/, 'ram'],
    [
        /(?:^|\/)storage(?:\/|$)|(?:^|\/)ssds?(?:\/|$)|(?:^|\/)hdd(?:\/|$)|hard[-_]?drives?(?:\/|$)|(?:^|\/)nvme(?:\/|$)/,
        'storage',
    ],
    [/power[-_]?suppl(?:y|ies)(?:\/|$)|(?:^|\/)psus?(?:\/|$)/, 'psu'],
];

export function categoryFromPath(url) {
    if (!url)
        return '';
    let pathname = url;
    try {
        pathname = new URL(url).pathname;
    }
    catch {
        pathname = String(url).split('?')[0] ?? '';
    }
    const segments = pathname.toLowerCase().split('/').filter(Boolean);
    if (segments.length === 0)
        return '';
    const collectionAt = segments.findIndex((segment) => /^product-category$/.test(segment));
    if (collectionAt >= 0) {
        const slug = segments[collectionAt + 1] ?? '';
        for (const [pattern, category] of PATH_CATEGORY_RULES) {
            if (pattern.test(`/${slug}/`))
                return category;
        }
        return '';
    }

    const productAt = segments.findIndex((segment) => /^(product|products|item|items)$/.test(segment));
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index] ?? '';
        if (segments.length > 1 && index === segments.length - 1)
            break;
        if (productAt >= 0 && index > productAt)
            break;
        for (const [pattern, category] of PATH_CATEGORY_RULES) {
            if (pattern.test(`/${segment}/`))
                return category;
        }
    }
    return '';
}

export function resolveCategory(productUrl, pageUrl, name) {
    return categoryFromPath(productUrl) || categoryFromPath(pageUrl) || classifyByName(name, '');
}

export function pageUrl(target, n) {
    const url = new URL(target.url);

    if (/\/product-category\//.test(target.url)) {
        if (n <= 1)
            return target.url;
        const base = target.url.replace(/\/?$/, '/');
        return `${base}page/${n}/`;
    }
    if (n <= 1 && !target.limit)
        return target.url;
    if (target.limit)
        url.searchParams.set('limit', String(target.limit));
    if (n > 1)
        url.searchParams.set('page', String(n));
    return url.toString();
}
const EGP = /(?:EGP|ج\.ظ…|LE)\b/i;

export function parseEgpPrice(raw) {
    if (!raw)
        return null;

    const normalised = raw
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/\u066C/g, ',')
        .replace(/\u066B/g, '.');
    const match = /(\d[\d.,]*)/.exec(normalised);
    if (!match)
        return null;
    let digits = match[1];
    if (/,\d{1,2}$/.test(digits))
        digits = digits.replace(/\./g, '').replace(',', '.');
    else
        digits = digits.replace(/,/g, '');
    const value = Number.parseFloat(digits);
    return Number.isFinite(value) && value > 0 ? value : null;
}
function decodeEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&times;/g, 'أ—')
        .replace(/\s+/g, ' ')
        .trim();
}

export function cleanProductName(raw) {
    return stripTags(raw)
        .replace(/^(?:buy\s+online|shop\s+now|buy\s+now|add\s+to\s+cart)\s*[-:|]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function stripTags(html) {
    return decodeEntities(html.replace(/<[^>]+>/g, ' '));
}

function normaliseTags(html) {
    return html.replace(/<[^>]*>/g, (tag) => tag.replace(/\s+/g, ' '));
}

function parseOpenCart(html, pageUrl, retailerId, category) {
    const out = [];
    const origin = new URL(pageUrl).origin;
    const source = normaliseTags(html);
    
    const cards = source.split(/(?=<div[^>]*data-product-id=)/).slice(1);
    for (const card of cards) {
        const idMatch = /data-product-id="(\d+)"/.exec(card);
        const linkMatch = /<div class="name">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(card) ??
            /<h4[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(card);
        const href = linkMatch?.[1];
        if (!href)
            continue;
        const name = cleanProductName(linkMatch[2] ?? '');
        if (!name)
            continue;
        
        const productUrl = cleanProductUrl(href, origin);
        const resolvedCategory = resolveCategory(productUrl, pageUrl, name) || category;
        
        if (!resolvedCategory)
            continue;
        
        const priceNew = /<span class="price-(?:new|normal)">([\s\S]*?)<\/span>/i.exec(card);
        const priceOld = /<span class="price-old">([\s\S]*?)<\/span>/i.exec(card);
        const priceBlock = /<div class="price[^"]*">([\s\S]*?)<\/div>/i.exec(card)?.[1] ?? '';

        const originalMatch = priceOld;
        const withoutOld = priceBlock.replace(/<span class="price-old">[\s\S]*?<\/span>/gi, '');
        const price = parseEgpPrice(stripTags(priceNew?.[1] ?? withoutOld));
        if (price === null)
            continue;

        const priceIsPlaceholder = price <= MIN_REAL_PRICE_EGP;
        const image = extractImage(card);
        const stockText = /Stock:\s*([A-Za-z \u0600-\u06FF]+)/i.exec(card)?.[1] ?? '';
        out.push({
            retailerId,
            externalId: idMatch?.[1] ?? href.split('/').filter(Boolean).pop() ?? name.slice(0, 60),
            name,
            category: resolvedCategory,
            priceEgp: price,
            priceIsPlaceholder,
            originalPriceEgp: originalMatch ? parseEgpPrice(stripTags(originalMatch[1] ?? '')) : null,
            stockStatus: /out of stock|نفذ/i.test(stockText)
                ? 'out_of_stock'
                : /in stock|متوفر/i.test(stockText)
                    ? 'in_stock'
                    : 'unknown',
            productUrl,
            imageUrl: cleanImageUrl(image, origin),
            specs: { template: 'opencart', pageCategory: category },
        });
    }
    return out;
}

export function cleanProductUrl(href, origin) {
    const absolute = href.startsWith('http') ? href : origin + href;
    try {
        const url = new URL(absolute);
        for (const key of ['limit', 'page', 'route', 'module', 'sort', 'order'])
            url.searchParams.delete(key);
        url.hash = '';
        return url.toString();
    }
    catch {
        return absolute;
    }
}

export function cleanImageUrl(src, origin) {
    if (!src)
        return null;
    const absolute = src.startsWith('http') ? src : origin + src;
    try {
        return new URL(absolute).toString();
    }
    catch {
        return encodeURI(absolute);
    }
}
export function extractImage(html) {
    const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    for (const tag of tags) {
        const attrs = (name) => new RegExp(`\\b${name}="([^"]+)"`, 'i').exec(tag)?.[1] ??
            new RegExp(`\\b${name}='([^']+)'`, 'i').exec(tag)?.[1] ??
            null;
        const candidates = [attrs('src'), attrs('data-src')];
        const srcset = attrs('data-srcset') ?? attrs('srcset');
        if (srcset) {
            for (const part of srcset.split(',')) {
                const url = part.trim().split(/\s+/)[0];
                if (url)
                    candidates.push(url);
            }
        }
        for (const candidate of candidates) {
            if (!candidate)
                continue;
            if (candidate.startsWith('data:'))
                continue;
            if (/(woocommerce-placeholder|no_image|noimage|placeholder|spacer|blank)\.?/i.test(candidate))
                continue;
            if (/warranty|badge|logo|flag|payment|icon-3/i.test(candidate))
                continue;
            return candidate;
        }
    }
    return null;
}

function parseWooCommerce(html, pageUrl, retailerId, category) {
    const out = [];
    const origin = new URL(pageUrl).origin;
    const source = normaliseTags(html);
    const blocks = source.split(/<div class="product-small col/).slice(1);
    for (const block of blocks) {
        const slugMatch = /href="(https?:\/\/[^"]+\/product\/([^"/]+)\/?)"/.exec(block);
        if (!slugMatch)
            continue;
        const titleMatch = /class="[^"]*woocommerce-loop-product__title[^"]*"[^>]*>\s*(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\//i.exec(block) ?? /<a[^>]+href="[^"]*\/product\/[^"]*"[^>]*>([^<]{6,})<\/a>/i.exec(block);
        const name = cleanProductName(titleMatch?.[1] ?? '');
        if (!name)
            continue;

        const productUrl = cleanProductUrl(slugMatch[1], origin);
        const resolvedCategory = resolveCategory(productUrl, pageUrl, name) || category;
        if (!resolvedCategory)
            continue;

        //   <span class="woocommerce-Price-amount amount"><bdi>12,900&nbsp;<span
        //     class="woocommerce-Price-currencySymbol">EGP</span></bdi></span>
        // On THIS store the AR catalogue returns `<bdi>1</bdi>` because the real price
        // is injected by AJAX after load. A 1 EGP graphics card is never real, so a
        // placeholder price is treated as "no price" and the row is skipped.
        const priceElem = /<span class="woocommerce-Price-amount amount">\s*<bdi>([\s\S]*?)<\/bdi>/i.exec(block);
        const price = parseEgpPrice(stripTags(priceElem?.[1] ?? ''));

        if (price === null || price <= MIN_REAL_PRICE_EGP)
            continue;
        const original = /<del[^>]*>[\s\S]*?<span class="woocommerce-Price-amount amount">\s*<bdi>([\s\S]*?)<\/bdi>/i.exec(block);

        const candidate = extractImage(block);
        const usableImage = candidate;
        out.push({
            retailerId,
            externalId: slugMatch[2] ?? name.slice(0, 60),
            name,
            category: resolvedCategory,
            priceEgp: price,
            originalPriceEgp: original ? parseEgpPrice(stripTags(original[1] ?? '')) : null,
            stockStatus: /out-of-stock|outofstock/.test(block)
                ? 'out_of_stock'
                : /in-stock|instock/.test(block)
                    ? 'in_stock'
                    : 'unknown',
            productUrl,
            imageUrl: cleanImageUrl(usableImage, origin),
            specs: { template: 'woocommerce', pageCategory: category },
        });
    }
    return out;
}

function parseSigma(html, pageUrl) {
    const openCart = parseOpenCart(html, pageUrl, 'sigma', 'gpu');
    if (openCart.length)
        return openCart;
    return parseJsonLd(html, pageUrl, 'sigma', 'gpu');
}

export function parseSchemaOrgStockStatus(value) {
    const normalized = String(value ?? '').toLowerCase().replace(/[^a-z]/g, '');
    if (!normalized)
        return 'unknown';
    if (normalized.includes('outofstock') || normalized.includes('soldout') || normalized.includes('discontinued')) {
        return 'out_of_stock';
    }
    if (normalized.includes('limitedavailability'))
        return 'limited';
    if (normalized.includes('instock') || normalized.includes('onlineonly'))
        return 'in_stock';
    return 'unknown';
}
export function parseJsonLd(html, pageUrl, retailerId, category) {
    const origin = new URL(pageUrl).origin;
    const out = [];
    const source = normaliseTags(html);
    for (const match of source.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
        let parsed;
        try {
            parsed = JSON.parse(match[1] ?? '');
        }
        catch {
            continue;
        }
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        const queue = [...nodes];
        while (queue.length) {
            const node = queue.shift();
            if (!node || typeof node !== 'object')
                continue;
            if (Array.isArray(node['@graph']))
                queue.push(...node['@graph']);
            if (node['@type'] !== 'Product' && Array.isArray(node.itemListElement)) {
                queue.push(...node.itemListElement);
            }
            if (node['@type'] !== 'Product')
                continue;
            const offers = (Array.isArray(node.offers) ? node.offers[0] : node.offers);
            const price = parseEgpPrice(String(offers?.price ?? ''));
            const name = cleanProductName(String(node.name ?? ''));
            const url = String(node.url ?? offers?.url ?? '');
            if (!name || price === null || !url)
                continue;
            const image = Array.isArray(node.image) ? String(node.image[0]) : String(node.image ?? '');
            out.push({
                retailerId,
                externalId: String(node.sku ?? url.split('/').filter(Boolean).pop() ?? name.slice(0, 60)),
                name,
                category,
                priceEgp: price,
                originalPriceEgp: null,
                stockStatus: parseSchemaOrgStockStatus(offers?.availability),
                productUrl: cleanProductUrl(url, origin),
                imageUrl: cleanImageUrl(image, origin),
                specs: { template: 'json-ld' },
            });
        }
    }
    return out;
}

export const RETAILERS = [
    {
        id: 'elbadr',
        name: 'Elbadr Group',
        home: 'https://elbadrgroupeg.store/',

        targets: [

            { category: 'gpu', url: 'https://elbadrgroupeg.store/vga', pages: 45 },
            { category: 'cpu', url: 'https://elbadrgroupeg.store/cpu', pages: 45 },
            { category: 'motherboard', url: 'https://elbadrgroupeg.store/motherboard', pages: 30 },
            { category: 'ram', url: 'https://elbadrgroupeg.store/ram', pages: 25 },
            { category: 'storage', url: 'https://elbadrgroupeg.store/storage', pages: 25 },
            { category: 'psu', url: 'https://elbadrgroupeg.store/power-supply', pages: 20 },
            { category: 'case', url: 'https://elbadrgroupeg.store/cases', pages: 20 },
            { category: 'cooling', url: 'https://elbadrgroupeg.store/cooling', pages: 20 },
        ],
        parse: (html, url) => parseOpenCart(html, url, 'elbadr', categoryOf(url)),
    },
    {
        id: 'elnekhely',
        name: 'Elnekhely Technology',
        home: 'https://www.elnekhelytechnology.com/',

        targets: [
            { category: 'gpu', url: 'https://www.elnekhelytechnology.com/graphics-card', pages: 3, limit: 100 },
            { category: 'cpu', url: 'https://www.elnekhelytechnology.com/processors', pages: 3, limit: 100 },
            { category: 'motherboard', url: 'https://www.elnekhelytechnology.com/motherboards', pages: 3, limit: 100 },
            { category: 'ram', url: 'https://www.elnekhelytechnology.com/ram', pages: 3, limit: 100 },
            { category: 'storage', url: 'https://www.elnekhelytechnology.com/ssd', pages: 2, limit: 100 },
            { category: 'psu', url: 'https://www.elnekhelytechnology.com/power-supply', pages: 2, limit: 100 },
            { category: 'case', url: 'https://www.elnekhelytechnology.com/cases', pages: 2, limit: 100 },
            { category: 'cooling', url: 'https://www.elnekhelytechnology.com/fans-coolers', pages: 2, limit: 100 },
        ],
        parse: (html, url) => parseOpenCart(html, url, 'elnekhely', categoryOf(url)),
    },
    {
        id: 'alfrensia',
        name: 'Alfrensia',
        home: 'https://alfrensia.com/ar/',

        targets: [
            { category: 'gpu', url: 'https://alfrensia.com/product-category/graphics-card/', pages: 12 },
            { category: 'cpu', url: 'https://alfrensia.com/product-category/processor/', pages: 8 },
            { category: 'motherboard', url: 'https://alfrensia.com/product-category/motherboard/', pages: 8 },
            { category: 'ram', url: 'https://alfrensia.com/product-category/ram/', pages: 6 },
            { category: 'storage', url: 'https://alfrensia.com/product-category/storage/', pages: 6 },
            { category: 'psu', url: 'https://alfrensia.com/product-category/power-supply/', pages: 6 },
            { category: 'case', url: 'https://alfrensia.com/product-category/cases/', pages: 5 },
            { category: 'cooling', url: 'https://alfrensia.com/product-category/air-liquid-cooling/', pages: 6 },
        ],
        parse: (html, url) => parseWooCommerce(html, url, 'alfrensia', categoryOf(url)),
    },
    {
        id: 'sigma',
        name: 'Sigma Computer',
        home: 'https://sigma-computer.com/en',

        targets: [
            { category: 'gpu', url: 'https://sigma-computer.com/en/category/vga' },
            { category: 'cpu', url: 'https://sigma-computer.com/en/category/processor' },
        ],
        parse: parseSigma,
    },
];
function categoryOf(url) {
    if (/vga|graphic|gpu/i.test(url))
        return 'gpu';
    if (/processor|cpu/i.test(url))
        return 'cpu';
    if (/motherboard|mainboard/i.test(url))
        return 'motherboard';
    if (/memory|ram/i.test(url))
        return 'ram';
    if (/storage|ssd|hdd/i.test(url))
        return 'storage';
    if (/power|psu/i.test(url))
        return 'psu';
    if (/case|chassis/i.test(url))
        return 'case';
    if (/cool|fan/i.test(url))
        return 'cooling';

    return '';
}

export function classifyByName(name, fallback) {
    const n = name.toLowerCase();

    if (/\b(mouse|keyboard|gamepad|controller|headset|headphone|webcam|speaker|mousemat|mouse pad|hub|adapter|cable|chair|desk)\b/.test(n)) {
        return '';
    }
    if (/\bmonitor\b|\bdisplay\b|\bscreen\b/.test(n))
        return '';

    if (/\b(laptop|notebook|ideapad|thinkpad|legion|loq|victus|nitro|predator|cyborg|katana|thin \d|tuf (?:dash|f16)|vivobook|zenbook|surface|macbook|chromebook)\b/.test(n)) {
        return '';
    }

    if (/\b(thermal (paste|grease|pad|putty|coolant)|coolant|cleaning kit|screwdriver|tweezers?|mouse ?pad)\b/.test(n)) {
        return '';
    }

    if (/\b(flash drive|usb (?:flash )?drive|thumb drive|pen drive|memory card|sd card)\b/.test(n))
        return '';

    if (/\b(fan tray|replacement fan|pre-?installed fan|spare part)\b/.test(n))
        return '';
    
    const chipset = /\b[bxz]\d{3}[a-z]{0,2}\b/.test(n) && !/\b\d{3,4}\s?w\b/.test(n);
    const isBoard = /(motherboard|mainboard|chipset)/.test(n) || chipset;
    const isMountingHardware = /\b(anti-?bend|contact frame|mounting kit|bracket|fastener|frame)\b/.test(n);
    const namesCpu = /\b(cpu|processor|ryzen|ryzen\d|core i[3579]|core ultra|threadripper|xeon)\b/.test(n);
    if (isBoard)
        return 'motherboard';
    if (namesCpu &&
        !isMountingHardware &&
        !/\bcooler\b|\bheatsink\b|\bfan\b|\baio\b|\bliquid\b|\bthermal interface\b/.test(n)) {
        return 'cpu';
    }

    if (/\b(psu|power supply|80\s?plus|80plus|fully modular|semi modular|atx 3\.?[01])\b/.test(n)) {
        return 'psu';
    }

    const wattage = /\b([3-9]\d{2}|1[0-9]{3}|2000)\s?w\b/.test(n);
    const isThermalOrCase = /\b(cooler|heatsink|fan|aio|liquid|case|tower|chassis|tdp)\b/.test(n);
    if (wattage && !isThermalOrCase)
        return 'psu';
    
    if (/\b(case|chassis)\b/.test(n))
        return 'case';
    if (/\btower\b/.test(n) && /(mid[- ]?tower|full[- ]?tower|mini[- ]?tower|super tower|pc tower|pc case)/.test(n)) {
        return 'case';
    }
    
    if (/\b(lian li|nzxt h[0-9]|fractal design|phanteks|montech|darkflash|deepcool (?:matrexx|ch|ck)|thermaltake (?:versa|core|view)|corsair \d{3}[td]|o11|h5 flow|h7 flow|h9 flow)\b/.test(n)) {
        return 'case';
    }

    if (/(motherboard|mainboard|b650|x670|z790|b760|a620|chipset|pcie x16|\batx\b|\bmatx\b|\bitx board\b)/.test(n)) {
        return 'motherboard';
    }
    if (/\b(gpu|graphics card|geforce|radeon|rtx|gtx|arc a\d|vga)\b/.test(n))
        return 'gpu';
    if (/\b(nvme|ssd|hdd|hard drive|solid state)\b/.test(n))
        return 'storage';
    if (/\b(ddr[345]|dimm|memory kit)\b/.test(n))
        return 'ram';
    if (/\b(cooler|aio|liquid cooling|heatsink|fan)\b/.test(n))
        return 'cooling';

    return fallback;
}

export function isAllowed(robotsTxt, path) {
    const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim());
    let inStarGroup = false;
    const disallow = [];
    for (const line of lines) {
        const [rawKey, ...rest] = line.split(':');
        const key = rawKey?.trim().toLowerCase();
        const value = rest.join(':').trim();
        if (key === 'user-agent')
            inStarGroup = value === '*';
        else if (key === 'disallow' && inStarGroup && value)
            disallow.push(value);
    }
    return !disallow.some((rule) => path.startsWith(rule));
}
export { EGP };
