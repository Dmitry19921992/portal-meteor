# crop66.ps1 out.jpg x y w h scale in1.jpg in2.jpg ... — вырезать одну область из нескольких скриншотов и склеить в ряд
param([string]$Out, [int]$X, [int]$Y, [int]$W, [int]$H, [double]$Scale = 2, [Parameter(ValueFromRemainingArguments = $true)][string[]]$In)
Add-Type -AssemblyName System.Drawing
$imgs = $In | ? { Test-Path $_ } | % { [Drawing.Image]::FromFile($_) }
$ow = [int]($W * $Scale); $oh = [int]($H * $Scale)
$bmp = New-Object Drawing.Bitmap ($ow * $imgs.Count), $oh
$g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'
for ($i = 0; $i -lt $imgs.Count; $i++){ $g.DrawImage($imgs[$i], (New-Object Drawing.Rectangle ($i * $ow), 0, $ow, $oh), (New-Object Drawing.Rectangle $X, $Y, $W, $H), [Drawing.GraphicsUnit]::Pixel) }
$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | ? { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object Drawing.Imaging.EncoderParameters 1; $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 88L
$bmp.Save($Out, $codec, $ep); $imgs | % { $_.Dispose() }
"saved $Out"
