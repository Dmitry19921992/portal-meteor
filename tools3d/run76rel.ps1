# run76rel.ps1 - v7.6 release tests in OWN headless Chrome (CDP 9354, profile chrome_v76rel, http 8854) against dist/itch76/index.html
param([string]$Which = 'all')
$t = 'D:\AI\pm_v6\tests'
New-Item -ItemType Directory -Force D:\AI\pm_v6\shots_v76rel | Out-Null
Set-Content "$t\v76rel_smoke.js" -Encoding UTF8 -Value ((Get-Content "$t\v76feel_smoke.js" -Raw -Encoding UTF8) -replace 'shots_v76feel', 'shots_v76rel')
$runs = @(
  @('pc',  'v76rel_smoke.js', 'out76rel_smoke_pc.txt', '--vp 1280x720 --reload'),
  @('ph',  'v76rel_smoke.js', 'out76rel_smoke_ph.txt', '--phone2 --reload'),
  @('xpc', 'v76rel_extra.js', 'out76rel_extra_pc.txt', '--vp 1280x720 --reload'),
  @('xph', 'v76rel_extra.js', 'out76rel_extra_ph.txt', '--phone2 --reload')
)
foreach ($r in $runs){
  if ($Which -ne 'all' -and ($Which -split ',') -notcontains $r[0]){ continue }
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t76rel.ps1 $r[1] $r[2] -A $r[3] | Out-Null
}
"== all done $(Get-Date -f HH:mm:ss)" | Out-File "$t\out76rel_all.txt" -Encoding utf8
