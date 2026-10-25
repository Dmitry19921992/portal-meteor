# Portal Meteor v6 — shared brief for parallel game agents (19.10.2026 night)

Game: single-file browser game (WebGL2 SDF raymarcher, scene.glsl + post.glsl, plain JS modules concatenated by build.py).
RTS + FPS hybrid on a small meteor inside a sky-dome portal (point P on dome -> antipode -P). All units are robots (no blood, sparks).
Player: Dmitry (Russian speaker). UI texts must exist in RU and EN (see i18n.js / existing patterns `L(ru,en)` or similar — follow what the code does).

## Repo layout (git, one branch per agent)
- D:\AI\pm_v6\main        — branch main (base v5.3). DO NOT edit main.
- D:\AI\pm_v6\wt_fps      — branch fps
- D:\AI\pm_v6\wt_rts      — branch rts
- D:\AI\pm_v6\wt_mission  — branch mission
- D:\AI\pm_v6\wt_units    — branch units
Work ONLY inside your own worktree. Commit often with clear messages (`git -C D:\AI\pm_v6\wt_X commit -am "..."`; `git add` new files).
Keep edits surgical and localized (other agents edit the same files on other branches; the orchestrator merges later).
Avoid mass reformatting, renaming, or moving code blocks. Prefer adding new functions / new small files over rewriting big ones.
If you add a new .js file, add it to the JS list in build.py (keep order sensible).
Files are UTF-8, LF line endings. Never write with PowerShell Set-Content/Out-File on source files (BOM/CRLF); use Desktop Commander write_file/edit_block, or python.

## Build & test (Windows PC, use Desktop Commander start_process; shell powershell)
- Build: `python D:\AI\pm_v6\wt_X\build.py v6_X.html` -> D:\AI\pm_v6\dist\v6_X.html
- Syntax check: `node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v6_X.html`
- Your ports (do not use others'): fps http 8781 / cdp 9231; rts 8782 / 9232; mission 8783 / 9233; units 8784 / 9234; rtsui 8785 / 9235.
- 5 agents share the PC/GPU. When you are not actively testing (e.g. long code-reading/editing phases), kill your headless Chrome:
  `Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'chrome_X' } | % { Stop-Process -Id $_.ProcessId -Force -EA 0 }` and restart later.
- Desktop Commander tools are deferred: load them first with ToolSearch, e.g. query
  "select:mcp__remote-devices__Desktop_Commander__start_process,mcp__remote-devices__Desktop_Commander__read_process_output,mcp__remote-devices__Desktop_Commander__read_file,mcp__remote-devices__Desktop_Commander__write_file,mcp__remote-devices__Desktop_Commander__edit_block,mcp__remote-devices__Desktop_Commander__start_search,mcp__remote-devices__Desktop_Commander__get_more_search_results,mcp__remote-devices__Desktop_Commander__interact_with_process,mcp__remote-devices__Desktop_Commander__force_terminate"
  start_search (content search) is the grep equivalent. read_file supports offset/length for big files.
- HTTP server (start once, in background): `Start-Process python -ArgumentList '-m','http.server','<HTTP>','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden`
- Headless Chrome (start once, own profile):
  `Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=<CDP>','--user-data-dir=D:\AI\pm_v6\chrome_X','--window-size=960,540','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','http://127.0.0.1:<HTTP>/dist/v6_X.html'`
  NEVER launch a visible (non-headless) Chrome — Dmitry may be using the PC. Don't touch ports 9222/9223/8765/8766/8188.
- Run JS in the page: `$env:CDP_PORT=<CDP>; node D:\AI\pm_tools\cdp.js <test.js | -e "expr"> v6_X [--shot D:\AI\pm_v6\shots\x.jpg]`
  (cdp.js evaluates code inside an async function; `return` a JSON-able value). After rebuilding, reload: `node D:\AI\pm_tools\cdp.js -e "location.reload(); return 1" v6_X` then wait for boot.
- Example tests to copy patterns from: D:\AI\pm_tools\test_flight.js (manual `update(1/60)` stepping, MENU.newGame(), S.me, keys[SET.bind.*]), test_v5b.js, test_side.js, test_touch.js, cdp_phone.js (iPhone 14 Pro Max emulation 932x430 dpr3).
- Put your test scripts in D:\AI\pm_v6\tests\<branch>_*.js and screenshots in D:\AI\pm_v6\shots\ (you may view jpgs with Desktop Commander read_file).
- GPU is shared (RTX 2080 Ti, ComfyUI also running). Prefer simulation tests over long rendering; keep the window small.
- Phone (touch) controls must keep working (touch.js). Any new action needs a touch button too if it's important.

## Quality bar
- No console errors. Game must boot, menu works, new game works, save/load works (save.js — if you add state, make save/load tolerate old saves).
- Keep performance: ~125 robots at 55-60 FPS on this PC.
- At the end: commit, then write D:\AI\pm_v6\REPORT_<branch>.md (Russian, short): what changed, controls, known issues, how you tested.
