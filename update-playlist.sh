#!/bin/sh
# Membuat music/playlist.js dari semua file audio di folder music (macOS/Linux)
cd "$(dirname "$0")" || exit 1
{
  echo '// Dibuat otomatis oleh update-playlist. Jalankan lagi setelah menambah atau menghapus lagu.'
  echo 'window.KENWAY_PLAYLIST = ['
  for f in music/*; do
    case "$f" in
      *.mp3|*.ogg|*.oga|*.wav|*.m4a|*.flac|*.aac|*.opus)
        esc=$(printf '%s' "$f" | sed 's/"/\\"/g')
        echo "  \"$esc\","
        ;;
    esac
  done
  echo '];'
} > music/playlist.js
echo "Selesai: music/playlist.js diperbarui"
