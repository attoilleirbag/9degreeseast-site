// Weekly Fuel Weather update for 9 Degrees East.
// Fetches public market data, checks it, and rewrites ONLY the data block in site/fuel-weather.html.
// If a source fails or looks wrong, that fuel keeps its previous numbers and the page still works.
// Run: EIA_API_KEY=xxxx node scripts/update-weather.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = new URL('../site/fuel-weather.html', import.meta.url);
const KEY = process.env.EIA_API_KEY || '';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KEEP = 6; // months shown per fuel
const log = [];

const html = readFileSync(PAGE, 'utf8');
const m = html.match(/\/\*DATA:START\*\/([\s\S]*?)\/\*DATA:END\*\//);
if (!m) throw new Error('Data markers not found in fuel-weather.html');
const W = JSON.parse(m[1]);
const fuel = (id) => W.fuels.find((f) => f.id === id);

const label = (ym) => { const [y, mo] = ym.split('-'); return `${MONTHS[+mo - 1]} ${y}`; };
const thisMonth = new Date().toISOString().slice(0, 7);

async function get(url, type = 'text') {
  const r = await fetch(url, { headers: { 'User-Agent': '9degreeseast.com fuel-weather (weekly)' } });
  if (!r.ok) throw new Error(`${r.status} ${url.split('?')[0]}`);
  return type === 'json' ? r.json() : r.text();
}

// Average daily values into complete calendar months (the current month is left out until it ends).
function monthly(rows) {
  const by = {};
  for (const { period, value } of rows) {
    const v = parseFloat(value); if (!isFinite(v)) continue;
    const ym = period.slice(0, 7); if (ym >= thisMonth) continue;
    (by[ym] ||= []).push(v);
  }
  return Object.keys(by).sort().slice(-KEEP).map((ym) => ({ ym, v: by[ym].reduce((a, b) => a + b, 0) / by[ym].length }));
}

function setSeries(f, pts, digits, range) {
  if (pts.length < 3) throw new Error(`only ${pts.length} months`);
  for (const p of pts) if (!(p.v > range[0] && p.v < range[1])) throw new Error(`value ${p.v} outside ${range}`);
  f.months = pts.map((p) => label(p.ym));
  f.series = pts.map((p) => +p.v.toFixed(digits));
  delete f.note;
}

// ---- U.S. EIA (free key): jet fuel, diesel, Henry Hub ----
async function eia(route, series) {
  if (!KEY) throw new Error('no EIA_API_KEY set');
  const q = new URLSearchParams({ api_key: KEY, frequency: 'daily', 'data[0]': 'value', 'facets[series][]': series, 'sort[0][column]': 'period', 'sort[0][direction]': 'desc', length: '240' });
  const j = await get(`https://api.eia.gov/v2/${route}/data/?${q}`, 'json');
  return monthly(j?.response?.data || []);
}

const jobs = {
  saf: async () => setSeries(fuel('saf'), await eia('petroleum/pri/spt', 'EER_EPJK_PF4_RGC_DPG'), 3, [0.5, 15]),
  rd: async () => setSeries(fuel('rd'), await eia('petroleum/pri/spt', 'EER_EPD2DXL0_PF4_Y35NY_DPG'), 3, [0.5, 15]),
  rng: async () => setSeries(fuel('rng'), await eia('natural-gas/pri/fut', 'RNGWHHD'), 2, [0.3, 40]),

  // ---- Ember (CC-BY 4.0): German wholesale electricity, monthly ----
  efuels: async () => {
    const csv = await get('https://files.ember-energy.org/public-downloads/price/outputs/european_wholesale_electricity_price_data_monthly.csv');
    const lines = csv.trim().split(/\r?\n/);
    const head = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase());
    const ci = head.findIndex((h) => h.includes('country') && !h.includes('code'));
    const di = head.findIndex((h) => h.includes('date') || h.includes('month'));
    const pi = head.findIndex((h) => h.includes('price'));
    if (ci < 0 || di < 0 || pi < 0) throw new Error('unexpected CSV columns: ' + head.join('|'));
    const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.replace(/"/g, '').trim()))
      .filter((c) => c[ci] === 'Germany').map((c) => ({ period: c[di], value: c[pi] }));
    const pts = rows.map((r) => ({ ym: r.period.slice(0, 7), v: parseFloat(r.value) }))
      .filter((p) => isFinite(p.v) && p.ym < thisMonth).sort((a, b) => (a.ym < b.ym ? -1 : 1)).slice(-KEEP);
    const f = fuel('efuels');
    setSeries(f, pts, 1, [-200, 1500]);
    f.source = 'Ember, European wholesale electricity prices (CC-BY 4.0)';
    f.url = 'https://ember-energy.org/data/european-wholesale-electricity-price-data';
  },

  // ---- Methanex posted prices (public page): compare with last stored posting ----
  methanol: async () => {
    const page = await get('https://www.methanex.com/about-methanol/pricing/');
    const text = page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&euro;/g, '€').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
    const find = (after, re) => { const i = text.search(after); if (i < 0) return null; const mm = text.slice(i, i + 400).match(re); return mm ? parseFloat(mm[1].replace(/,/g, '')) : null; };
    const now = {
      'Europe': find(/Europe/i, /(?:€|EUR|Euro)\s*([\d,]{3,6})/i),
      'North America': find(/North America|U\.?S\.? Gulf/i, /(?:\$|USD)\s*([\d.]+)\s*\/?\s*gal/i),
      'Asia Pacific': find(/Asia Pacific|Asian Posted/i, /(?:\$|USD)\s*([\d,]{3,5})/i),
      'China': find(/China/i, /(?:\$|USD)\s*([\d,]{3,5})/i)
    };
    const f = fuel('methanol'); let changed = 0;
    for (const g of f.regions) {
      const v = now[g.r]; const ok = v && (g.r === 'North America' ? v > 0.3 && v < 15 : v > 100 && v < 3000);
      if (!ok) { log.push(`methanol ${g.r}: could not read a price, kept previous`); continue; }
      if (g.now && Math.abs(v - g.now) / g.now > 0.4) { log.push(`methanol ${g.r}: read ${v}, more than 40% from ${g.now}, kept previous`); continue; }
      if (v !== g.now) { g.prev = g.now; g.now = v; changed++; }
      g.price = g.r === 'Europe' ? `€${v} /t` : g.r === 'North America' ? `$${v.toFixed(2)} /gal` : `$${v} /t`;
    }
    f.source = `Methanex posted contract prices, ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
    if (!changed) log.push('methanol: no new postings this week');
  }
};

let ok = 0;
for (const [id, job] of Object.entries(jobs)) {
  try { await job(); ok++; log.push(`${id}: updated`); }
  catch (e) { log.push(`${id}: kept previous data (${e.message})`); }
}
if (ok) W.updated = new Date().toISOString().slice(0, 10);

const out = html.replace(m[0], '/*DATA:START*/' + JSON.stringify(W, null, 2) + '/*DATA:END*/');
if (out !== html) writeFileSync(PAGE, out);
console.log(log.join('\n'));
console.log(out !== html ? 'Page updated.' : 'No changes.');
