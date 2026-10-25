param([string]$list = 'all')
# витрина и серия скриншотов новой техники; запускать в фоне (Start-Process), лог — shots.log
$env:CDP_PORT = '9234'
$log = 'D:\AI\pm_v6\tests\shots.log'
"start $(Get-Date)" | Out-File $log
node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\units_show.js v6_units | Out-File $log -Append
node D:\AI\pm_tools\cdp.js -e "for (const e of document.body.children) if (e.id !== 'c') e.style.visibility = 'hidden'; S.third = true; S.autoRes = false; S.scale = 1; resize(); S.quality = 2; for (const k in UV2.v) UV2.v[k].flash = 0; S.proj = []; S.beams = []; S.fx = []; S.sparks = []; return 1" v6_units | Out-File $log -Append
$shots = @(
  @("UV2.cam('raider0', 0.75, 5.5, 1.9)", 'units_raider0_close'),
  @("UV2.cam('raider1', 0.75, 5.5, 1.9)", 'units_raider1_close'),
  @("UV2.cam('mlrs0', 0.9, 8, 2.5)", 'units_mlrs0_close'),
  @("UV2.cam('mlrs1', 0.9, 8, 2.5)", 'units_mlrs1_close'),
  @("UV2.cam('cat0', 0.9, 7, 2.3)", 'units_cat0_close'),
  @("UV2.cam('cat1', 0.9, 7, 2.3)", 'units_cat1_close'),
  @("UV2.wide(9, 26)", 'units_lineup')
)
foreach ($s in $shots){
  if ($list -ne 'all' -and -not ($s[1] -like "*$list*")) { continue }
  node D:\AI\pm_tools\cdp.js -e "$($s[0]); await new Promise(r => setTimeout(r, 1200)); return 1" v6_units | Out-Null
  node D:\AI\pm_tools\cdp.js -e "return 1" v6_units --shot "D:\AI\pm_v6\shots\$($s[1]).jpg" | Out-Null
  "shot $($s[1])" | Out-File $log -Append
}
"done $(Get-Date)" | Out-File $log -Append
