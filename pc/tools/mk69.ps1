# v6.9: копии тестовой обвязки v6.8 -> v6.9 (порты 8792/9242, профиль chrome_v69, dist/v69.html)
function CopyRep($src, $dst, $pairs, $bom){
  $t = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
  for ($i = 0; $i -lt $pairs.Count; $i += 2){ $t = $t.Replace($pairs[$i], $pairs[$i + 1]) }
  [IO.File]::WriteAllText($dst, $t, (New-Object Text.UTF8Encoding($bom)))
  "$dst  $($t.Length)"
}
$T = 'D:\AI\pm_v6\tools'; $S = 'D:\AI\pm_v6\tests'
CopyRep "$T\chrome68.ps1" "$T\chrome69.ps1" @('chrome_v68','chrome_v69','9241','9242','8791','8792','dist/v68.html','dist/v69.html') $true
CopyRep "$S\cdp68.js" "$S\cdp69.js" @('9241','9242','dist/v68.html','dist/v69.html') $false
CopyRep "$S\v61rts_cdp68.js" "$S\v61rts_cdp69.js" @('dist/v68.html','dist/v69.html') $false
CopyRep "$S\pcab68.js" "$S\pcab69.js" @('9241','9242') $false
CopyRep "$S\diff68.js" "$S\diff69.js" @('9241','9242','8791','8792') $false
CopyRep "$T\mtest68.ps1" "$T\mtest69.ps1" @('out_v68','out_v69','wt68\build.py v68.html','wt69\build.py v69.html','dist\v68.html','dist\v69.html','chrome68.ps1','chrome69.ps1',"'9241'","'9242'",'cdp68.js','cdp69.js','v61rts_cdp68.js','v61rts_cdp69.js',"'--port','9241'","'--port','9242'","cdp.js -e 'location.reload(); return 1' v68","cdp.js -e 'location.reload(); return 1' v69",",'v68')",",'v69')") $true
CopyRep "$T\pcab68.ps1" "$T\pcab69.ps1" @('out68_pcab','out69_pcab','wt68\build.py v68.html','wt69\build.py v69.html','chrome68.ps1','chrome69.ps1',"'9241'","'9242'",'pcab68.js','pcab69.js','diff68.js','diff69.js','v67a','v68a','v67b','v68b','8791/dist/v67.html','8792/dist/v68.html','v68 http://127.0.0.1:8791/dist/v68.html','v69 http://127.0.0.1:8792/dist/v69.html','"--- v68a vs v68"','"--- v68a vs v69"','v68a v68 $names','v68a v69 $names') $true
