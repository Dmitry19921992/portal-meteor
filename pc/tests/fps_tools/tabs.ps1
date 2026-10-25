# tabs.ps1 — оставить одну вкладку headless-Chrome ветки fps (CDP 9231) и открыть в ней url
param([string]$url = 'http://127.0.0.1:8781/dist/v6_fps.html')
$list = Invoke-RestMethod http://127.0.0.1:9231/json
$pages = @($list | ? { $_.type -eq 'page' })
for ($i = 1; $i -lt $pages.Count; $i++) { Invoke-RestMethod "http://127.0.0.1:9231/json/close/$($pages[$i].id)" | Out-Null }
$p = $pages[0]
Invoke-RestMethod "http://127.0.0.1:9231/json/activate/$($p.id)" | Out-Null
$env:CDP_PORT = 9231
$sub = ($p.url -split '/')[-1]
node D:\AI\pm_tools\cdp.js -e "location.href='$url'; return 1" $sub
"now: $url (closed $($pages.Count - 1))"
