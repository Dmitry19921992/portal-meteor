# chrome_kill.ps1 - закрывает ТОЛЬКО headless Chrome T34 (профиль chrome_t34) по PID-файлу tests34\chrome_t34.pid.
# Никогда не трогает chrome.exe целиком: taskkill строго по PID из файла + страховочная проверка командной строки.
$pidFile = 'D:\AI\pm_v6\wt_t34\tests34\chrome_t34.pid'
if (-not (Test-Path $pidFile)){ "no pid file $pidFile - nothing to kill"; exit }
$id = (Get-Content $pidFile -Raw).Trim()
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
if ($id -notmatch '^\d+$'){ "bad pid '$id' - nothing to kill"; exit }
$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction SilentlyContinue
if (-not $proc){ "pid $id not running"; exit }
if ($proc.Name -ne 'chrome.exe'){ "pid $id is $($proc.Name), not our chrome - не трогаем"; exit }
if ($proc.CommandLine -notmatch 'user-data-dir=D:.AI.pm_v6.wt_t34.chrome_t34(\s|"|$)'){ "pid $id chrome without chrome_t34 profile - не трогаем"; exit }
taskkill /PID $id /T /F | Out-Null
"killed chrome pid $id (chrome_t34)"
