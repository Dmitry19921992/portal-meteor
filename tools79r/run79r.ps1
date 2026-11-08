# run79r.ps1 [list] - v7.9 radio tests in OWN headless Chrome (CDP 9361, profile chrome_radio, http 8861); default target dist/v79radio.html
param([string]$Which = 'all', [string]$Target = 'dist/v79radio.html')
$T = 'D:\AI\pm_v6\wt79r\tests79r\'
$runs = @(
  @('pc',   'v79r_feat.js',  'out79r_feat_pc.txt',  '--vp 1280x720 --reload'),
  @('ph',   'v79r_feat.js',  'out79r_feat_ph.txt',  '--phone2 --reload'),
  @('ph2',  'v79r_feat.js',  'out79r_feat_ph2.txt', '--phone --reload'),
  @('smoke','v79r_smoke.js', 'out79r_smoke_pc.txt', '--vp 1280x720 --reload'),
  @('smph', 'v79r_smoke.js', 'out79r_smoke_ph.txt', '--phone2 --reload')
)
foreach ($r in $runs){
  if ($Which -ne 'all' -and ($Which -split ',') -notcontains $r[0]){ continue }
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t79r.ps1 -Test ($T + $r[1]) -Out $r[2] -A $r[3] -Target $Target | Out-Null
}
"== all done $(Get-Date -f HH:mm:ss) $Which" | Out-File D:\AI\pm_v6\tests\out79r_all.txt -Encoding utf8
