# ga_run.ps1 — фоновый прогон 3D-конвейера (Blender, CPU) по selection.json; прогресс в D:\AI\pm_assets\_work\ga_log.txt
param([string]$Sel = 'D:\AI\pm_assets\_work\selection.json', [string]$Only = '')
$b = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$a = @('-b', '--factory-startup', '-P', 'D:\AI\pm_3d\scripts\game_assets.py', '--', $Sel, 'D:\AI\pm_assets')
if ($Only){ $a += $Only }
Start-Process $b -ArgumentList $a -WindowStyle Hidden -RedirectStandardOutput D:\AI\pm_assets\_work\blender_out.txt -RedirectStandardError D:\AI\pm_assets\_work\blender_err.txt
