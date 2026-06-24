#!/usr/bin/env bash
# Transcribe a long narrated MP3 to a timestamped SRT, tuned to survive
# music-scored audio (Disney Storyteller records) without falling into a
# repetition loop.
#
# Usage:  transcribe.sh <input.mp3> [output_srt_prefix]
# Output: <prefix>.srt  (default prefix: /tmp/<basename>)
#
# Why these choices:
#   - whisper.cpp's base model reliably hallucinates a "the other, the other..."
#     repetition loop over the long musical numbers and never recovers, silently
#     swallowing ~20 min of plot. small.en + "-mc 0" (no decoder context carried
#     between windows) breaks that loop; "-et 2.8" lets the decoder bail and
#     retry on a bad window instead of committing to garbage.
#   - whisper.cpp wants 16 kHz mono PCM, so we convert first.

set -euo pipefail

IN="${1:?usage: transcribe.sh <input.mp3> [output_prefix]}"
BASE="$(basename "${IN%.*}")"
PREFIX="${2:-/tmp/$BASE}"
MODELS_DIR="${WHISPER_MODELS_DIR:-$HOME/.whisper-models}"
MODEL="$MODELS_DIR/ggml-small.en.bin"

command -v ffmpeg   >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)"; exit 1; }
command -v whisper-cli >/dev/null || { echo "whisper-cli not found (brew install whisper-cpp)"; exit 1; }

# Fetch the model on first use.
if [ ! -f "$MODEL" ]; then
  echo "Downloading small.en model (~466MB) to $MODEL ..."
  mkdir -p "$MODELS_DIR"
  curl -L -s -o "$MODEL" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin"
fi

WAV="/tmp/${BASE}.16k.wav"
echo "Converting to 16kHz mono WAV ..."
ffmpeg -nostdin -loglevel error -y -i "$IN" -ar 16000 -ac 1 -c:a pcm_s16le "$WAV"

echo "Transcribing (small.en, anti-loop) ..."
whisper-cli -m "$MODEL" -f "$WAV" -mc 0 -et 2.8 -osrt -of "$PREFIX"

echo "Transcript written to ${PREFIX}.srt"
