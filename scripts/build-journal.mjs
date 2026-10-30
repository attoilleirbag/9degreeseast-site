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
  return s;
}
export function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const out = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
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
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|```|\s*([-*+]|\d+[.)])\s+|(\*{3,}|-{3,})\s*$)/.test(lines[i])) buf.push(lines[i++]);
    out.push('<p>' + inline(buf.join('\n')) + '</p>');
  }
  return out.join('\n');
}

function parse(file) {
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const m = raw.match(/^~~~\s*\n([\s\S]*?)\n~~~\s*\n?([\s\S]*)$/);
  if (!m) throw new Error('No front matter in ' + file);
  const data = JSON.parse(m[1]);
  data.body = m[2];
  return data;
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
${p.cover ? '<meta property="og:image" content="https://9degreeseast.com' + esc(p.cover) + '">' : ''}
<meta name="theme-color" content="#061527">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600&display=swap">
<link rel="stylesheet" href="journal-article.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.summary || '', datePublished: p.date, author: { '@type': 'Person', name: p.author || 'Tom Fox' }, publisher: { '@type': 'Organization', name: '9 Degrees East' }, mainEntityOfPage: url }).replace(/</g, '\\u003c')}</script>
<script src="nav.js" defer></script>
</head>
<body>
  <div id="site-nav"></div>
  <main>
    <article class="wrap post">
      <a class="back" href="journal.html">← The 9DE Journal</a>
      <header>
        <p class="k">${label}</p>
        <h1 class="serif">${esc(p.title)}</h1>
        ${p.summary ? '<p class="dek">' + esc(p.summary) + '</p>' : ''}
        <p class="by">${esc(p.author || 'Tom Fox')} · <time datetime="${esc(p.date)}">${nice(p.date)}</time></p>
      </header>
      ${p.cover ? '<figure class="cover"><img src="' + esc(p.cover) + '" alt="' + esc(p.cover_alt || '') + '"></figure>' : ''}
      <div class="body">
${md(p.body)}
      </div>
      ${nav}
      <p class="end"><a href="journal.html">More from the 9DE Journal →</a> · <a href="contact.html">Talk to us about a project →</a></p>
    </article>
  </main>
  <div id="site-footer"></div>
</body>
</html>
`;
}

export function build(srcDir = SRC_DIR, outDir = OUT_DIR) {
  const files = existsSync(srcDir) ? readdirSync(srcDir).filter(f => f.endsWith('.md') && f !== 'README.md') : [];
  const posts = files.map(f => { const p = parse(join(srcDir, f)); p.slug = p.slug ? slugify(p.slug) : slugify(f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')); return p; })
    .filter(p => !p.draft && p.title)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const series = posts.filter(p => p.series).slice().sort((a, b) => (+a.part || 0) - (+b.part || 0));
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  posts.forEach(p => writeFileSync(join(outDir, 'journal-' + p.slug + '.html'), page(p, series)));
  const list = posts.map(p => ({ source: 'journal', date: String(p.date).slice(0, 10), title: p.title, summary: p.summary || '', series: p.series || '', part: p.part || '', url: 'journal-' + p.slug + '.html' }));
  writeFileSync(join(outDir, 'journal-posts.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), items: list }, null, 2));
  console.log('Journal: built ' + posts.length + ' article(s)');
  return posts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
