// Builds the 9DE Journal articles that Tom writes in the editor at /admin.
// Reads content/journal/*.md (JSON front matter between ~~~ lines, then Markdown),
// writes one page per article (site/journal-<slug>.html) and the list the Journal page reads (site/journal-posts.json).
// No dependencies: runs on Netlify before each deploy.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'content', 'journal');
const OUT = join(ROOT, 'site');
const SRC_DIR = process.argv[2] || SRC;
const OUT_DIR = process.argv[3] || OUT;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const nice = d => { const t = new Date(d); return isNaN(t) ? '' : t.getUTCDate() + ' ' + MONTHS[t.getUTCMonth()] + ' ' + t.getUTCFullYear(); };

// --- Small Markdown converter: headings, paragraphs, lists, quotes, images, links, bold, italic, code, rules ---
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, src, cap) => '<img src="' + src + '" alt="' + alt + '" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, h) => '<a href="' + h + '"' + (/^https?:/.test(h) && !/9degreeseast\.com/.test(h) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + t + '</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>').replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/ {2,}\n|\\\n/g, '<br>');
  s = s.replace(/\\?\[(\d{1,3})\\?\](?!\()/g, '<sup class="fn"><a href="#note-$1" id="ref-$1" aria-label="Note $1">$1</a></sup>');
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, '$1'); // the editor escapes some characters with a backslash
  return s;
}
export function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const out = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim() || /^\s*\\\s*$/.test(l)) { i++; continue; } // skip blank lines and the editor's stray "\" line breaks
    let m;
    if ((m = l.match(/^:::size\s+(\d{1,2})\s*$/))) { const sz = Math.max(8, Math.min(48, +m[1])), buf = []; i++; while (i < lines.length && !/^:::\s*$/.test(lines[i])) buf.push(lines[i++]); i++; out.push('<div class="fs" style="font-size:' + sz + 'px">' + md(buf.join('\n')) + '</div>'); continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { const n = Math.min(4, Math.max(2, m[1].length)); out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); i++; continue; }
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(esc(lines[i++])); i++; out.push('<pre><code>' + buf.join('\n') + '</code></pre>'); continue; }
    if (/^>\s?/.test(l)) { const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + md(buf.join('\n')) + '</blockquote>'); continue; }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d/.test(l), items = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) { let t = lines[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, ''); while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) t += ' ' + lines[i++].trim(); items.push('<li>' + inline(t) + '</li>'); }
      out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>')); continue;
    }
    if ((m = l.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/))) { out.push('<figure><img src="' + esc(m[2]) + '" alt="' + esc(m[1]) + '" loading="lazy">' + (m[3] ? '<figcaption>' + esc(m[3]) + '</figcaption>' : '') + '</figure>'); i++; continue; }
    const buf = [];
    // An image on a line of its own always ends the paragraph, so it becomes a full-width figure with its caption
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|```|\s*([-*+]|\d+[.)])\s+|(\*{3,}|-{3,})\s*$|!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)\s*$)/.test(lines[i])) buf.push(lines[i++]);
    out.push('<p>' + inline(buf.join('\n').replace(/\s*\\\s*$/, '')) + '</p>');
  }
  return out.join('\n');
}

function parse(file) {
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const m = raw.match(/^~~~\s*\n([\s\S]*?)\n~~~\s*\n?([\s\S]*)$/);
  if (!m) throw new Error('No front matter in ' + file);
  // The editor saves the front matter as JSON without its outer braces; accept both forms
  const fm = m[1].trim();
  const data = JSON.parse(fm.startsWith('{') ? fm : '{' + fm + '}');
  data.body = m[2];
  return data;
}

// Reading time, as on news sites: words in the article at about 230 words a minute, never less than 1.
export function readMinutes(body) {
  const words = String(body || '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\]\([^)]*\)/g, ' ').replace(/[#>*_`~\[\]\\]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

function notesHtml(notes) {
  const list = (notes || []).map(n => typeof n === 'string' ? n : (n && n.note) || '').filter(n => n.trim());
  if (!list.length) return '';
  return '<section class="notes" aria-label="Notes"><h2>Notes</h2><ol>' + list.map((n, i) => '<li id="note-' + (i + 1) + '">' + inline(n).replace(/<sup class="fn">.*?>(\d+)<\/a><\/sup>/g, '[$1]') + ' <a class="up" href="#ref-' + (i + 1) + '" aria-label="Back to the text">↑</a></li>').join('') + '</ol></section>';
}

function page(p, series) {
  const inSeries = p.series ? series.filter(s => String(s.series).trim().toLowerCase() === String(p.series).trim().toLowerCase()) : [];
  const idx = inSeries.findIndex(s => s.slug === p.slug);
  const prev = idx > 0 ? inSeries[idx - 1] : null, next = idx >= 0 && idx < inSeries.length - 1 ? inSeries[idx + 1] : null;
  const label = p.series ? esc(p.series) + (p.part ? ' · Part ' + esc(p.part) + (p.parts ? ' of ' + esc(p.parts) : '') : '') : 'The 9DE Journal';
  const desc = esc(p.summary || '');
  const url = 'https://9degreeseast.com/journal-' + p.slug;
  const nav = (prev || next) ? '<nav class="series" aria-label="More in this series">' +
    (prev ? '<a class="glass" href="journal-' + prev.slug + '.html"><small>← Part ' + esc(prev.part || '') + '</small><span class="serif">' + esc(prev.title) + '</span></a>' : '<span></span>') +
    (next ? '<a class="glass nx" href="journal-' + next.slug + '.html"><small>Part ' + esc(next.part || '') + ' →</small><span class="serif">' + esc(next.title) + '</span></a>' : '<span></span>') + '</nav>' : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} | The 9DE Journal</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="9 Degrees East">
