param([string]$name, [Parameter(ValueFromRemainingArguments=$true)]$rest)
# Запуск CDP-теста в фоне: вывод в D:\AI\pm_v6\tests\out_rtsui_<name>.txt (потом читаем файл)
$out = "D:\AI\pm_v6\tests\out_rtsui_$name.txt"
Remove-Item $out -EA 0
$argl = @('D:\AI\pm_v6\tests\rtsui_cdp.js') + $rest
Start-Process node -ArgumentList $argl -RedirectStandardOutput $out -RedirectStandardError "$out.err" -WindowStyle Hidden -WorkingDirectory D:\AI\pm_v6\tests
"started $name"
