# v7.2: копии тестовой обвязки v7.1 -> v7.2 (порты 8797/9245, профиль chrome_v72, dist/v72.html)
function CopyRep($src, $dst, $pairs, $bom){
  $t = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
  for ($i = 0; $i -lt $pairs.Count; $i += 2){ $t = $t.Replace($pairs[$i], $pairs[$i + 1]) }
  [IO.File]::WriteAllText($dst, $t, (New-Object Text.UTF8Encoding($bom)))
  "$dst  $($t.Length)"
}
$T = 'D:\AI\pm_v6\tools'; $S = 'D:\AI\pm_v6\tests'
CopyRep "$T\chrome71.ps1" "$T\chrome72.ps1" @('chrome_v71','chrome_v72','9244','9245','8794','8797','dist/v71.html','dist/v72.html') $true
CopyRep "$S\cdp71.js" "$S\cdp72.js" @('9244','9245','dist/v71.html','dist/v72.html') $false
CopyRep "$S\v61rts_cdp71.js" "$S\v61rts_cdp72.js" @('dist/v71.html','dist/v72.html') $false
CopyRep "$S\pcab71.js" "$S\pcab72.js" @('9244','9245') $false
CopyRep "$S\diff71.js" "$S\diff72.js" @('9244','9245','8794','8797') $false
CopyRep "$T\mtest71.ps1" "$T\mtest72.ps1" @('out_v71','out_v72','wt71\build.py v71.html','wt72\build.py v72.html','dist\v71.html','dist\v72.html','chrome71.ps1','chrome72.ps1',"'9244'","'9245'",'cdp71.js','cdp72.js','v61rts_cdp71.js','v61rts_cdp72.js',"'--port','9244'","'--port','9245'","cdp.js -e 'location.reload(); return 1' v71","cdp.js -e 'location.reload(); return 1' v72",",'v71')",",'v72')") $true
CopyRep "$T\t71.ps1" "$T\t72.ps1" @('sync71.ps1','sync72.ps1','chrome71.ps1','chrome72.ps1',"'9244'","'9245'",'cdp71.js','cdp72.js') $true
CopyRep "$T\r71.ps1" "$T\r72.ps1" @('out71_r','out72_r','wt71\build.py v71.html','wt72\build.py v72.html','dist\v71.html','dist\v72.html','chrome71.ps1','chrome72.ps1',"'9244'","'9245'",'cdp71.js','cdp72.js') $true
CopyRep "$T\pcab71.ps1" "$T\pcab72.ps1" @('out71_pcab','out72_pcab','wt71\build.py v71.html','wt72\build.py v72.html','chrome71.ps1','chrome72.ps1',"'9244'","'9245'",'pcab71.js','pcab72.js','diff71.js','diff72.js','8794','8797') $true
'@ok'
