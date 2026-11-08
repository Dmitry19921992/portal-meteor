# Build -> preview folder -> IWER test copy -> (optional) scenarios. Log: tests_vrmain\pipeline.log
#   powershell -File tools_vrmain\pipeline.ps1 [-Scen xr,flat,phone] [-NoBuild]
param([string[]]$Scen = @(), [switch]$NoBuild, [string]$Tag = (Get-Date -Format 'HHmm'))
$w = 'D:\AI\pm_v6\wt_vrmain'; Set-Location $w
$Scen = @($Scen | ForEach-Object { $_ -split ',' } | Where-Object { $_ })   # -File passes "a,b" as one string
$py = 'D:\AI\pm_rate\venv\Scripts\python.exe'; $lg = "$w\tests_vrmain\pipeline.log"
function L($m) { $s = (Get-Date -Format 'HH:mm:ss') + ' ' + $m; Add-Content $lg $s; $s }
if (-not $NoBuild) {
  L 'build'; & $py build.py vrmain_src.html *>> $lg
  & $py tools106\mkpreview.py D:\AI\pm_v6\dist\vrmain_src.html --out D:/AI/pm_v6/dist/preview_vrmain --repo $w *>> $lg
  & $py tools_vrmain\mktest.py D:\AI\pm_v6\dist\preview_vrmain D:\AI\pm_v6\dist\preview_vrmain_test D:\AI\pm_vr\node_modules\iwer\build\iwer.min.js *>> $lg
  L 'build done'
}
foreach ($s in $Scen) {
  if ($s -eq 'xr') { L 'run xr'; & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\run.ps1" -Scen xr -Url 'http://127.0.0.1:8819/' -Out "tests_vrmain\xr_$Tag" *>> $lg }
  if ($s -eq 'flat') { L 'run pc'; & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\run.ps1" -Scen flat -Url 'http://127.0.0.1:8820/' -Out "tests_vrmain\pc_$Tag" -Size 1280x720 *>> $lg }
  if ($s -eq 'phone') { L 'run phone'; & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\run.ps1" -Scen flat -Url 'http://127.0.0.1:8820/' -Out "tests_vrmain\phone_$Tag" -Size 390x844 -Mobile *>> $lg }
  if ($s -eq 'pcoff') { L 'run pc ?vr=0'; & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\run.ps1" -Scen flat -Url 'http://127.0.0.1:8820/?vr=0' -Out "tests_vrmain\pcoff_$Tag" -Size 1280x720 *>> $lg }
  if ($s -eq 'xrq') { L 'run xr with the Quest UA (Q820 preset)'; & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\run.ps1" -Scen xr -Url 'http://127.0.0.1:8819/' -Out "tests_vrmain\xrq_$Tag" -Quest *>> $lg }
  if ($s -eq 'quest') { L 'run quest UA (2D page on Quest)'; & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\run.ps1" -Scen flat -Url 'http://127.0.0.1:8820/' -Out "tests_vrmain\quest_$Tag" -Size 1280x720 -Quest *>> $lg }
  if ($s -eq 'pcmem') { L 'run pc ?quest=0 memory baseline'; & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\run.ps1" -Scen flat -Url 'http://127.0.0.1:8820/' -Out "tests_vrmain\pc_$Tag" -Size 1280x720 *>> $lg }
  L "done $s"
}
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'wt_vrmain\\chrome_xr' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }   # rule: close the own browser when done
L 'pipeline end'
