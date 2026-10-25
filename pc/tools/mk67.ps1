$bom = New-Object Text.UTF8Encoding($true); $nob = New-Object Text.UTF8Encoding($false)
function Cv($src, $dst, $enc){
  $t = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
  $t = $t.Replace("'v66'", "'v67'").Replace('v66.html', 'v67.html').Replace('wt66', 'wt67').Replace('9239', '9240').Replace('8789', '8790')
  $t = $t.Replace('chrome66.ps1', 'chrome67.ps1').Replace('v61rts_cdp66.js', 'v61rts_cdp67.js').Replace("'cdp66.js'", "'cdp67.js'").Replace('node cdp66.js', 'node cdp67.js').Replace('out_v66', 'out_v67').Replace('out66_', 'out67_').Replace('chrome_v66', 'chrome_v67')
  $t = $t.Replace("return 1' v66", "return 1' v67")
  [IO.File]::WriteAllText($dst, $t, $enc)
}
Cv D:\AI\pm_v6\tools\chrome66.ps1 D:\AI\pm_v6\tools\chrome67.ps1 $bom
Cv D:\AI\pm_v6\tools\mtest66.ps1 D:\AI\pm_v6\tools\mtest67.ps1 $bom
Cv D:\AI\pm_v6\tools\run66.ps1 D:\AI\pm_v6\tools\run67.ps1 $bom
Cv D:\AI\pm_v6\tests\cdp66.js D:\AI\pm_v6\tests\cdp67.js $nob
Cv D:\AI\pm_v6\tests\v61rts_cdp66.js D:\AI\pm_v6\tests\v61rts_cdp67.js $nob
Select-String D:\AI\pm_v6\tools\mtest67.ps1,D:\AI\pm_v6\tools\chrome67.ps1,D:\AI\pm_v6\tools\run67.ps1,D:\AI\pm_v6\tests\cdp67.js,D:\AI\pm_v6\tests\v61rts_cdp67.js -Pattern '66|67' | % { "$($_.Filename):$($_.LineNumber): $($_.Line.Trim())" }
