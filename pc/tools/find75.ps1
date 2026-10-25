$out = 'D:\AI\pm_v6\tmp_find75.txt'
$pats = @('feedback-2026-10-24*','REPORT_v74*','release-size-rule*','v73-done*','ideas-2026-10-21*','*ЧТО_НОВОГО*','v68-localization*','feedback-2026-10-20-2351*','HANDOFF-2026-10-24*')
$roots = @('D:\AI','C:\Users\klaas\OneDrive\Рабочий стол','C:\Users\klaas\Documents','C:\Users\klaas\Downloads')
$res = foreach ($r in $roots) { Get-ChildItem -Path $r -Recurse -Depth 5 -Include $pats -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'chrome_|node_modules|\\.git\\' } | ForEach-Object { $_.FullName + ' | ' + $_.Length + ' | ' + $_.LastWriteTime } }
$res | Out-File -Encoding utf8 $out
'DONE' | Out-File -Append -Encoding utf8 $out
