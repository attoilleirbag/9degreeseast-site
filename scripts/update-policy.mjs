// Weekly Policy Tracker update for 9 Degrees East.
// Finds new policy items for low-carbon fuels and adds them to site/policy-tracker.html automatically.
// The workflow publishes them straight away; anything off-topic can be deleted from the data block later.
// Sources that remember what they have already seen keep that memory in scripts/policy-state.json.
// Run: node scripts/update-policy.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PAGE = new URL('../site/policy-tracker.html', import.meta.url);
const STATE = new URL('./policy-state.json', import.meta.url);
const UA = { 'User-Agent': '9degreeseast.com policy-tracker (weekly)' };
const DAY = 864e5;
const today = new Date().toISOString().slice(0, 10);
const since = (days) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
const log = [];

const html = readFileSync(PAGE, 'utf8');
const m = html.match(/\/\*DATA:START\*\/([\s\S]*?)\/\*DATA:END\*\//);
if (!m) throw new Error('Data markers not found in policy-tracker.html');
const P = JSON.parse(m[1]);
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { seen: {} };
const onPage = new Set(P.items.map((i) => i.url));
const found = [];

// Topic words. An item must match at least one to be proposed.
const TOPIC = /sustainable aviation fuel|\bSAF\b|renewable fuel|biofuel|biodiesel|renewable diesel|biomass-based diesel|\bHVO\b|e-?fuel|synthetic fuel|methanol|ammonia|hydrogen|low[- ]carbon fuel|clean fuel|45Z|45V|RTFO|ReFuelEU|FuelEU|RED ?III|renewable energy directive|net-zero framework|greenhouse gas|GHG|carbon intensity|燃料|航空|生物|甲醇|氢|氨|绿色/i;

async function get(url, type = 'text') {
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!r.ok) throw new Error(`${r.status} ${url.split('?')[0]}`);
  return type === 'json' ? r.json() : r.text();
}
const clip = (s = '', n = 260) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s\S*$/, '') + '…' : s; };

function propose(it) {
  if (!it.url || onPage.has(it.url) || found.some((f) => f.url === it.url)) return;
  if (!TOPIC.test(`${it.title} ${it.summary}`)) return;
  found.push({ id: `${it.region.toLowerCase()}-${(it.date || today)}-${found.length}`, ...it });
}

// ---------- US: Federal Register API (free, no key) ----------
const FR_TERMS = ['"sustainable aviation fuel"', '"renewable fuel standard"', '"clean fuel production credit"', '"renewable diesel"', '"low carbon fuel"', '"clean hydrogen production"'];
const FR_TYPES = { RULE: 'Final rule', PRORULE: 'Proposed rule', PRESDOCU: 'Presidential action', NOTICE: 'Notice' };
async function us() {
  for (const term of FR_TERMS) {
    const q = new URLSearchParams({ 'conditions[term]': term, 'conditions[publication_date][gte]': since(14), order: 'newest', per_page: '20' });
    ['title', 'abstract', 'publication_date', 'type', 'html_url', 'agency_names'].forEach((f) => q.append('fields[]', f));
    const j = await get(`https://www.federalregister.gov/api/v1/documents.json?${q}`, 'json');
    for (const d of j.results || []) {
      const agencies = d.agency_names || [];
      if (agencies.some((a) => /Foreign-Trade Zones/i.test(a))) continue; // site-level customs notices, not policy
      propose({ region: 'US', date: d.publication_date, status: FR_TYPES[d.type] || d.type, title: d.title, summary: clip(d.abstract), source: agencies.join(', ') || 'Federal Register', url: d.html_url });
    }
  }
}

// ---------- UK: GOV.UK search API (free, no key) ----------
const UK_TERMS = ['sustainable aviation fuel', 'renewable transport fuel obligation', 'low carbon fuels', 'SAF mandate', 'maritime decarbonisation'];
const UK_FORMATS = /news_story|press_release|policy_paper|guidance|statutory_guidance|consultation|decision|notice|impact_assessment/;
async function uk() {
  for (const term of UK_TERMS) {
    const q = new URLSearchParams({ q: term, order: '-public_timestamp', count: '15', fields: 'title,description,link,public_timestamp,format,organisations' });
    const j = await get(`https://www.gov.uk/api/search.json?${q}`, 'json');
    for (const r of j.results || []) {
      const date = (r.public_timestamp || '').slice(0, 10);
      if (!date || date < since(14) || !UK_FORMATS.test(r.format || '')) continue;
      const org = (r.organisations || []).map((o) => o.title).filter(Boolean).join(', ');
      propose({ region: 'UK', date, status: (r.format || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), title: r.title, summary: clip(r.description), source: org || 'GOV.UK', url: 'https://www.gov.uk' + r.link });
    }
  }
}

