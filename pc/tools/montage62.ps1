# montage62.ps1 out.jpg img1 img2 ... — сетка 2 колонки по 640x360 (ffmpeg xstack)
param([string]$out, [Parameter(ValueFromRemainingArguments = $true)][string[]]$imgs)
$n = $imgs.Count; $args2 = @('-y', '-loglevel', 'error')
foreach ($i in $imgs){ $args2 += @('-i', $i) }
$f = ''; $lay = @()
for ($k = 0; $k -lt $n; $k++){ $f += "[$k`:v]scale=640:360[v$k];"; $lay += ('{0}_{1}' -f (($k % 2) * 640), ([math]::Floor($k / 2) * 360)) }
$ins = (0..($n - 1) | % { "[v$_]" }) -join ''
if ($n -eq 1){ $f += "[v0]copy[o]" } else { $f += "$ins" + "xstack=inputs=$n`:layout=" + ($lay -join '|') + ":fill=black[o]" }
$args2 += @('-filter_complex', $f, '-map', '[o]', '-frames:v', '1', '-q:v', '3', $out)
& ffmpeg @args2
"ok $out"
