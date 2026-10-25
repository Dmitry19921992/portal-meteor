# снимки: стратегия (круги дальности, иконки) и вселение в РСЗО/миномёт с дугой прицела. Лог — shots3.log
$env:CDP_PORT = '9234'
$log = 'D:\AI\pm_v6\tests\shots3.log'
"start $(Get-Date)" | Out-File $log
$show = "for (const e of document.body.children) e.style.visibility = ''; for (const id of ['clicklock', 'help', 'feed', 'obj', 'sq', 'banner']){ const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }"
$shots = @(
  @("$show; S.camOverride = null; UV2.reset(); for (const k in UV2.v) UV2.v[k].manualUntil = 0; S.mode = 'rts'; S.rts.dir = UV2.c0; S.rts.fwd = UV2.t1; S.rts.h = 75; S.sel.clear(); S.sel.add(UV2.v.mlrs0); S.sel.add(UV2.v.cat0); UV2.v.mlrs0.fireAt = { pos: UV2.tgt.p, until: S.time + 999 }; updateModeUI(); buildSidebar()", 'units_rts_view'),
  @("$show; S.camOverride = null; S.sel.clear(); takeControl(UV2.v.mlrs0); S.paused = false; for (let i = 0; i < 20; i++){ update(1 / 60); setupCamera(1 / 60); } S.paused = true; updateHUD()", 'units_mlrs0_possess'),
  @("mouseR = true; S.paused = false; for (let i = 0; i < 70; i++){ update(1 / 60); setupCamera(1 / 60); } S.paused = true; updateHUD()", 'units_mlrs0_possess_high'),
  @("mouseR = false; takeControl(UV2.v.cat0); S.paused = false; for (let i = 0; i < 70; i++){ update(1 / 60); setupCamera(1 / 60); } S.paused = true; updateHUD()", 'units_cat0_possess'),
  @("takeControl(UV2.v.raider0); S.paused = false; for (let i = 0; i < 40; i++){ update(1 / 60); setupCamera(1 / 60); } S.paused = true; updateHUD()", 'units_raider0_possess')
)
foreach ($s in $shots){
  node D:\AI\pm_tools\cdp.js -e "$($s[0]); await new Promise(r => setTimeout(r, 1200)); return 1" v6_units | Out-File $log -Append
  node D:\AI\pm_tools\cdp.js -e "return 1" v6_units --shot "D:\AI\pm_v6\shots\$($s[1]).jpg" | Out-Null
  "shot $($s[1])" | Out-File $log -Append
}
"done $(Get-Date)" | Out-File $log -Append
