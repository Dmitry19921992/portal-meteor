# v7.2: все 4 теста обучения подряд в фоне (-Only pc_rts,ph_fps — выборочно; -Build — пересобрать) -> tests\out72_tut.txt
param([string]$Only = '', [switch]$Build, [string]$Out = 'out72_tut.txt')
$o = "D:\AI\pm_v6\tests\$Out"
"== tut $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe" D:\AI\pm_v6\wt72\build.py v72.html 2>&1 | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v72.html 2>&1 | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9245'
$L = @(@('pc_fps','v72_pc_fps.js','--vp 1280x720 --reload'), @('pc_rts','v72_pc_rts.js','--vp 1280x720 --reload'), @('ph_fps','v72_ph_fps.js','--phone --reload'), @('ph_rts','v72_ph_rts.js','--phone --reload'), @('ph_fps_and','v72_ph_fps.js','--android --reload'), @('ph_rts_and','v72_ph_rts.js','--android --reload'))
foreach ($t in $L){
  if ($Only -and -not (($Only -split ',') -contains $t[0])){ continue }
  "`n===== $($t[0]) $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  node v72run.js $t[1] @($t[2] -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
}
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
