$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out67_phoneb.txt"
"== phoneb $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& $py D:\AI\pm_v6\wt67\build.py v67.html | Out-File $o -Append -Encoding utf8
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v67.html | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
foreach ($v in @('--phone', '--phone2', '--android')){
  "`n===== v67_phone $v $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  node cdp67.js v67_phone.js $v --reload 2>&1 | Out-File $o -Append -Encoding utf8
}
"`n===== portrait" | Out-File $o -Append -Encoding utf8
node cdp67.js -e "await sleep(1500); await shot('D:/AI/pm_v6/shots/v67_portrait.jpg'); return getComputedStyle(document.getElementById('trot')).display;" --phone --portrait --reload 2>&1 | Out-File $o -Append -Encoding utf8
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
