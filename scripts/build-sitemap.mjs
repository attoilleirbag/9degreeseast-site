// Writes site/sitemap.xml from the pages in site/. Runs on every deploy, after the Journal build,
// so new Journal articles are listed automatically. Pages marked noindex (and the 404 page) are left out.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const BASE = 'https://9degreeseast.com/';
const urls = readdirSync(site)
  .filter((f) => f.endsWith('.html') && f !== '404.html')
  .filter((f) => !/<meta name="robots" content="[^"]*noindex/.test(readFileSync(join(site, f), 'utf8').slice(0, 4000)))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)))
  .map((f) => `  <url><loc>${BASE}${f === 'index.html' ? '' : f.replace(/\.html$/, '')}</loc><lastmod>${statSync(join(site, f)).mtime.toISOString().slice(0, 10)}</lastmod></url>`);
writeFileSync(join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Sitemap: ${urls.length} pages`);
