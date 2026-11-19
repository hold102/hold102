// One function per dashboard panel. Each returns a complete SVG string for a theme.
import { doc, frame, esc, tw, r1, tri, arrow, wrap, fmtDate } from './svg.mjs';

const W = 840;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const signed = x => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;
const titleCase = s => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());

// ---------------------------------------------------------------- header + ticker tape
export function header(t, cfg, d, m) {
  const H = 236;
  const updated = fmtDate(d.fetchedAt);
  const name = t.nameCase === 'upper' ? cfg.name.toUpperCase() : titleCase(cfg.name);
  const nameSize = t.name === 'dark' ? 54 : 58;
  const since = new Date(d.createdAt).getUTCFullYear();

  // ticker items: [symbol, value, change, up?]
  const items = [
    [`CONTRIB.1Y`, d.year.contributions, m.yoy == null ? null : signed(m.yoy), m.yoy >= 0],
    [`COMMITS.${m.thisYear}`, m.ytdCommits, m.lastYearCommits ? signed((m.ytdCommits - m.lastYearCommits) / m.lastYearCommits) : null, m.ytdCommits >= m.lastYearCommits],
    ...m.langs.slice(0, 5).map(l => [l.symbol, pct(l.share), `${l.repos} REPO${l.repos > 1 ? 'S' : ''}`, null]),
    ['REPOS', d.publicRepos, null], ['HACKATHONS', cfg.hackathons, null],
    ['52W.HIGH', `${m.peakWeek.count}/WK`, null], ['LIFETIME', m.lifetime, null],
    ...cfg.featured.map(f => [f.symbol, f.title.toUpperCase(), f.tag, true]),
  ];
  const parts = []; let x = 0;
  for (const [sym, val, chg, up] of items) {
    let s = `<text x="${r1(x)}" y="0" font-size="12" class="b" fill="${t.text}">${esc(sym)}</text>`;
    x += tw(sym, 12) + 8;
    s += `<text x="${r1(x)}" y="0" font-size="12" fill="${t.accent}">${esc(val)}</text>`;
    x += tw(val, 12) + 8;
    if (chg) {
      const c = up == null ? t.muted : up ? t.up : t.down;
      if (up != null) { s += arrow(r1(x), -4, up, c, 4); x += 12; }
      s += `<text x="${r1(x)}" y="0" font-size="12" fill="${c}">${esc(chg)}</text>`;
      x += tw(chg, 12);
    }
    x += 18;
    s += `<rect x="${r1(x - 2)}" y="-6" width="3" height="3" fill="${t.faint}"/>`;
    x += 18;
    parts.push(s);
  }
  let tape = parts.join(''), cw = x;
  while (cw < W) { tape += `<g transform="translate(${r1(cw)} 0)">${parts.join('')}</g>`; cw += x; }
  const dur = r1(cw / 38);

  const css = `@keyframes tape{from{transform:translateX(0)}to{transform:translateX(-${r1(cw)}px)}}.tape{animation:tape ${dur}s linear infinite}`;
  const right = `${cfg.location} · ${cfg.timezone} · UPDATED ${updated}`;
  const body = `${frame(t, W, H, { bar: false })}
<circle cx="22" cy="20" r="4" fill="${t.up}" class="pulse"/>
<text x="32" y="24" font-size="11" class="b" fill="${t.up}" letter-spacing=".8">LIVE</text>
<text x="74" y="24" font-size="11" class="b" fill="${t.accent}" letter-spacing=".8">${esc(cfg.ticker)} &lt;GO&gt;</text>
<text x="${W - 16}" y="24" font-size="11" fill="${t.muted}" text-anchor="end" letter-spacing=".6">${esc(right)}</text>
<line x1="16" y1="38.5" x2="${W - 16}" y2="38.5" stroke="${t.border}" stroke-dasharray="2 4"/>
<text x="22" y="108" font-size="${nameSize}" font-weight="700" fill="${t.accent}" style="font-family:${t.display}" letter-spacing="${t.name === 'dark' ? 1 : 0}">${esc(name)}</text>
${t.cursor ? `<rect x="${r1(22 + tw(name, nameSize) + 22)}" y="68" width="24" height="44" fill="${t.accent}" class="cursor"/>` : ''}
<text x="24" y="144" font-size="15" fill="${t.text}">${esc(cfg.headline)}</text>
<text x="24" y="168" font-size="12.5" fill="${t.muted}">${esc(cfg.subline)}</text>
<g transform="translate(640 54)">
  <rect width="176" height="118" rx="6" fill="${t.tile}" stroke="${t.border}"/>
  <text x="16" y="24" font-size="10" fill="${t.muted}" letter-spacing="1">ANALYST RATING</text>
  <text x="16" y="70" font-size="38" class="b" fill="${t.up}">${esc(cfg.rating)}</text>
  ${arrow(r1(24 + tw(cfg.rating, 38)), 56, true, t.up, 9)}
  <text x="16" y="100" font-size="10" fill="${t.muted}" letter-spacing="1">COVERAGE SINCE ${since}</text>
</g>
<g clip-path="url(#clip)">
  <rect y="${H - 40}" width="${W}" height="40" fill="${t.bar}"/>
  <line x1="0" y1="${H - 39.5}" x2="${W}" y2="${H - 39.5}" stroke="${t.border}"/>
  <g transform="translate(16 ${H - 15})"><g class="tape">${tape}</g></g>
</g>`;
  return doc({ w: W, h: H, title: `${cfg.name} (${cfg.login})`, desc: `${cfg.headline}. ${cfg.subline}. Ticker: ${d.year.contributions} contributions in the last year, ${d.publicRepos} public repos.`, body, css });
}

