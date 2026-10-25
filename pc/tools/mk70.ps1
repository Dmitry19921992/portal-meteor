# v7.0: копии тестовой обвязки v6.9 -> v7.0 (порты 8793/9243, профиль chrome_v70, dist/v70.html)
function CopyRep($src, $dst, $pairs, $bom){
  $t = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
  for ($i = 0; $i -lt $pairs.Count; $i += 2){ $t = $t.Replace($pairs[$i], $pairs[$i + 1]) }
  [IO.File]::WriteAllText($dst, $t, (New-Object Text.UTF8Encoding($bom)))
  "$dst  $($t.Length)"
}
$T = 'D:\AI\pm_v6\tools'; $S = 'D:\AI\pm_v6\tests'
CopyRep "$T\chrome69.ps1" "$T\chrome70.ps1" @('chrome_v69','chrome_v70','9242','9243','8792','8793','dist/v69.html','dist/v70.html') $true
CopyRep "$S\cdp69.js" "$S\cdp70.js" @('9242','9243','dist/v69.html','dist/v70.html') $false
CopyRep "$S\v61rts_cdp69.js" "$S\v61rts_cdp70.js" @('dist/v69.html','dist/v70.html') $false
CopyRep "$S\pcab69.js" "$S\pcab70.js" @('9242','9243') $false
CopyRep "$S\diff69.js" "$S\diff70.js" @('9242','9243','8792','8793') $false
CopyRep "$T\mtest69.ps1" "$T\mtest70.ps1" @('out_v69','out_v70','wt69\build.py v69.html','wt70\build.py v70.html','dist\v69.html','dist\v70.html','chrome69.ps1','chrome70.ps1',"'9242'","'9243'",'cdp69.js','cdp70.js','v61rts_cdp69.js','v61rts_cdp70.js',"'--port','9242'","'--port','9243'","cdp.js -e 'location.reload(); return 1' v69","cdp.js -e 'location.reload(); return 1' v70",",'v69')",",'v70')") $true
