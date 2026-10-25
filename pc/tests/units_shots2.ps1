# снимки стрельбы; запускать в фоне. Лог — shots2.log
$env:CDP_PORT = '9234'
$log = 'D:\AI\pm_v6\tests\shots2.log'
"start $(Get-Date)" | Out-File $log
node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\units_show.js v6_units | Out-File $log -Append
node D:\AI\pm_tools\cdp.js -e "for (const e of document.body.children) if (e.id !== 'c') e.style.visibility = 'hidden'; S.third = true; S.autoRes = false; S.scale = 1; resize(); S.quality = 2; return 1" v6_units | Out-File $log -Append
node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\units_act.js v6_units | Out-File $log -Append
$shots = @(
  @("UV2.act('mlrs')", 'units_mlrs0_firing'),
  @("UV2.act('impact')", 'units_mlrs0_impact'),
  @("UV2.act('hive')", 'units_mlrs1_firing'),
  @("UV2.act('cat1')", 'units_cat1_firing'),
  @("UV2.act('split')", 'units_cat1_cluster'),
  @("UV2.act('mortar')", 'units_cat0_firing'),
  @("UV2.act('raider')", 'units_raider0_firing')
)
foreach ($s in $shots){
  node D:\AI\pm_tools\cdp.js -e "const n = $($s[0]); await new Promise(r => setTimeout(r, 1000)); return n" v6_units | Out-File $log -Append
  node D:\AI\pm_tools\cdp.js -e "return 1" v6_units --shot "D:\AI\pm_v6\shots\$($s[1]).jpg" | Out-Null
  "shot $($s[1])" | Out-File $log -Append
}
"done $(Get-Date)" | Out-File $log -Append