// ---------------------------------------------------------------- market summary: KPI tiles + contribution index
export function overview(t, cfg, d, m) {
  const H = 348;
  const tiles = [
    ['CONTRIBUTIONS · 1Y', d.year.contributions, m.yoy == null ? 'first year' : `${signed(m.yoy)} vs prior 1Y`, m.yoy == null ? null : m.yoy >= 0],
    [`COMMITS · ${m.thisYear} YTD`, m.ytdCommits, `${m.thisYear - 1}: ${m.lastYearCommits}`, m.ytdCommits >= m.lastYearCommits],
    ['52W HIGH · WEEK', m.peakWeek.count, `wk of ${fmtDate(m.peakWeek.start, { day: '2-digit', month: 'short' }).toLowerCase()}`, null],
    ['PUBLIC REPOS', d.publicRepos, `${m.languageCount} languages`, null],
    ['HACKATHONS', cfg.hackathons, cfg.hackathonsNote, null],
  ];
  const tw5 = (W - 32 - 4 * 8) / 5;
  const tileSvg = tiles.map(([label, val, sub, up], i) => {
    const x = 16 + i * (tw5 + 8), c = up == null ? t.muted : up ? t.up : t.down;
    return `<g style="animation:rise .6s ease-out ${(i * 0.08).toFixed(2)}s both"><rect x="${r1(x)}" y="44" width="${r1(tw5)}" height="78" rx="5" fill="${t.tile}" stroke="${t.border}"/>
<text x="${r1(x + 12)}" y="63" font-size="9.5" fill="${t.muted}" letter-spacing=".6">${esc(label)}</text>
<text x="${r1(x + 12)}" y="96" font-size="28" class="b" fill="${t.accent}">${esc(val)}</text>
${up != null ? arrow(r1(x + 12), 109, up, c, 3.5) : ''}<text x="${r1(x + (up != null ? 23 : 12))}" y="112" font-size="10" fill="${c}">${esc(sub)}</text></g>`;
  }).join('\n');

  // contribution index: lifetime cumulative contributions, weekly
  const wk = m.weeks, n = wk.length;
  const X0 = 16, X1 = 750, PT = 158, PB = 266, VT = 276, VB = 312;
  let cum = m.base; const series = wk.map(w => (cum += w.count));
  const lo = m.base, hi = Math.max(series.at(-1), lo + 1), pad = (hi - lo) * 0.14;
  const yMin = Math.max(0, lo - pad), yMax = hi + pad;
  const X = i => X0 + (i * (X1 - X0)) / (n - 1);
  const Y = v => PB - ((v - yMin) / (yMax - yMin)) * (PB - PT);
  const pts = series.map((v, i) => `${r1(X(i))},${r1(Y(v))}`);
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${r1(X(n - 1))},${PB} L${X0},${PB} Z`;

  const last = series.at(-1), ly = Y(last);
  const raw = (yMax - yMin) / 3, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
  let grid = '';
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    const y = Y(v);
    grid += `<line x1="${X0}" y1="${r1(y)}" x2="${X1}" y2="${r1(y)}" stroke="${t.grid}" stroke-dasharray="3 4"/>`;
    if (Math.abs(y - ly) > 14) grid += `<text x="${X1 + 10}" y="${r1(y + 3.5)}" font-size="9.5" fill="${t.muted}">${v}</text>`;
  }
  // volume bars, coloured like a stock chart: up week vs prior week = green
  const vmax = Math.max(...wk.map(w => w.count), 1), bw = ((X1 - X0) / n) * 0.62;
  const vol = wk.map((w, i) => {
    const x = X(i) - bw / 2;
    if (!w.count) return `<rect x="${r1(x)}" y="${VB - 1}" width="${r1(bw)}" height="1" fill="${t.faint}"/>`;
    const h = Math.max(2, (w.count / vmax) * (VB - VT)), up = i === 0 || w.count >= wk[i - 1].count;
    return `<rect x="${r1(x)}" y="${r1(VB - h)}" width="${r1(bw)}" height="${r1(h)}" fill="${up ? t.up : t.down}" opacity=".75"/>`;
  }).join('');
  // month labels
  let months = '', lastX = -99, lastM = '';
  wk.forEach((w, i) => {
    const mo = fmtDate(w.start, { month: 'short' }).slice(0, 3);
    if (mo !== lastM && X(i) - lastX > 40) { months += `<text x="${r1(X(i))}" y="330" font-size="9.5" fill="${t.muted}">${mo}</text>`; lastX = X(i); }
    lastM = mo;
  });
  // launch markers: featured repos created inside the window
  const t0 = new Date(wk[0].start).getTime(), t1 = new Date(wk.at(-1).start).getTime() + 6 * 864e5;
  const events = cfg.featured.map(f => ({ sym: f.symbol, at: new Date(d.repos[f.repo].createdAt).getTime() }))
    .filter(e => e.at >= t0 && e.at <= t1).sort((a, b) => a.at - b.at);
  const rows = []; let marks = '';
  for (const e of events) {
    const i = Math.min(n - 1, Math.max(0, Math.floor((e.at - t0) / (7 * 864e5))));
    const x = X(i), y = Y(series[i]), lw = tw(e.sym, 9) + 10;
    let row = 0; while (rows[row] != null && rows[row] > x - lw / 2 - 4) row++;
    rows[row] = x + lw / 2;
    const ly = PB - 10 - row * 16;
    marks += `<line x1="${r1(x)}" y1="${r1(y + 4)}" x2="${r1(x)}" y2="${r1(ly - 7)}" stroke="${t.faint}" stroke-dasharray="2 2"/>
<rect x="${r1(x - lw / 2)}" y="${r1(ly - 7)}" width="${r1(lw)}" height="13" rx="2" fill="${t.panel}" stroke="${t.accentDim}"/>
<text x="${r1(x)}" y="${r1(ly + 2.5)}" font-size="9" class="b" fill="${t.accent}" text-anchor="middle">${esc(e.sym)}</text>
<circle cx="${r1(x)}" cy="${r1(y)}" r="3.5" fill="${t.panel}" stroke="${t.accent}" stroke-width="1.5"/>`;
  }

  // timeframe tabs in the title bar
  const tabs = ['1M', '3M', '6M', '1Y', 'ALL']; let tx = W - 16, tabSvg = '';
  for (const tab of [...tabs].reverse()) {
    const w = tw(tab, 10.5) + 12; tx -= w;
    tabSvg += tab === '1Y'
      ? `<rect x="${r1(tx)}" y="8" width="${r1(w)}" height="15" rx="2" fill="${t.accent}"/><text x="${r1(tx + w / 2)}" y="19.5" font-size="10.5" class="b" fill="${t.onAccent}" text-anchor="middle">${tab}</text>`
      : `<text x="${r1(tx + w / 2)}" y="19.5" font-size="10.5" fill="${t.muted}" text-anchor="middle">${tab}</text>`;
    tx -= 2;
  }

  const css = `@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes fade{from{opacity:0}}
.line{stroke-dasharray:1;animation:draw 1.8s ease-out both}.area{animation:fade 1.2s ease-out .8s both}`;
  const body = `${frame(t, W, H, { title: `MARKET SUMMARY · ${cfg.ticker}` })}${tabSvg}
${tileSvg}
<text x="16" y="148" font-size="9.5" fill="${t.muted}" letter-spacing=".6">CONTRIBUTION INDEX · LIFETIME CUMULATIVE · WEEKLY</text>
<text x="${X1}" y="148" font-size="9.5" fill="${t.muted}" text-anchor="end" letter-spacing=".6">VOLUME = CONTRIBUTIONS / WEEK</text>
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity=".28"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>
${grid}
<path class="area" d="${area}" fill="url(#g)"/>
<path class="line" d="${line}" pathLength="1" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linejoin="round"/>
${marks}
<line x1="${X0}" y1="${r1(ly)}" x2="${X1}" y2="${r1(ly)}" stroke="${t.accent}" stroke-opacity=".5" stroke-dasharray="1 3"/>
<rect x="${X1 + 4}" y="${r1(ly - 9)}" width="${W - 16 - X1 - 4}" height="18" rx="2" fill="${t.accent}"/>
<text x="${X1 + 10}" y="${r1(ly + 4)}" font-size="11" class="b" fill="${t.onAccent}">${last}</text>
<line x1="${X0}" y1="${VB + 0.5}" x2="${X1}" y2="${VB + 0.5}" stroke="${t.border}"/>
${vol}
${months}`;
  return doc({ w: W, h: H, title: 'Market summary', desc: `${d.year.contributions} contributions in the last 12 months (${m.yoy == null ? 'first year' : signed(m.yoy) + ' vs prior year'}), ${m.ytdCommits} commits in ${m.thisYear}, best week ${m.peakWeek.count} contributions, ${d.publicRepos} public repos, ${cfg.hackathons} hackathons. Chart of lifetime cumulative contributions, now ${last}.`, body, css });
}

// ---------------------------------------------------------------- language allocation + weekday volume
export function allocation(t, cfg, d, m) {
  const H = 238;
  const top = m.langs.slice(0, 5);
  const rest = m.langs.slice(5);
  const rows = rest.length ? [...top, { symbol: 'OTHER', name: `${rest.length} more`, share: rest.reduce((s, l) => s + l.share, 0), repos: null }] : top;
  const BX = 16, BW = 484;
  let bx = BX, bar = '';
  rows.forEach((l, i) => {
    const w = Math.max(2, l.share * BW - 2);
    bar += `<rect x="${r1(bx)}" y="46" width="${r1(w)}" height="12" rx="1.5" fill="${t.palette[i]}"/>`;
    bx += l.share * BW;
  });
  const head = `<text x="30" y="86" font-size="9.5" fill="${t.muted}" letter-spacing=".6">SYM</text>
<text x="90" y="86" font-size="9.5" fill="${t.muted}" letter-spacing=".6">LANGUAGE</text>
<text x="410" y="86" font-size="9.5" fill="${t.muted}" text-anchor="end" letter-spacing=".6">WEIGHT</text>
<text x="496" y="86" font-size="9.5" fill="${t.muted}" text-anchor="end" letter-spacing=".6">REPOS</text>
<line x1="16" y1="93.5" x2="500" y2="93.5" stroke="${t.border}"/>`;
  const maxShare = rows[0].share;
  const table = rows.map((l, i) => {
    const y = 112 + i * 21;
    return `<rect x="16" y="${y - 8}" width="8" height="8" fill="${t.palette[i]}"/>
<text x="30" y="${y}" font-size="11.5" class="b" fill="${t.text}">${esc(l.symbol)}</text>
<text x="90" y="${y}" font-size="11" fill="${t.muted}">${esc(l.name)}</text>
<rect x="232" y="${y - 7}" width="110" height="6" rx="1" fill="${t.grid}"/>
<rect x="232" y="${y - 7}" width="${r1(Math.max(1.5, (l.share / maxShare) * 110))}" height="6" rx="1" fill="${t.palette[i]}"/>
<text x="410" y="${y}" font-size="11.5" fill="${t.accent}" text-anchor="end">${pct(l.share)}</text>
<text x="496" y="${y}" font-size="11.5" fill="${t.text}" text-anchor="end">${l.repos ?? '—'}</text>`;
  }).join('\n');

  // weekday volume (GitHub weekday 0 = Sunday → reorder to MON..SUN)
  const wd = [1, 2, 3, 4, 5, 6, 0].map(i => m.weekday[i]);
  const wmax = Math.max(...wd, 1), peak = wd.indexOf(Math.max(...wd));
  const RX = 532, RW = W - 16 - RX, cw = RW / 7, base = 200, mh = 108;
  const cols = wd.map((v, i) => {
    const x = RX + i * cw + (cw - 22) / 2, h = Math.max(1, (v / wmax) * mh), hot = i === peak;
    return `<rect x="${r1(x)}" y="${r1(base - h)}" width="22" height="${r1(h)}" rx="1.5" fill="${hot ? t.accent : t.accentDim}" style="transform-origin:${r1(x + 11)}px ${base}px;animation:grow .8s ease-out ${(i * 0.06).toFixed(2)}s both"/>
<text x="${r1(x + 11)}" y="${r1(base - h - 6)}" font-size="9.5" fill="${hot ? t.accent : t.muted}" text-anchor="middle">${v}</text>
<text x="${r1(x + 11)}" y="218" font-size="9.5" fill="${hot ? t.text : t.muted}" text-anchor="middle"${hot ? ' class="b"' : ''}>${DAYS[i]}</text>`;
  }).join('\n');

  const css = `@keyframes grow{from{transform:scaleY(0)}}`;
  const body = `${frame(t, W, H, { title: 'PORTFOLIO ALLOCATION · LANGUAGES', right: 'WEIGHT BY BYTES · PUBLIC REPOS' })}
${bar}${head}${table}
<line x1="516.5" y1="42" x2="516.5" y2="${H - 14}" stroke="${t.border}" stroke-dasharray="2 4"/>
<text x="${RX}" y="56" font-size="9.5" fill="${t.muted}" letter-spacing=".6">WEEKDAY VOLUME · 1Y</text>
<text x="${W - 16}" y="56" font-size="9.5" class="b" fill="${t.accent}" text-anchor="end" letter-spacing=".6">PEAK ${DAYS[peak]}</text>
<line x1="${RX}" y1="${base + 0.5}" x2="${W - 16}" y2="${base + 0.5}" stroke="${t.border}"/>
${cols}`;
  return doc({ w: W, h: H, title: 'Language allocation', desc: `Languages by share of code across public repos: ${rows.map(l => `${l.name === `${rest.length} more` ? 'other' : l.name} ${pct(l.share)}`).join(', ')}. Most active weekday: ${DAYS[peak]}.`, body, css });
}

// ---------------------------------------------------------------- project card (one per featured repo)
export function card(t, f, r, langColor) {
  const CW = 408, H = 170;
  const tagColor = t.tags[f.tag] ?? t.info;
  const pw = tw(f.symbol, 11) + 16;
  const tagW = tw(f.tag, 9.5) + 14;
  const lines = wrap(f.blurb, 54, 3);

  let x = 16, chips = '';
  for (const s of f.stack) {
    const w = tw(s, 10) + 14;
    if (x + w > 250) break;
    chips += `<rect x="${r1(x)}" y="121" width="${r1(w)}" height="18" rx="3" fill="${t.tile}" stroke="${t.faint}"/><text x="${r1(x + 7)}" y="133.5" font-size="10" fill="${t.text}">${esc(s)}</text>`;
    x += w + 6;
  }

  // build log: commits per week from first to last commit
  let spark = '';
  const dates = r.commitDates.map(s => new Date(s).getTime()).sort((a, b) => a - b);
  if (dates.length >= 2) {
    const wk = 7 * 864e5, nb = Math.min(40, Math.max(8, Math.ceil((dates.at(-1) - dates[0]) / wk) + 1));
    const span = Math.max(dates.at(-1) - dates[0], 1), bins = Array(nb).fill(0);
    for (const t0 of dates) bins[Math.min(nb - 1, Math.floor(((t0 - dates[0]) / span) * (nb - 1) + 0.5))]++;
    const SX0 = 266, SX1 = 392, SY0 = 116, SY1 = 140, bmax = Math.max(...bins);
    const P = bins.map((v, i) => [SX0 + (i * (SX1 - SX0)) / (nb - 1), SY1 - (v / bmax) * (SY1 - SY0)]);
    const path = `M${P.map(p => `${r1(p[0])},${r1(p[1])}`).join(' L')}`;
    const mi = bins.indexOf(bmax);
    spark = `<path d="${path} L${SX1},${SY1} L${SX0},${SY1} Z" fill="${t.accent}" fill-opacity=".16"/>
<path d="${path}" fill="none" stroke="${t.accent}" stroke-width="1.5" stroke-linejoin="round"/>
<circle cx="${r1(P[mi][0])}" cy="${r1(P[mi][1])}" r="2.5" fill="${t.accent}"/>`;
  } else {
    spark = `<text x="392" y="134" font-size="10" fill="${t.faint}" text-anchor="end" letter-spacing=".6">TEAM REPO</text>`;
  }
  const meta = [r.commits ? `${r.commits} COMMITS` : null, `UPD ${fmtDate(r.pushedAt)}`].filter(Boolean).join(' · ');

  const body = `${frame(t, CW, H, { bar: false })}
<rect x="16" y="16" width="${r1(pw)}" height="20" rx="3" fill="${t.accent}"/>
<text x="${r1(16 + pw / 2)}" y="30" font-size="11" class="b" fill="${t.onAccent}" text-anchor="middle" letter-spacing=".5">${esc(f.symbol)}</text>
<text x="${r1(16 + pw + 10)}" y="31" font-size="15" class="b" fill="${t.text}">${esc(f.title)}</text>
<rect x="${r1(CW - 16 - tagW)}" y="17" width="${r1(tagW)}" height="18" rx="3" fill="${tagColor}" fill-opacity=".12" stroke="${tagColor}" stroke-opacity=".7"/>
<text x="${r1(CW - 16 - tagW / 2)}" y="29.5" font-size="9.5" class="b" fill="${tagColor}" text-anchor="middle" letter-spacing=".6">${esc(f.tag)}</text>
${lines.map((l, i) => `<text x="16" y="${60 + i * 17}" font-size="11.5" fill="${t.text}" fill-opacity=".86">${esc(l)}</text>`).join('\n')}
<line x1="16" y1="108.5" x2="${CW - 16}" y2="108.5" stroke="${t.faint}" stroke-dasharray="2 3"/>
${chips}
${spark}
<circle cx="20" cy="155" r="4" fill="${t.palette[langColor] ?? t.muted}"/>
<text x="30" y="158.5" font-size="10" fill="${t.muted}">${esc(r.language ?? '—')}${r.languageShare ? ` ${Math.round(r.languageShare * 100)}%` : ''}</text>
<text x="${CW - 16}" y="158.5" font-size="10" fill="${t.muted}" text-anchor="end" letter-spacing=".3">${esc(meta)}</text>`;
  return doc({ w: CW, h: H, title: `${f.title} (${f.symbol})`, desc: `${f.blurb} Stack: ${f.stack.join(', ')}. ${meta}.`, body });
}

// ---------------------------------------------------------------- tech stack
export function stack(t, cfg) {
  const rowH = 30, H = 46 + cfg.stack.length * rowH + 8;
  const count = cfg.stack.reduce((s, g) => s + g.items.length, 0);
  const rows = cfg.stack.map((g, i) => {
    const y = 48 + i * rowH;
    let x = 132, s = `<text x="16" y="${y + 13.5}" font-size="10.5" class="b" fill="${t.muted}" letter-spacing=".8">${esc(g.label)}</text>`;
    for (const it of g.items) {
      const w = tw(it, 11) + 16;
      s += `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="20" rx="3" fill="${t.tile}" stroke="${t.faint}"/><text x="${r1(x + 8)}" y="${y + 14}" font-size="11" fill="${t.text}">${esc(it)}</text>`;
      x += w + 6;
    }
    if (i < cfg.stack.length - 1) s += `<line x1="16" y1="${y + 25.5}" x2="${W - 16}" y2="${y + 25.5}" stroke="${t.grid}"/>`;
    return s;
  }).join('\n');
  const body = `${frame(t, W, H, { title: 'HOLDINGS · TECH STACK', right: `${count} POSITIONS` })}\n${rows}`;
  return doc({ w: W, h: H, title: 'Tech stack', desc: cfg.stack.map(g => `${g.label}: ${g.items.join(', ')}`).join('. '), body });
}

// ---------------------------------------------------------------- function-key contact buttons
export function key(t, c) {
  const KW = 272, H = 46;
  const body = `${frame(t, KW, H, { bar: false })}
<rect x="7" y="7" width="42" height="32" rx="4" fill="${t.accent}"/>
<text x="28" y="27.5" font-size="13" class="b" fill="${t.onAccent}" text-anchor="middle">${esc(c.key)}</text>
<text x="62" y="22" font-size="13" class="b" fill="${t.text}" letter-spacing=".6">${esc(c.label)}</text>
<text x="62" y="36" font-size="10" fill="${t.muted}">${esc(c.hint)}</text>
<text x="${KW - 16}" y="29" font-size="16" fill="${t.accent}" text-anchor="end">→</text>`;
  return doc({ w: KW, h: H, title: c.label, desc: `${c.label}: ${c.url.replace(/^mailto:/, '')}`, body });
}

// ---------------------------------------------------------------- status bar footer
export function footer(t, cfg, d) {
  const H = 36;
  const left = 'DATA: GITHUB GRAPHQL API · REFRESHED DAILY BY GITHUB ACTIONS';
  const body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="7.5" fill="${t.bar}" stroke="${t.border}"/>
${tri(16, 18, 4.5, t.accent)}
<text x="28" y="22" font-size="10.5" fill="${t.muted}" letter-spacing=".4">${left}</text>
${t.cursor ? `<rect x="${r1(28 + tw(left, 10.5) + left.length * 0.4 + 6)}" y="11" width="7" height="14" fill="${t.accent}" class="cursor"/>` : ''}
<text x="${W - 16}" y="22" font-size="10.5" fill="${t.muted}" text-anchor="end" letter-spacing=".4">LAST UPDATE ${fmtDate(d.fetchedAt)} · NOT FINANCIAL ADVICE</text>`;
  return doc({ w: W, h: H, title: 'Status bar', desc: `Data from the GitHub GraphQL API, last updated ${fmtDate(d.fetchedAt)}.`, body });
}
