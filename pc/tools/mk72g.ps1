# v7.2gfx: копии тестовой обвязки v7.1 -> v7.2gfx (порты 8796/9246, профиль chrome_v72g, dist/v72g.html)
function CopyRep($src, $dst, $pairs, $bom){
  $t = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
  for ($i = 0; $i -lt $pairs.Count; $i += 2){ $t = $t.Replace($pairs[$i], $pairs[$i + 1]) }
  [IO.File]::WriteAllText($dst, $t, (New-Object Text.UTF8Encoding($bom)))
  "$dst  $($t.Length)"
}
$T = 'D:\AI\pm_v6\tools'; $S = 'D:\AI\pm_v6\tests'
CopyRep "$T\chrome71.ps1" "$T\chrome72g.ps1" @('chrome_v71','chrome_v72g','9244','9246','8794','8796','dist/v71.html','dist/v72g.html') $true
CopyRep "$S\cdp71.js" "$S\cdp72g.js" @('9244','9246','dist/v71.html','dist/v72g.html') $false
CopyRep "$S\v61rts_cdp71.js" "$S\v61rts_cdp72g.js" @('dist/v71.html','dist/v72g.html') $false
CopyRep "$S\pcab71.js" "$S\pcab72g.js" @('9244','9246','shots/pcab/','shots/pcab72g/') $false
CopyRep "$S\diff71.js" "$S\diff72g.js" @('9244','9246','8794','8796','shots/pcab/','shots/pcab72g/') $false
CopyRep "$T\mtest71.ps1" "$T\mtest72g.ps1" @('out_v71','out_v72g','wt71\build.py v71.html','wt72gfx\build.py v72g.html','dist\v71.html','dist\v72g.html','chrome71.ps1','chrome72g.ps1',"'9244'","'9246'",'cdp71.js','cdp72g.js','v61rts_cdp71.js','v61rts_cdp72g.js',"'--port','9244'","'--port','9246'","cdp.js -e 'location.reload(); return 1' v71","cdp.js -e 'location.reload(); return 1' v72g",",'v71')",",'v72g')") $true
CopyRep "$T\r71.ps1" "$T\r72g.ps1" @('out71_r','out72g_r','wt71\build.py v71.html','wt72gfx\build.py v72g.html','dist\v71.html','dist\v72g.html','chrome71.ps1','chrome72g.ps1',"'9244'","'9246'",'cdp71.js','cdp72g.js') $true
'@ok'
