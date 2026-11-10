// Records an audio narration for each 9DE Journal article (content/journal/*.md -> site/media/audio/<slug>.mp3).
// Runs in GitHub Actions when an article is published or changed. An article is only re-recorded when its
// text, the voice or the reading style changes, so normal runs cost nothing. The key comes from the
// OPENAI_API_KEY repository secret and is never printed.
//
// To change provider later (OpenAI retires this speech service on 6 January 2027), replace speak() below:
// it takes a piece of text and returns MP3 bytes. Nothing else needs to change.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'content', 'journal');
const OUT = join(ROOT, 'site', 'media', 'audio');
const KEY = process.env.OPENAI_API_KEY || '';
const DRY = process.argv.includes('--dry'); // show what would be read, record nothing

// ---- Voice settings: chosen by ear on 10 November 2026 ("British Fable") ----
const MODEL = 'gpt-4o-mini-tts';
const VOICE = 'fable';
const STYLE = 'You are narrating a thoughtful essay about energy for a professional audience. Speak in British English with a natural southern English (Received Pronunciation) accent. Calm, clear and unhurried, like a BBC Radio 4 documentary narrator. Do not sound American.';
// How to say terms the voice might stumble on. Left side: as written. Right side: as it should be spoken.
const SAY = [
  [/\bCO2\b|CO₂/g, 'C O two'],
  [/\bH2\b|H₂/g, 'hydrogen'],
  [/\beFuels?\b/g, (m) => 'e-fuel' + (m.endsWith('s') ? 's' : '')],
  [/&/g, ' and '],
  [/%/g, ' percent']
];
const CHUNK = 3000; // characters per request, split at paragraph breaks

const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

function parse(file) {
  const raw = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const m = raw.match(/^~~~\s*\n([\s\S]*?)\n~~~\s*\n?([\s\S]*)$/);
  if (!m) throw new Error('no front matter');
  const fm = m[1].trim();
  const data = JSON.parse(fm.startsWith('{') ? fm : '{' + fm + '}');
  data.body = m[2];
  return data;
}

