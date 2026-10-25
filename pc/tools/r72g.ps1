# v7.1: тесты подряд в фоне -> tests\<Out>.  -L "test.js|--phone --reload;test2.js|--android --reload"  (-Build: пересобрать)
param([string]$L, [string]$Out = 'out72g_r.txt', [switch]$Build)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\$Out"
"== start $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt72gfx\build.py v72g.html 2>&1 | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v72g.html 2>&1 | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
foreach ($t in ($L -split '[;+]')){
  if (-not $t){ continue }
  $p = $t -split '\|'
  "`n===== $($p[0]) $($p[1]) $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  $r = node cdp72g.js $p[0] @($p[1] -split ' ') 2>&1
  if (($r -join "`n") -match 'NO TARGET'){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 restart | Out-Null; Start-Sleep 15; $r = node cdp72g.js $p[0] @($p[1] -split ' ') 2>&1 }
  $r | Out-File $o -Append -Encoding utf8
}
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