// ---------- Link watchers: EU, IMO, China ----------
// These sites have no clean public feed, so we read their news/policy pages and look for NEW links
// whose text matches the topic words. The first run only records what is there (nothing is proposed).
const WATCH = [
  { region: 'EU', name: 'European Commission, transport news', url: 'https://transport.ec.europa.eu/news-events/news_en' },
  { region: 'EU', name: 'European Commission, energy news', url: 'https://energy.ec.europa.eu/news_en' },
  { region: 'IMO', name: 'IMO press briefings', url: 'https://www.imo.org/en/MediaCentre/PressBriefings/Pages/Default.aspx' },
  { region: 'China', name: 'NDRC policy releases (English)', url: 'https://en.ndrc.gov.cn/policies/' },
  { region: 'China', name: 'National Energy Administration notices', url: 'https://www.nea.gov.cn/policy/tz.htm' }
];
function links(page, base) {
  const out = [];
  for (const a of page.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = a[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (text.length < (/[㐀-鿿]/.test(text) ? 8 : 18)) continue; // skip menus and buttons (Chinese headlines are shorter)
    try { out.push({ text, url: new URL(a[1], base).href }); } catch {}
  }
  return out;
}
async function watch(w) {
  const page = await get(w.url);
  const ls = links(page, w.url);
  if (ls.length < 5) throw new Error(`only ${ls.length} links found, page layout may have changed`);
  const first = !state.seen[w.url];
  const seen = new Set(state.seen[w.url] || []);
  let n = 0;
  for (const l of ls) {
    if (seen.has(l.url)) continue;
    seen.add(l.url);
    if (!first) { const before = found.length; propose({ region: w.region, date: today, status: 'Announcement', title: l.text, summary: '', source: w.name, url: l.url }); n += found.length - before; }
  }
  state.seen[w.url] = [...seen].slice(-400);
  return first ? `baseline recorded (${ls.length} links)` : `${n} new`;
}

// ---------- Run everything; one failing source never stops the others ----------
for (const [name, job] of [['US Federal Register', us], ['UK GOV.UK', uk]]) {
  const before = found.length;
  try { await job(); log.push(`${name}: ${found.length - before} new`); }
  catch (e) { log.push(`${name}: skipped (${e.message})`); }
}
for (const w of WATCH) {
  try { log.push(`${w.name}: ${await watch(w)}`); }
  catch (e) { log.push(`${w.name}: skipped (${e.message})`); }
}

// ---------- Translate anything not in English (DeepL API Free, key in the DEEPL_API_KEY secret) ----------
const DEEPL = process.env.DEEPL_API_KEY || '';
const FOREIGN = /[^\x00-\x7F -ɏ‐-…€£]/; // CJK, Cyrillic, Arabic and other non-Latin scripts
const LANGS = { ZH: 'Chinese', JA: 'Japanese', KO: 'Korean', FR: 'French', DE: 'German', ES: 'Spanish', IT: 'Italian', PT: 'Portuguese', NL: 'Dutch', RU: 'Russian' };
const todo = found.filter((f) => FOREIGN.test(f.title + f.summary));
if (todo.length && !DEEPL) log.push(`translation: ${todo.length} item(s) left untranslated (no DEEPL_API_KEY set)`);
if (todo.length && DEEPL) {
  try {
    const texts = todo.flatMap((f) => [f.title, f.summary || ' ']);
    const host = DEEPL.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'; // free keys end in :fx
    const r = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${DEEPL}`, 'Content-Type': 'application/json', ...UA },
      body: JSON.stringify({ text: texts, target_lang: 'EN-GB' })
    });
    if (!r.ok) throw new Error(`${r.status} from DeepL`);
    const out = (await r.json()).translations || [];
    todo.forEach((f, i) => {
      const t = out[i * 2], s = out[i * 2 + 1];
      if (!t || t.detected_source_language === 'EN') return;
      f.original = f.title;
      f.title = t.text;
      if (f.summary && s) f.summary = s.text;
      f.lang = LANGS[t.detected_source_language] || t.detected_source_language;
    });
    log.push(`translation: ${todo.length} item(s) translated`);
  } catch (e) { log.push(`translation: skipped, originals kept (${e.message})`); }
}

if (found.length) {
  P.items = [...found, ...P.items];
  P.updated = today;
  writeFileSync(PAGE, html.replace(m[0], '/*DATA:START*/' + JSON.stringify(P, null, 2) + '/*DATA:END*/'));
}
writeFileSync(STATE, JSON.stringify(state, null, 1));

// A short list for the pull request description.
const body = found.length
  ? found.map((f) => `- **${f.region}** · ${f.date} · [${f.title}](${f.url})`).join('\n')
  : 'Nothing new this week.';
writeFileSync(new URL('../policy-found.md', import.meta.url), body + '\n');
console.log(log.join('\n'));
console.log(`${found.length} draft item(s) proposed.`);
