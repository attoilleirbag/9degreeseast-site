// Weekly Journal update for 9 Degrees East.
// Reads the Substack publication's public RSS feed and adds any new posts to the data block in site/journal.html.
// No API key needed. If the publication has no feed yet (or it can't be reached), nothing changes.
// LinkedIn posts are added by hand: LinkedIn offers no public feed for personal posts.
// Run: node scripts/update-journal.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const PAGE = new URL('../site/journal.html', import.meta.url);
const KEEP = 24; // most recent Substack posts kept on the page
const html = readFileSync(PAGE, 'utf8');
const m = html.match(/\/\*DATA:START\*\/([\s\S]*?)\/\*DATA:END\*\//);
if (!m) throw new Error('Data markers not found in journal.html');
const J = JSON.parse(m[1]);

const base = (J.substack && J.substack.url || '').replace(/\/+$/, '');
if (!base) { console.log('No Substack address set in journal.html. Nothing to do.'); process.exit(0); }

const text = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&#8217;/g, '’').replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
const clip = (s, n = 240) => (s.length > n ? s.slice(0, n - 1).replace(/\s\S*$/, '') + '…' : s);
const tag = (block, name) => { const r = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return r ? r[1] : ''; };

let xml;
try {
  const r = await fetch(base + '/feed', { headers: { 'User-Agent': '9degreeseast.com journal (weekly)' }, signal: AbortSignal.timeout(25000) });
  xml = r.ok ? await r.text() : '';
} catch (e) { xml = ''; }
if (!/<rss[\s>]/.test(xml)) { console.log(`No feed at ${base}/feed yet (no posts published, or the address changed). Nothing to do.`); process.exit(0); }

const pubName = text(tag(tag(xml, 'channel'), 'title'));
const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, b]) => {
  const d = new Date(text(tag(b, 'pubDate')));
  return { source: 'substack', outlet: pubName || 'Substack', date: isNaN(d) ? '' : d.toISOString().slice(0, 10), title: text(tag(b, 'title')), summary: clip(text(tag(b, 'description'))), url: text(tag(b, 'link')) };
}).filter((p) => p.title && p.url);

const known = new Set(J.items.map((i) => i.url).filter(Boolean));
const fresh = posts.filter((p) => !known.has(p.url));
if (pubName && J.substack.name !== pubName) J.substack.name = pubName;
if (!fresh.length) { console.log(`Substack "${pubName}": ${posts.length} post(s) in feed, none new.`); }

const others = J.items.filter((i) => i.source !== 'substack');
const subs = [...fresh, ...J.items.filter((i) => i.source === 'substack')].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, KEEP);
J.items = [...subs, ...others];
if (fresh.length) J.updated = new Date().toISOString().slice(0, 10);

const out = html.replace(m[0], '/*DATA:START*/' + JSON.stringify(J, null, 2) + '/*DATA:END*/');
if (out !== html) { writeFileSync(PAGE, out); console.log(`Added ${fresh.length} new Substack post(s).`); }
