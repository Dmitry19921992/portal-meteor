# run78.ps1 [list] - v7.8 tests in OWN headless Chrome (CDP 9357, profile chrome_v78, http 8857); default target dist/v78.html
param([string]$Which = 'all', [string]$Target = 'dist/v78.html')
$runs = @(
  @('feat',   'v78_feat.js',       'out78_feat_pc.txt',      '--vp 1280x720 --reload', 'cdp73.js'),
  @('featph', 'v78_feat.js',       'out78_feat_ph.txt',      '--phone2 --reload',      'cdp73.js'),
  @('bot',    'v78_bot.js',        'out78_bot.txt',          '--vp 1280x720 --reload', 'v73run.js'),
  @('pc',     'v78rrel_smoke.js',  'out78r_smoke_pc.txt',    '--vp 1280x720 --reload', 'cdp73.js'),
  @('ph',     'v78rrel_smoke.js',  'out78r_smoke_ph.txt',    '--phone2 --reload',      'cdp73.js'),
  @('fac',    'v78r_fac.js',       'out78r_fac_pc.txt',      '--vp 1280x720 --reload', 'v73run.js'),
  @('facph',  'v78r_facph.js',     'out78r_fac_ph.txt',      '--phone --reload',       'v73run.js'),
  @('cr',     'v78r_crater.js',    'out78r_crater.txt',      '--vp 1280x720 --reload', 'v73run.js'),
  @('xpc',    'v78rrel_extra.js',  'out78r_extra_pc.txt',    '--vp 1280x720 --reload', 'cdp73.js'),
  @('xph',    'v78rrel_extra.js',  'out78r_extra_ph.txt',    '--phone2 --reload',      'cdp73.js'),
  @('den',    'v78rrel_den.js',    'out78r_den_pc.txt',      '--vp 1280x720 --reload', 'cdp73.js')
)
foreach ($r in $runs){
  if ($Which -ne 'all' -and ($Which -split ',') -notcontains $r[0]){ continue }
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t78.ps1 $r[1] $r[2] -A $r[3] -Runner $r[4] -Target $Target | Out-Null
}
"== all done $(Get-Date -f HH:mm:ss) $Which" | Out-File D:\AI\pm_v6\tests\out78_all.txt -Encoding utf8
