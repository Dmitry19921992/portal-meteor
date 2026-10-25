# sheet70.ps1 — лист скриншотов v7.0: картинки и подписи из sheet70.json ([[файл, подпись], ...]), пропорции сохраняются
param([string]$Out, [string]$List = 'D:\AI\pm_v6\tools\sheet70.json', [int]$Cols = 4, [int]$W = 640, [int]$H = 360)
Add-Type -AssemblyName System.Drawing
$items = [IO.File]::ReadAllText($List, [Text.Encoding]::UTF8) | ConvertFrom-Json
$rows = [math]::Ceiling($items.Count / $Cols)
$bmp = New-Object Drawing.Bitmap ($W * $Cols), ($H * $rows)
$g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.Clear([Drawing.Color]::Black)
$font = New-Object Drawing.Font 'Segoe UI', 13, ([Drawing.FontStyle]::Bold)
$bg = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(170, 0, 0, 0))
for ($i = 0; $i -lt $items.Count; $i++){
  $f = $items[$i][0]; if (-not (Test-Path $f)){ "missing $f"; continue }
  $im = [Drawing.Image]::FromFile($f)
  $k = [math]::Min($W / $im.Width, $H / $im.Height); $dw = [int]($im.Width * $k); $dh = [int]($im.Height * $k)
  $x = ($i % $Cols) * $W; $y = [math]::Floor($i / $Cols) * $H
  $g.DrawImage($im, $x + [int](($W - $dw) / 2), $y + [int](($H - $dh) / 2), $dw, $dh); $im.Dispose()
  $sz = $g.MeasureString($items[$i][1], $font)
  $g.FillRectangle($bg, $x + 4, $y + 4, $sz.Width + 8, $sz.Height + 2)
  $g.DrawString($items[$i][1], $font, [Drawing.Brushes]::Yellow, $x + 8, $y + 5)
}
$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | ? { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object Drawing.Imaging.EncoderParameters 1; $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 86L
$bmp.Save($Out, $codec, $ep)
"saved $Out $((Get-Item $Out).Length)"
