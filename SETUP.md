# Profile dashboard: how it works

Everything on the profile is an SVG generated from live GitHub data. No third-party widget services are involved, so nothing can show a broken image.

```
profile.config.json   ← edit this: headline, featured projects, stack, contact links
scripts/build.mjs     ← fetches data, renders assets/*-dark.svg + *-light.svg, writes README.md
data/snapshot.json    ← last fetched data (lets you re-render offline)
.github/workflows/    ← rebuilds daily at 00:00 MYT and on config changes
```

## Edit and rebuild

```bash
node scripts/build.mjs            # fresh data (uses `gh auth token` locally)
node scripts/build.mjs --offline  # re-render from data/snapshot.json
```

Don't edit `README.md` by hand. It is regenerated from the config on every build.

## Publish

Already published to `hold102/hold102`. This folder is a clone of it, so commit and push to `main` as usual (pull first: the daily Action commits too).

1. If the Action ever fails to push, go to repo **Settings → Actions → General → Workflow permissions**, choose **Read and write**.
2. Recommended: in **Settings → Public profile**, tick **Include private contributions on my profile**. Without it, the daily Action can't see private-repo activity and the numbers will drop.
3. Optional: create a fine-grained, read-only personal access token and save it as the `PROFILE_TOKEN` repo secret for the most complete data.

## Theme

- `"theme"` in the config: `"dark"` (current) shows the terminal design to everyone, `"light"` the paper design, `"auto"` follows each viewer's GitHub theme.
- Dark: amber-on-black market terminal. Light: salmon "financial paper" with a serif name.
- Colors live in `scripts/lib/svg.mjs` (`THEMES`). Panels are in `scripts/lib/panels.mjs`.
- Font: JetBrains Mono (SIL OFL 1.1, see `scripts/fonts/OFL.txt`), subset and embedded.
