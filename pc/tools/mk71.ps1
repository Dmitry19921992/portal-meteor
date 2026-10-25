# v7.1: копии тестовой обвязки v7.0 -> v7.1 (порты 8794/9244, профиль chrome_v71, dist/v71.html)
function CopyRep($src, $dst, $pairs, $bom){
  $t = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
  for ($i = 0; $i -lt $pairs.Count; $i += 2){ $t = $t.Replace($pairs[$i], $pairs[$i + 1]) }
  [IO.File]::WriteAllText($dst, $t, (New-Object Text.UTF8Encoding($bom)))
  "$dst  $($t.Length)"
}
$T = 'D:\AI\pm_v6\tools'; $S = 'D:\AI\pm_v6\tests'
CopyRep "$T\chrome70.ps1" "$T\chrome71.ps1" @('chrome_v70','chrome_v71','9243','9244','8793','8794','dist/v70.html','dist/v71.html') $true
CopyRep "$S\cdp70.js" "$S\cdp71.js" @('9243','9244','dist/v70.html','dist/v71.html') $false
CopyRep "$S\v61rts_cdp70.js" "$S\v61rts_cdp71.js" @('dist/v70.html','dist/v71.html') $false
CopyRep "$S\pcab70.js" "$S\pcab71.js" @('9243','9244') $false
CopyRep "$S\diff70.js" "$S\diff71.js" @('9243','9244','8793','8794') $false
CopyRep "$T\mtest70.ps1" "$T\mtest71.ps1" @('out_v70','out_v71','wt70\build.py v70.html','wt71\build.py v71.html','dist\v70.html','dist\v71.html','chrome70.ps1','chrome71.ps1',"'9243'","'9244'",'cdp70.js','cdp71.js','v61rts_cdp70.js','v61rts_cdp71.js',"'--port','9243'","'--port','9244'","cdp.js -e 'location.reload(); return 1' v70","cdp.js -e 'location.reload(); return 1' v71",",'v70')",",'v71')") $true
CopyRep "$T\t70.ps1" "$T\t71.ps1" @('sync70.ps1','sync71.ps1','chrome70.ps1','chrome71.ps1',"'9243'","'9244'",'cdp70.js','cdp71.js') $true
CopyRep "$T\bench70.ps1" "$T\bench71.ps1" @('chrome70.ps1','chrome71.ps1',"'9243'","'9244'",'cdp70.js','cdp71.js','out70','out71') $true
'@ok'
