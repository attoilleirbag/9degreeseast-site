// One-off: records the opening of Part 1 in a few candidate voices so we can pick one by ear.
// Writes MP3s and a short log to audio-samples/ (outside site/, so nothing is published). Never prints the key.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const KEY = process.env.OPENAI_API_KEY || '';
const OUT = new URL('../audio-samples/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const raw = readFileSync(new URL('../content/journal/2026-10-29-replacing-something-thermodynamically-beautiful.md', import.meta.url), 'utf8');
const body = raw.replace(/^~~~[\s\S]*?\n~~~\s*\n/, '').replace(/\\?\[\d+\\?\]/g, '').replace(/[*_#>\\]/g, '');
const text = body.split(/\n\s*\n/).filter((p) => p.trim().length > 80).slice(0, 1).join('\n\n').slice(0, 700);
const STYLE = 'You are narrating a thoughtful essay about energy for a professional audience. Speak in British English with a natural southern English (Received Pronunciation) accent. Calm, clear and unhurried, like a BBC Radio 4 documentary narrator. Do not sound American.';
const VOICES = ['ballad', 'fable', 'cedar'];
const log = [`sample text: ${text.length} characters`];
if (!KEY) log.push('OPENAI_API_KEY secret is missing or empty');
for (const voice of KEY ? VOICES : []) {
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, instructions: STYLE, response_format: 'mp3' }),
      signal: AbortSignal.timeout(120000)
    });
    if (!r.ok) { log.push(`${voice}: failed, HTTP ${r.status} ${(await r.text()).slice(0, 300).replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***')}`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(new URL(`british-${voice}.mp3`, OUT), buf);
    log.push(`${voice}: ok, ${Math.round(buf.length / 1024)} KB`);
  } catch (e) { log.push(`${voice}: failed, ${String(e.message).slice(0, 200)}`); }
}
writeFileSync(new URL('log.txt', OUT), log.join('\n') + '\n');
console.log(log.join('\n'));
