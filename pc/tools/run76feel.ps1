# run76feel.ps1 - builds dist\v76feel.html and runs the smoke test in several viewports (own Chrome CDP 9351), sequentially
param([string]$Which = 'all')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
& $py D:\AI\pm_v6\wt76feel\build.py v76feel.html | Out-File D:\AI\pm_v6\tests\out76feel_build.txt -Encoding utf8
$t = 'D:\AI\pm_v6\tests'
Set-Content "$t\v76feel_smoke_n.js" -Encoding UTF8 -Value ("window.__den0 = true;`n" + (Get-Content "$t\v76feel_smoke.js" -Raw -Encoding UTF8))
$runs = @(
  @('pc',  'v76feel_smoke.js',   'out76feel_smoke_pc.txt',  '--vp 1280x720 --reload'),
  @('pcN', 'v76feel_smoke_n.js', 'out76feel_smoke_pcN.txt', '--vp 1280x720 --reload'),
  @('ph',  'v76feel_smoke.js',   'out76feel_smoke_ph.txt',  '--phone2 --reload'),
  @('phP', 'v76feel_smoke.js',   'out76feel_smoke_phP.txt', '--phone2 --portrait --reload')
)
foreach ($r in $runs){
  if ($Which -ne 'all' -and ($Which -split ',') -notcontains $r[0]){ continue }
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t76feel.ps1 $r[1] $r[2] -A $r[3] | Out-Null
}
"== all done $(Get-Date -f HH:mm:ss)" | Out-File "$t\out76feel_all.txt" -Encoding utf8