<meta property="og:image" content="https://9degreeseast.com${p.cover ? esc(p.cover) : '/og.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#061527">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600&display=swap">
<link rel="stylesheet" href="site.css">
<link rel="stylesheet" href="journal-article.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.summary || '', datePublished: p.date, author: { '@type': 'Person', name: p.author || 'Tom Fox' }, publisher: { '@type': 'Organization', name: '9 Degrees East' }, mainEntityOfPage: url }).replace(/</g, '\\u003c')}</script>
<script src="nav.js" defer></script>
${p.audio ? `<script>(function () { var a = document.getElementById('narration'); if (!a || !('mediaSession' in navigator)) return;
  a.addEventListener('play', function () { try { navigator.mediaSession.metadata = new MediaMetadata({ title: a.dataset.title, artist: '9 Degrees East', album: a.dataset.series, artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }); } catch (e) {} });
})();</script>` : ''}
<style id="cls-fix">#site-nav{min-height:82px}@media (max-width:420px){#site-nav{min-height:74px}}</style>
</head>
<body>
  <div id="site-nav"><noscript><nav class="ns-nav" aria-label="Main"><a href="./">9 Degrees East</a><a href="about.html">About</a><a href="our-history.html">Our history</a><a href="purpose.html">Purpose, mission &amp; values</a><a href="how-we-work.html">How we work</a><a href="locations.html">Locations</a><a href="insights.html">Insights</a><a href="journal.html">The 9DE Journal</a><a href="fuel-weather.html">Fuel Weather</a><a href="policy-tracker.html">Policy Tracker</a><a href="market-conditions.html">Market Conditions</a><a href="services.html">Products &amp; Services</a><a href="offtake-strategy.html">Offtake strategy</a><a href="deal-structuring.html">Deal structuring</a><a href="supply-agreements.html">Supply agreements</a><a href="regulatory-advisory.html">Regulations</a><a href="faq.html">FAQ</a><a href="contact.html">Contact</a></nav></noscript></div>
  <main>
    <article class="wrap post">
      <a class="back" href="journal.html">← The 9DE Journal</a>
      <header>
        <p class="k">${label}</p>
        <h1 class="serif">${esc(p.title)}</h1>
        ${p.summary ? '<p class="dek">' + esc(p.summary) + '</p>' : ''}
        <p class="by">${esc(p.author || 'Tom Fox')} · <time datetime="${esc(p.date)}">${nice(p.date)}</time> · ${readMinutes(p.body)} min read</p>
        ${p.audio ? `<div class="listen">
          <p><b>Listen to this article</b> · ${p.audio.minutes} min · Narrated by an AI voice</p>
          <audio id="narration" controls preload="none" src="/media/audio/${p.slug}.mp3?v=${esc(p.audio.hash)}" data-title="${esc(p.title)}" data-series="${esc(p.series || 'The 9DE Journal')}"></audio>
        </div>` : ''}
      </header>
      ${p.cover ? '<figure class="cover"><img src="' + esc(p.cover) + '" alt="' + esc(p.cover_alt || '') + '"></figure>' : ''}
      <div class="body">
${md(p.body)}
      </div>
      ${notesHtml(p.notes)}
      ${nav}
      <p class="end"><a href="journal.html">More from the 9DE Journal →</a> · <a href="contact.html">Talk to us about a project →</a></p>
    </article>
  </main>
  <div id="site-footer"><noscript><footer class="ns-nav ns-foot"><a href="legal-notice.html">Legal notice</a><a href="terms.html">Terms of use</a><a href="privacy.html">Privacy notice</a><a href="cookies.html">Cookies</a><a href="accessibility.html">Accessibility</a><a href="credits.html">Trademarks &amp; credits</a><a href="contact.html">Contact us</a><p>9 Degrees East Limited is registered in England and Wales, company number 11587380.</p></footer></noscript></div>
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "bdb89935402140bd8cbd88633ab1af84"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>
`;
}

export function build(srcDir = SRC_DIR, outDir = OUT_DIR) {
  const files = existsSync(srcDir) ? readdirSync(srcDir).filter(f => f.endsWith('.md') && f !== 'README.md') : [];
  const posts = files.map(f => { let p; try { p = parse(join(srcDir, f)); } catch (e) { console.error('Journal: skipped ' + f + ' (' + e.message + ')'); return null; } p.slug = p.slug ? slugify(p.slug) : slugify(f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')); return p; })
    .filter(p => p && !p.draft && p.title)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  // A recording made by scripts/journal-audio.mjs (site/media/audio/<slug>.mp3 + .json) adds a player to the article
  posts.forEach(p => { try { const dir = join(OUT, 'media', 'audio'); if (existsSync(join(dir, p.slug + '.mp3'))) { const m = JSON.parse(readFileSync(join(dir, p.slug + '.json'), 'utf8')); p.audio = { hash: m.hash, minutes: Math.max(1, Math.round((m.seconds || 0) / 60)) }; } } catch (e) {} });
  const series = posts.filter(p => p.series).slice().sort((a, b) => (+a.part || 0) - (+b.part || 0));
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  posts.forEach(p => writeFileSync(join(outDir, 'journal-' + p.slug + '.html'), page(p, series)));
  const list = posts.map(p => ({ source: 'journal', date: String(p.date).slice(0, 10), title: p.title, summary: p.summary || '', series: p.series || '', part: p.part || '', minutes: readMinutes(p.body), audio: !!p.audio, url: 'journal-' + p.slug + '.html' }));
  writeFileSync(join(outDir, 'journal-posts.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), items: list }, null, 2));
  console.log('Journal: built ' + posts.length + ' article(s)');
  return posts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
