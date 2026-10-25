# v6.8: копии тестовой обвязки v6.7 -> v6.8 (порты 8791/9241, профиль chrome_v68, dist/v68.html)
function CopyRep($src, $dst, $pairs, $bom){
  $t = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
  for ($i = 0; $i -lt $pairs.Count; $i += 2){ $t = $t.Replace($pairs[$i], $pairs[$i + 1]) }
  [IO.File]::WriteAllText($dst, $t, (New-Object Text.UTF8Encoding($bom)))
  "$dst  $($t.Length)"
}
$T = 'D:\AI\pm_v6\tools'; $S = 'D:\AI\pm_v6\tests'
CopyRep "$T\chrome67.ps1" "$T\chrome68.ps1" @('chrome_v67','chrome_v68','9240','9241','8790','8791','dist/v67.html','dist/v68.html') $true
CopyRep "$S\cdp67.js" "$S\cdp68.js" @('9240','9241','dist/v67.html','dist/v68.html') $false
CopyRep "$S\v61rts_cdp67.js" "$S\v61rts_cdp68.js" @('dist/v67.html','dist/v68.html') $false
CopyRep "$S\pcab67.js" "$S\pcab68.js" @('9240','9241') $false
CopyRep "$S\diff67.js" "$S\diff68.js" @('9240','9241','8790','8791') $false
CopyRep "$T\mtest67.ps1" "$T\mtest68.ps1" @('out_v67','out_v68','wt67\build.py v67.html','wt68\build.py v68.html','dist\v67.html','dist\v68.html','chrome67.ps1','chrome68.ps1',"'9240'","'9241'",'cdp67.js','cdp68.js','v61rts_cdp67.js','v61rts_cdp68.js',"'--port','9240'","'--port','9241'","cdp.js -e 'location.reload(); return 1' v67","cdp.js -e 'location.reload(); return 1' v68",",'v67')",",'v68')") $true
CopyRep "$T\pcab67.ps1" "$T\pcab68.ps1" @('out67_pcab','out68_pcab','wt67\build.py v67.html','wt68\build.py v68.html','chrome67.ps1','chrome68.ps1',"'9240'","'9241'",'pcab67.js','pcab68.js','diff67.js','diff68.js') $true
