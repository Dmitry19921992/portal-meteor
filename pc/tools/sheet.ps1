# sheet.ps1 out.jpg cols scale in1.jpg in2.jpg ... — склейка скриншотов в одну картинку
param([string]$Out, [int]$Cols = 3, [double]$Scale = 0.5, [Parameter(ValueFromRemainingArguments = $true)][string[]]$In)
Add-Type -AssemblyName System.Drawing
$imgs = $In | ? { Test-Path $_ } | % { [Drawing.Image]::FromFile($_) }
$w = [int]($imgs[0].Width * $Scale); $h = [int]($imgs[0].Height * $Scale)
$rows = [math]::Ceiling($imgs.Count / $Cols)
$bmp = New-Object Drawing.Bitmap ($w * $Cols), ($h * $rows)
$g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'
for ($i = 0; $i -lt $imgs.Count; $i++){ $g.DrawImage($imgs[$i], ($i % $Cols) * $w, [math]::Floor($i / $Cols) * $h, $w, $h); $g.DrawString([IO.Path]::GetFileNameWithoutExtension($In[$i]), (New-Object Drawing.Font 'Arial', 11), [Drawing.Brushes]::Yellow, ($i % $Cols) * $w + 4, [math]::Floor($i / $Cols) * $h + 4) }
$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | ? { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object Drawing.Imaging.EncoderParameters 1; $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 85L
$bmp.Save($Out, $codec, $ep); $imgs | % { $_.Dispose() }
"saved $Out"
