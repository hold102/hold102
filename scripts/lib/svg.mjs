// Shared SVG primitives: themes, embedded font, frames, text helpers.
import { readFileSync } from 'node:fs';

const font = w => readFileSync(new URL(`../fonts/jbm-${w}.woff2`, import.meta.url)).toString('base64');
const F400 = font(400), F700 = font(700);

export const MONO = `'JBM', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
export const SERIF = `Georgia, 'Times New Roman', serif`;

// Dark = amber-on-black market terminal. Light = salmon financial paper.
export const THEMES = {
  dark: {
    name: 'dark', panel: '#0B0E13', bar: '#131922', tile: '#10151C', border: '#26303B', grid: '#1B232D',
    text: '#E9E4D8', muted: '#808A96', faint: '#3A4450', accent: '#FFB627', accentDim: '#7A5A1E', onAccent: '#0B0E13',
    up: '#3DDC84', down: '#FF5C5C', info: '#5CC8FF', display: MONO, nameCase: 'upper', cursor: true,
    palette: ['#FFB627', '#5CC8FF', '#3DDC84', '#FF6B8B', '#B794F6', '#808A96'],
    tags: { HACKATHON: '#FFB627', LIVE: '#3DDC84', BUILDING: '#5CC8FF', ML: '#B794F6', MOBILE: '#FF6B8B', ANDROID: '#FF6B8B', TEAM: '#B794F6' },
  },
  light: {
    name: 'light', panel: '#FFF4EA', bar: '#F8E6D6', tile: '#FCEADB', border: '#E3CDBA', grid: '#EFDDCC',
    text: '#211B17', muted: '#76685D', faint: '#CDB8A5', accent: '#9B1C46', accentDim: '#D9A3B4', onAccent: '#FFF4EA',
    up: '#0A7D3E', down: '#C0392B', info: '#0D7680', display: SERIF, nameCase: 'title', cursor: false,
    palette: ['#9B1C46', '#0D7680', '#0A7D3E', '#D9822B', '#5B4B8A', '#8C7B6E'],
    tags: { HACKATHON: '#9B1C46', LIVE: '#0A7D3E', BUILDING: '#0D7680', ML: '#5B4B8A', MOBILE: '#B5541C', ANDROID: '#B5541C', TEAM: '#5B4B8A' },
  },
};

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Width of monospace text (JetBrains Mono advance = 0.6em). */
export const tw = (s, size) => String(s).length * size * 0.6;
export const r1 = n => Math.round(n * 10) / 10;

export function doc({ w, h, title, desc, body, css = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>
@font-face{font-family:'JBM';font-weight:400;src:url(data:font/woff2;base64,${F400}) format('woff2')}
@font-face{font-family:'JBM';font-weight:700;src:url(data:font/woff2;base64,${F700}) format('woff2')}
text{font-family:${MONO}}
.b{font-weight:700}
@keyframes blink{50%{opacity:0}}
@keyframes pulse{50%{opacity:.25}}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.cursor{animation:blink 1.1s steps(1) infinite}
.pulse{animation:pulse 1.6s ease-in-out infinite}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${body}
</svg>
`;
}

/** Rounded panel with an optional terminal title bar. */
export function frame(t, w, h, { title, right, bar = true } = {}) {
  let s = `<clipPath id="clip"><rect width="${w}" height="${h}" rx="8"/></clipPath>
<g clip-path="url(#clip)"><rect width="${w}" height="${h}" fill="${t.panel}"/>`;
  if (bar) s += `<rect width="${w}" height="30" fill="${t.bar}"/><line x1="0" y1="30.5" x2="${w}" y2="30.5" stroke="${t.border}"/>`;
  s += `</g><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="7.5" fill="none" stroke="${t.border}"/>`;
  if (title) s += `${tri(16, 15, 5, t.accent)}<text x="28" y="19.5" font-size="12" class="b" fill="${t.accent}" letter-spacing=".6">${esc(title)}</text>`;
  if (right) s += `<text x="${w - 16}" y="19.5" font-size="10.5" fill="${t.muted}" text-anchor="end" letter-spacing=".4">${esc(right)}</text>`;
  return s;
}

/** Right-pointing triangle (the ▸ prompt), drawn as a path so it never depends on font glyphs. */
export const tri = (x, cy, s, fill) => `<path d="M${x} ${cy - s} L${x + s * 1.2} ${cy} L${x} ${cy + s} Z" fill="${fill}"/>`;
/** Up/down market arrow. */
export const arrow = (x, cy, up, fill, s = 4) => up
  ? `<path d="M${x} ${cy + s * .8} L${x + s} ${cy - s * .8} L${x + 2 * s} ${cy + s * .8} Z" fill="${fill}"/>`
  : `<path d="M${x} ${cy - s * .8} L${x + s} ${cy + s * .8} L${x + 2 * s} ${cy - s * .8} Z" fill="${fill}"/>`;

/** Greedy word wrap for monospace text. */
export function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length <= maxChars) line = (line + ' ' + w).trim();
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

export const fmtDate = (iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' }).toUpperCase();
