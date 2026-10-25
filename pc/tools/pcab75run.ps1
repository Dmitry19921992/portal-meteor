# pcab75run.ps1 - only the browser part of pcab75.ps1 (builds already done), each run in its own node call, fresh Chrome first
$o = "D:\AI\pm_v6\tests\out75_pcab.txt"
"== pcab75run $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75.ps1 restart | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9338'
$u = 'http://127.0.0.1:8838/dist/'
$runs = @(@('warm', "${u}v75_base.html"), @('d0base', "${u}v75_base.html"), @('d0new', "${u}v75.html?core75=1&field75=0"), @('d0base2', "${u}v75_base.html"), @('d1new', "${u}v75.html"))
foreach ($r in $runs){
  "-- run $($r[0]) $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  $p = Start-Process node -ArgumentList 'pcab75.js', $r[0], ('"' + $r[1] + '"') -NoNewWindow -PassThru -RedirectStandardOutput "D:\AI\pm_v6\tests\pcab75_$($r[0]).log" -RedirectStandardError "D:\AI\pm_v6\tests\pcab75_$($r[0]).err"
  if (-not $p.WaitForExit(600000)){ Stop-Process -Id $p.Id -Force; "TIMEOUT $($r[0])" | Out-File $o -Append -Encoding utf8 }
  Get-Content "D:\AI\pm_v6\tests\pcab75_$($r[0]).log", "D:\AI\pm_v6\tests\pcab75_$($r[0]).err" -ErrorAction SilentlyContinue | Select-Object -First 30 | Out-File $o -Append -Encoding utf8
}
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- base vs base2 (control)" | Out-File $o -Append -Encoding utf8
node diff75.js d0base d0base2 $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new (core back, field off) - fps/rts must be 0" | Out-File $o -Append -Encoding utf8
node diff75.js d0base d0new $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new defaults (info)" | Out-File $o -Append -Encoding utf8
node diff75.js d0base d1new $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
