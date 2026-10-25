# runtests75r.ps1 — по очереди прогоняет тесты v7.5 + денди + 3D-моделей на сборке релиза (dist/v75r.html, Chrome 9340)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
& $py D:\AI\pm_v6\wt75r\build.py v75r.html | Out-File D:\AI\pm_v6\tests\out75r_build.txt -Encoding utf8
$L = @(
  @('v75_rpc.js', 'out75r_pc.txt', '--vp 1280x720 --reload'),
  @('v75_rbuild.js', 'out75r_buildE.txt', '--vp 1280x720'),
  @('v75_rcine.js', 'out75r_cine.txt', '--vp 1280x720 --reload'),
  @('r75d_smoke.js', 'out75r_dsmoke.txt', '--vp 1280x720 --reload'),
  @('r75a_smoke.js', 'out75r_asmoke.txt', '--vp 1280x720 --reload'),
  @('v75_rph.js', 'out75r_ph14.txt', '--phone --reload'),
  @('r75d_phone.js', 'out75r_dphone.txt', '--phone2 --reload')
)
foreach ($t in $L){
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t75r.ps1 -Test $t[0] -Out $t[1] -A $t[2]
}
"== all done $(Get-Date -f HH:mm:ss)" | Out-File D:\AI\pm_v6\tests\out75r_alldone.txt -Encoding utf8
