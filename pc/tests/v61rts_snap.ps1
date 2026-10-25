# снимок стратегии: v61rts_snap.ps1 <имя> '<JSON SHOT>'
param([string]$name = 'x', [string]$shot = '{}')
$env:CDP_PORT = 9232
node D:\AI\pm_tools\cdp.js -e "window.SHOT=$shot; return 1" v61_rts | Out-Null
node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\v61rts_shot.js v61_rts
node D:\AI\pm_tools\cdp.js -e "return 1" v61_rts --shot "D:\AI\pm_v6\shots\v61rts_$name.jpg" | Out-Null
