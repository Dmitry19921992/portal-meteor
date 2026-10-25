# fps_shots.ps1 — скриншоты ветки fps: стрельба, прицел, рельса, перелёт камеры
$env:CDP_PORT = 9231
$c = 'D:\AI\pm_tools\cdp.js'
$o = 'D:\AI\pm_v6\tests\out\fps_shots.txt'
"" | Out-File $o -Encoding utf8
foreach ($m in @('fire', 'ads', 'rail', 'xfer')) {
  node $c -e "window.SHOTMODE='$m'; return 1" v6_fps | Out-Null
  $r = node $c D:\AI\pm_v6\tests\fps_shot_setup.js v6_fps
  "$m : $r" | Out-File $o -Append -Encoding utf8
  node $c -e "return 1" v6_fps --shot "D:\AI\pm_v6\shots\fps_$m.jpg" | Out-Null
  node $c -e "mouseL=false; mouseR=false; return 1" v6_fps | Out-Null
}
"done" | Out-File $o -Append -Encoding utf8