// The article as it should be read aloud: no images, footnote numbers, links or formatting marks.
export function narration(p) {
  const lines = String(p.body || '').replace(/\r/g, '').split('\n');
  const paras = []; let buf = [];
  const flush = () => { if (buf.length) { paras.push(buf.join(' ')); buf = []; } };
  for (let l of lines) {
    if (/^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(l) || /^:::/.test(l) || /^\s*\\\s*$/.test(l) || /^(\*{3,}|-{3,}|_{3,})\s*$/.test(l)) { flush(); continue; }
    if (!l.trim()) { flush(); continue; }
    const heading = l.match(/^#{1,4}\s+(.*)$/);
    if (heading) { flush(); paras.push(heading[1].replace(/[.:]?\s*$/, '.')); continue; }
    l = l.replace(/^>\s?/, '').replace(/^\s*([-*+]|\d+[.)])\s+/, '');
    buf.push(l.trim());
  }
  flush();
  const clean = (s) => {
    s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // images out, link text kept
    s = s.replace(/\\?\[\d{1,3}\\?\]/g, '');                                               // footnote numbers
    s = s.replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, '$1').replace(/[*_`~]/g, '');            // formatting marks
    for (const [from, to] of SAY) s = s.replace(from, to);
    return s.replace(/\s+/g, ' ').trim();
  };
  const intro = [p.title + '.', p.series ? `${p.part ? 'Part ' + p.part + ' of ' : 'From '}the series, ${p.series}.` : '', `By ${p.author || 'Tom Fox'}.`].filter(Boolean).join(' ');
  return [clean(intro), ...paras.map(clean).filter(Boolean)];
}

export function chunks(paras, max = CHUNK) {
  const out = []; let cur = '';
  for (const para of paras) {
    const pieces = para.length > max ? para.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) || [para] : [para];
    for (const piece of pieces) {
      if (cur && cur.length + piece.length + 2 > max) { out.push(cur.trim()); cur = ''; }
      cur += (cur ? (pieces.length > 1 ? ' ' : '\n\n') : '') + piece.trim();
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function speak(text, attempt = 1) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: STYLE, response_format: 'mp3' }),
    signal: AbortSignal.timeout(300000)
  });
  if (r.ok) return [Buffer.from(await r.arrayBuffer())];
  const msg = (await r.text()).slice(0, 300).replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***');
  if (r.status === 400 && text.length > 600) { // too long for one request: read it in two halves
    const mid = text.lastIndexOf('. ', Math.floor(text.length / 2)) + 1 || Math.floor(text.length / 2);
    return [...await speak(text.slice(0, mid).trim()), ...await speak(text.slice(mid).trim())];
  }
  if ((r.status === 429 || r.status >= 500) && attempt < 4) { await new Promise((ok) => setTimeout(ok, attempt * 15000)); return speak(text, attempt + 1); }
  throw new Error(`HTTP ${r.status} ${msg}`);
}

// Join the pieces into one smaller file (64 kbps mono is plenty for speech). Falls back to a plain join without ffmpeg.
function join64(parts, outFile) {
  const tmp = join(OUT, '.tmp'); mkdirSync(tmp, { recursive: true });
  try {
    const list = parts.map((b, i) => { const f = join(tmp, `p${i}.mp3`); writeFileSync(f, b); return `file '${f.replace(/'/g, "'\\''")}'`; });
    writeFileSync(join(tmp, 'list.txt'), list.join('\n'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-ac', '1', '-ar', '24000', '-b:a', '64k', outFile]);
    const secs = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]).toString());
    return Math.round(secs);
  } catch (e) {
    const all = Buffer.concat(parts); writeFileSync(outFile, all);
    return Math.round(all.length * 8 / 128000); // the service returns 128 kbps
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

const files = existsSync(SRC) ? readdirSync(SRC).filter((f) => f.endsWith('.md') && f !== 'README.md') : [];
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
let made = 0, failed = 0;
for (const f of files) {
  let p; try { p = parse(join(SRC, f)); } catch (e) { console.log(`skipped ${f}: ${e.message}`); continue; }
  if (p.draft || !p.title) continue;
  const slug = p.slug ? slugify(p.slug) : slugify(f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  const parts = chunks(narration(p));
  const hash = createHash('sha256').update(JSON.stringify([MODEL, VOICE, STYLE, parts])).digest('hex').slice(0, 12);
  const meta = join(OUT, slug + '.json'), mp3 = join(OUT, slug + '.mp3');
  const have = existsSync(meta) && existsSync(mp3) ? JSON.parse(readFileSync(meta, 'utf8')) : null;
  const chars = parts.reduce((n, c) => n + c.length, 0);
  if (have && have.hash === hash) { console.log(`${slug}: up to date`); continue; }
  if (DRY) { console.log(`${slug}: would record ${chars} characters in ${parts.length} piece(s)\n--- start ---\n${parts[0].slice(0, 500)}…\n--- end ---\n…${parts[parts.length - 1].slice(-300)}\n`); continue; }
  if (!KEY) { console.log(`${slug}: not recorded, the OPENAI_API_KEY secret is missing`); failed++; continue; }
  try {
    const audio = [];
    for (const [i, c] of parts.entries()) { audio.push(...await speak(c)); console.log(`${slug}: piece ${i + 1} of ${parts.length} recorded`); }
    const seconds = join64(audio, mp3);
    writeFileSync(meta, JSON.stringify({ hash, seconds, voice: VOICE, model: MODEL, characters: chars, recorded: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
    console.log(`${slug}: recorded, ${Math.round(seconds / 60)} min`); made++;
  } catch (e) { console.log(`${slug}: failed, ${e.message}`); failed++; }
}
console.log(`Journal audio: ${made} recorded, ${failed} failed.`);
if (failed && !made) process.exitCode = 1;
