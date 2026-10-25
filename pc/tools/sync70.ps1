# v7.0: забрать файлы из _tmp_cl\w70 в рабочую копию wt70 и собрать dist\v70.html (release70.ps1 -> D:\AI\pm_tools)
$src = "C:\Users\klaas\OneDrive\Рабочий стол\portal meteor\_tmp_cl\w70"
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
Get-ChildItem $src -File | % {
  if ($_.Extension -eq '.ps1'){ Copy-Item $_.FullName (Join-Path 'D:\AI\pm_tools' $_.Name) -Force; "tool $($_.Name)" }
  else { Copy-Item $_.FullName (Join-Path 'D:\AI\pm_v6\wt70' $_.Name) -Force; "copied $($_.Name)" }
}
& $py D:\AI\pm_v6\wt70\build.py v70.html
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v70.html
