# v7.2gfx: проверка детерминизма: v71, old, old2 и попарные сравнения
$o = "D:\AI\pm_v6\tests\out72g_det.txt"
"== det $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
node cmp72g.js v71 http://127.0.0.1:8796/dist/v71.html old http://127.0.0.1:8796/dist/v72g.html#old old2 http://127.0.0.1:8796/dist/v72g.html#old 2>&1 | Select-String -Pattern 'tag|EXC|error' | Out-File $o -Append -Encoding utf8
$names = '1_fps_fire,2_boom_a,3_boom_b,4_boom_smoke,5_rts_base,8_crater,10_poly_wide'
"--- old vs old2" | Out-File $o -Append -Encoding utf8
node diff72g.js old old2 $names 2>&1 | Select-String -Pattern '"diff"|maxDelta' | Out-File $o -Append -Encoding utf8
"--- v71 vs old" | Out-File $o -Append -Encoding utf8
node diff72g.js v71 old $names 2>&1 | Select-String -Pattern '"diff"|maxDelta' | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
