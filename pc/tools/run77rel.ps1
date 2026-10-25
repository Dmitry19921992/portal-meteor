# run77rel.ps1 - v7.7 release tests in OWN headless Chrome (CDP 9356, profile chrome_v77rel_t, http 8856) against dist/itch77/index.html
param([string]$Which = 'all')
$runs = @(
  @('fac',  'v77_fac.js',       'out77_fac_pc.txt',     '--vp 1280x720 --reload', 'v73run.js'),
  @('facph','v77_facph.js',     'out77_fac_ph.txt',     '--phone --reload',       'v73run.js'),
  @('pc',   'v77rel_smoke.js',  'out77rel_smoke_pc.txt','--vp 1280x720 --reload', 'cdp73.js'),
  @('ph',   'v77rel_smoke.js',  'out77rel_smoke_ph.txt','--phone2 --reload',      'cdp73.js'),
  @('xpc',  'v77rel_extra.js',  'out77rel_extra_pc.txt','--vp 1280x720 --reload', 'cdp73.js'),
  @('xph',  'v77rel_extra.js',  'out77rel_extra_ph.txt','--phone2 --reload',      'cdp73.js')
)
foreach ($r in $runs){
  if ($Which -ne 'all' -and ($Which -split ',') -notcontains $r[0]){ continue }
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t77t.ps1 $r[1] $r[2] -A $r[3] -Runner $r[4] | Out-Null
}
"== all done $(Get-Date -f HH:mm:ss)" | Out-File D:\AI\pm_v6\tests\out77rel_all.txt -Encoding utf8