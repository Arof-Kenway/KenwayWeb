# Membuat music\playlist.js dari semua file audio di folder music
$dir = Join-Path $PSScriptRoot 'music'
$items = Get-ChildItem -Path $dir -File | Where-Object { $_.Extension -match '^\.(mp3|ogg|oga|wav|m4a|flac|aac|opus)$' } | Sort-Object Name
$lines = @('// Dibuat otomatis oleh update-playlist. Jalankan lagi setelah menambah atau menghapus lagu.', 'window.KENWAY_PLAYLIST = [')
foreach ($f in $items) {
    $name = $f.Name.Replace('\', '/').Replace('"', '\"')
    $lines += ('  "music/' + $name + '",')
}
$lines += '];'
Set-Content -Path (Join-Path $dir 'playlist.js') -Value $lines -Encoding UTF8
Write-Host ('Selesai: ' + $items.Count + ' lagu ditulis ke music\playlist.js')
