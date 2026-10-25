param([switch]$Build)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out67_phoneall.txt"
"== phoneall $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt67\build.py v67.html | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v67.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome67.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
foreach ($v in @('--phone', '--android', '--phone2')){
  "`n===== v67_phone $v $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  node cdp67.js v67_phone.js $v --reload 2>&1 | Out-File $o -Append -Encoding utf8
  "`n===== v67_look $v $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  node cdp67.js v67_look.js $v --reload 2>&1 | Out-File $o -Append -Encoding utf8
}
"`n===== portrait $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
node cdp67.js -e "await sleep(1500); const r = document.getElementById('trot').getBoundingClientRect(); await shot('D:/AI/pm_v6/shots/v67_portrait.jpg'); return { trot: getComputedStyle(document.getElementById('trot')).display, w: innerWidth, h: innerHeight, r: [r.width, r.height] };" --phone --portrait --reload 2>&1 | Out-File $o -Append -Encoding utf8
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
