# v7.0: сборка + v70_feat + v70_shots -> tests\out70_c.txt
$o = 'D:\AI\pm_v6\tests\out70_c.txt'
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
"== start $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& $py D:\AI\pm_v6\wt70\build.py v70.html | Out-File $o -Append -Encoding utf8
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v70.html | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome70.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9243'
foreach ($t in @('v70_feat.js', 'v70_shots.js')){
  "`n===== $t $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  node cdp70.js $t --vp 1280x720 --reload 2>&1 | Out-File $o -Append -Encoding utf8
}
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
