# Portal Meteor

A browser game set on a meteor inside a sky-sphere, where every point is a portal to its antipode.
It mixes a real-time strategy (base building, squads, factions) with a first/third-person shooter:
you can command from the map or drop into any soldier and fight yourself. Runs on PC and phones,
in RU / EN / VI / HE.

**Play free:** https://edmitry.itch.io/portal-meteor

## Build and run

Requires Python 3.10+ (no npm, no dependencies).

```bash
python3 ci/cf_build.py        # -> site/index.html (the same single-file page that is released)
python3 -m http.server -d site 8000   # open http://127.0.0.1:8000/
```

`python3 build.py out.html` builds the raw page into `../dist/out.html` (the developer flow).
3D environment models and old game versions load from `https://portal-meteor.pages.dev/`.

Headless smoke test (Playwright + Chromium): `pip install playwright && python3 -m playwright install chromium && python3 ci/smoke.py`.

## Branches

- `release`: what is live. A push deploys it automatically (Cloudflare Pages), and the itch page shows it.
- `v78`: the v7.8 release. `v781`, `v79*`: work in progress. `v6x`/`v7x`: history of past versions.

See `CLOUD_WORKFLOW.md` for the full development and release process.

## License

The **source code** is MIT licensed (see `LICENSE`).
**Music (EDMITRY tracks), voices, 3D models and other generated or authored assets are NOT covered by the
code license.** All rights are reserved; some assets were made with third-party AI tools under their own terms
(asset ledger: `pc/reports/REPORT_3d_assets.md` and the project's tools ledger). Please do not reuse them
without permission.
