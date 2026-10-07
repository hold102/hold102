// Fetches everything the dashboard needs from the GitHub GraphQL API and
// reduces it to plain numbers, so the renderers never touch the network.
import { execSync } from 'node:child_process';

const DAY = 86400000;

function token() {
  const t = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (t) return t;
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); }
  catch { throw new Error('Set GITHUB_TOKEN (or log in with `gh auth login`).'); }
}

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token()}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-dashboard' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data;
}

const USER_Q = `query($login:String!,$from:DateTime!,$to:DateTime!,$pFrom:DateTime!,$pTo:DateTime!){
  user(login:$login){
    id login name createdAt
    year: contributionsCollection(from:$from,to:$to){
      totalCommitContributions totalPullRequestContributions totalIssueContributions restrictedContributionsCount
      contributionYears
      contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount weekday } } }
    }
    prev: contributionsCollection(from:$pFrom,to:$pTo){ contributionCalendar{ totalContributions } }
    repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, orderBy:{field:PUSHED_AT,direction:DESC}){
      totalCount
      nodes{ name languages(first:20, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name } } } }
    }
  }
}`;

const yearQ = years => `query($login:String!){ user(login:$login){ ${years.map(y =>
  `y${y}: contributionsCollection(from:"${y}-01-01T00:00:00Z",to:"${y}-12-31T23:59:59Z"){ totalCommitContributions contributionCalendar{ totalContributions } }`).join(' ')} } }`;

const repoQ = (repos, emails) => `query{ ${repos.map(([owner, name], i) => `r${i}: repository(owner:"${owner}",name:"${name}"){
  url pushedAt createdAt primaryLanguage{ name }
  languages(first:1, orderBy:{field:SIZE,direction:DESC}){ totalSize edges{ size node{ name } } }
  defaultBranchRef{ target{ ... on Commit{ history(first:100, author:{emails:${JSON.stringify(emails)}}){ totalCount nodes{ committedDate } } } } }
}`).join(' ')} }`;

export async function fetchData(cfg) {
  const now = new Date();
  const from = new Date(now - 365 * DAY);
  const pFrom = new Date(now - 730 * DAY);
  const iso = d => d.toISOString();
  const { user } = await gql(USER_Q, { login: cfg.login, from: iso(from), to: iso(now), pFrom: iso(pFrom), pTo: iso(from) });

  const years = user.year.contributionYears;
  const yd = (await gql(yearQ(years), { login: cfg.login })).user;
  const perYear = Object.fromEntries(years.map(y => [y, {
    contributions: yd[`y${y}`].contributionCalendar.totalContributions,
    commits: yd[`y${y}`].totalCommitContributions,
  }]));

  const repoList = cfg.featured.map(f => f.repo.split('/'));
  const rd = await gql(repoQ(repoList, cfg.commitEmails));
  const repos = Object.fromEntries(cfg.featured.map((f, i) => {
    const r = rd[`r${i}`];
    const hist = r.defaultBranchRef?.target?.history;
    const top = r.languages.edges[0];
    return [f.repo, {
      url: r.url, pushedAt: r.pushedAt, createdAt: r.createdAt,
      language: top?.node.name ?? r.primaryLanguage?.name ?? null,
      languageShare: top && r.languages.totalSize ? top.size / r.languages.totalSize : null,
      commits: hist?.totalCount ?? 0,
      commitDates: (hist?.nodes ?? []).map(n => n.committedDate),
    }];
  }));

  return {
    fetchedAt: now.toISOString(),
    login: user.login, createdAt: user.createdAt,
    year: {
      contributions: user.year.contributionCalendar.totalContributions,
      commits: user.year.totalCommitContributions,
      prs: user.year.totalPullRequestContributions,
      issues: user.year.totalIssueContributions,
      days: user.year.contributionCalendar.weeks.flatMap(w => w.contributionDays)
        .map(d => ({ date: d.date, count: d.contributionCount, weekday: d.weekday })),
    },
    prevYearContributions: user.prev.contributionCalendar.totalContributions,
    perYear,
    publicRepos: user.repositories.totalCount,
    repoLanguages: user.repositories.nodes.map(r => r.languages.edges.map(e => [e.node.name, e.size])),
    repos,
  };
}

// ---------- derived metrics (pure) ----------

const SYMBOLS = { Java: 'JAVA', TypeScript: 'TS', Python: 'PY', JavaScript: 'JS', Dart: 'DART', CSS: 'CSS', HTML: 'HTML',
  PLpgSQL: 'SQL', Kotlin: 'KT', Shell: 'SH', Dockerfile: 'DKR', 'Objective-C': 'OBJC', Swift: 'SWFT', Go: 'GO', Rust: 'RUST', 'C++': 'CPP', C: 'C' };
export const symbolFor = lang => SYMBOLS[lang] ?? lang.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();

export function derive(d) {
  const days = d.year.days;
  // streaks + activity
  let longest = 0, run = 0, active = 0;
  for (const x of days) { if (x.count > 0) { run++; active++; longest = Math.max(longest, run); } else run = 0; }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue; // today may not have activity yet
    else break;
  }
  const weekday = [0, 0, 0, 0, 0, 0, 0];
  for (const x of days) weekday[x.weekday] += x.count;

  // weekly series (oldest → newest)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ start: days[i].date, count: days.slice(i, i + 7).reduce((s, x) => s + x.count, 0) });

  const peakWeek = weeks.reduce((a, b) => (b.count > a.count ? b : a), weeks[0]);

  const lifetime = Object.values(d.perYear).reduce((s, y) => s + y.contributions, 0);
  const lifetimeCommits = Object.values(d.perYear).reduce((s, y) => s + y.commits, 0);
  const base = Math.max(0, lifetime - d.year.contributions);

  // language allocation by bytes across public, non-fork repos
  const bytes = {}, repoCount = {};
  for (const langs of d.repoLanguages) for (const [name, size] of langs) {
    bytes[name] = (bytes[name] ?? 0) + size; repoCount[name] = (repoCount[name] ?? 0) + 1;
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const langs = Object.entries(bytes).sort((a, b) => b[1] - a[1])
    .map(([name, size]) => ({ name, symbol: symbolFor(name), share: size / total, repos: repoCount[name] }));

  const thisYear = new Date(d.fetchedAt).getUTCFullYear();
  const yoy = d.prevYearContributions > 0 ? (d.year.contributions - d.prevYearContributions) / d.prevYearContributions : null;

  return {
    longest, current, active, weekday, weeks, peakWeek, base, lifetime, lifetimeCommits, langs, yoy,
    languageCount: langs.length,
    ytdCommits: d.perYear[thisYear]?.commits ?? 0,
    lastYearCommits: d.perYear[thisYear - 1]?.commits ?? 0,
    thisYear,
  };
}
