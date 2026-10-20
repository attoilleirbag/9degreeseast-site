// Weekly trade-press headlines for the Market conditions page.
// Reads public RSS feeds from trade publications, keeps headlines about the five fuels, and rewrites
// ONLY the data block in site/market-conditions.html. Headlines and links only: no article text is copied.
// No API key needed. A feed that fails is skipped; if every feed fails, the page keeps last week's list.
// Run: node scripts/update-news.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = new URL('../site/market-conditions.html', import.meta.url);
const KEEP = 24;      // headlines shown
const MAX_AGE = 120;  // days; older headlines drop off

const FEEDS = [
  { outlet: 'Manifold Times', url: 'https://www.manifoldtimes.com/category/bunker-fuel/methanol/feed/' },
  { outlet: 'Manifold Times', url: 'https://www.manifoldtimes.com/category/bunker-fuel/biofuel/feed/' },
  { outlet: 'Offshore Energy', url: 'https://www.offshore-energy.biz/feed/' },
  { outlet: 'Biofuels Digest', url: 'https://www.biofuelsdigest.com/feed/' },
  { outlet: 'U.S. EIA', url: 'https://www.eia.gov/rss/todayinenergy.xml' },
];

// Which fuel a headline is about. First match wins, so the most specific come first.
const FUELS = [
  ['efuels', /\b(e-?fuels?|e-?methanol|e-?SAF|e-?kerosene|e-?gasoline|e-?diesel|power-to-(liquids?|x)|PtL|synthetic fuels?|green hydrogen)\b/i],
  ['methanol', /\bmethanol\b/i],
  ['saf', /\b(SAF|sustainable aviation fuels?|aviation biofuels?|bio-?jet|HEFA|ReFuelEU)\b/i],
  ['rd', /\b(renewable diesel|HVO|hydrotreated vegetable oil|biodiesel|FAME|B\d{2,3})\b/i],
  ['rng', /\b(RNG|renewable natural gas|bio-?methane|biogas|bio-?LNG|LBM|bio-?CNG)\b/i],
];

const text = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&#0?38;|&amp;/g, '&').replace(/&#8217;|&#039;|&#39;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘')
  .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|&quot;/g, '"').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (block, name) => { const r = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return r ? r[1] : ''; };

const html = readFileSync(PAGE, 'utf8');
const m = html.match(/\/\*NEWS:START\*\/([\s\S]*?)\/\*NEWS:END\*\//);
if (!m) throw new Error('News markers not found in market-conditions.html');
const N = JSON.parse(m[1]);

const found = [], log = [];
let worked = 0;
for (const f of FEEDS) {
  try {
    const r = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 9degreeseast.com weekly headlines)' }, signal: AbortSignal.timeout(25000) });
    const xml = r.ok ? await r.text() : '';
    if (!/<rss[\s>]/.test(xml)) throw new Error('not a feed (HTTP ' + r.status + ')');
    worked++;
    let kept = 0;
    for (const [, b] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const title = text(tag(b, 'title')), url = text(tag(b, 'link')), d = new Date(text(tag(b, 'pubDate')));
      if (!title || !/^https?:\/\//.test(url) || isNaN(d)) continue;
      // Match on the headline; if it names no fuel, check the opening of the standfirst
      const hit = FUELS.find(([, re]) => re.test(title)) || FUELS.find(([, re]) => re.test(text(tag(b, 'description')).slice(0, 280)));
      if (!hit) continue;
      found.push({ fuel: hit[0], title, url, outlet: f.outlet, date: d.toISOString().slice(0, 10) });
      kept++;
    }
    log.push(`${f.outlet}: ${kept} relevant`);
  } catch (e) { log.push(`${f.outlet}: skipped (${e.message})`); }
}

if (!worked) { console.log(log.join('\n') + '\nNo feeds reachable. Page unchanged.'); process.exit(0); }

const cutoff = new Date(Date.now() - MAX_AGE * 864e5).toISOString().slice(0, 10);
const seen = new Set(), norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
N.items = [...found, ...N.items]
  .filter((i) => i.date >= cutoff)
  .filter((i) => { const k = i.url + '|' + norm(i.title); const k2 = norm(i.title); if (seen.has(i.url) || seen.has(k2)) return false; seen.add(i.url); seen.add(k2); return !!k; })
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, KEEP);
N.updated = new Date().toISOString().slice(0, 10);

const out = html.replace(m[0], '/*NEWS:START*/' + JSON.stringify(N, null, 1) + '/*NEWS:END*/');
if (out !== html) writeFileSync(PAGE, out);
console.log(log.join('\n'));
console.log(`${N.items.length} headlines on the page.`);
