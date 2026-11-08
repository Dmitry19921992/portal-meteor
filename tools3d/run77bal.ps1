# run77bal.ps1 - v7.7 balance batches (bot vs bot, headless, accelerated) in OWN Chrome 9355 on dist/itch77/index.html
param([string]$Which = 'a,b,c,ctl')
foreach ($k in ($Which -split ',')){
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t77rel.ps1 "v77_bal_$k.js" "out77_bal_$k.txt" -A '--vp 1280x720 --reload' -Runner 'v73run.js' | Out-Null
}
"== bal done $(Get-Date -f HH:mm:ss)" | Out-File D:\AI\pm_v6\tests\out77_bal_all.txt -Encoding utf8