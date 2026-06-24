#!/usr/bin/env bash
# Sanity-check a cut chapter: transcribe its first few seconds and confirm it
# opens on the expected line. A correct duration sum proves nothing was lost; it
# does NOT prove a cut landed in the right place — this does.
#
# Usage:  check_boundary.sh <chapter.mp3> [seconds]   (default 7)
#
# Uses the fast base.en model — plenty for a few-second sanity check.

set -euo pipefail

IN="${1:?usage: check_boundary.sh <chapter.mp3> [seconds]}"
SECS="${2:-7}"
MODELS_DIR="${WHISPER_MODELS_DIR:-$HOME/.whisper-models}"
MODEL="$MODELS_DIR/ggml-base.en.bin"

command -v ffmpeg      >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)"; exit 1; }
command -v whisper-cli >/dev/null || { echo "whisper-cli not found (brew install whisper-cpp)"; exit 1; }

if [ ! -f "$MODEL" ]; then
  echo "Downloading base.en model (~142MB) to $MODEL ..."
  mkdir -p "$MODELS_DIR"
  curl -L -s -o "$MODEL" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
fi

WAV="/tmp/chk.$$.wav"
trap 'rm -f "$WAV"' EXIT
ffmpeg -nostdin -loglevel error -y -i "$IN" -t "$SECS" -ar 16000 -ac 1 "$WAV"
whisper-cli -m "$MODEL" -f "$WAV" -nt 2>/dev/null
