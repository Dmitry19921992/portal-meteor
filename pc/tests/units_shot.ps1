param([string]$expr, [string]$shot)
$env:CDP_PORT = '9234'
node D:\AI\pm_tools\cdp.js -e "$expr; await new Promise(r => setTimeout(r, 1200)); return 1" v6_units | Out-Null
node D:\AI\pm_tools\cdp.js -e "return 1" v6_units --shot $shot | Out-Null
Write-Output "shot $shot"
