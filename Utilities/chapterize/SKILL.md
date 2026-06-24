---
name: chapterize
description: >-
  Split a long Disney "Storyteller" narrated MP3 (or a similar single-file
  narrated story/audiobook) into per-chapter MP3 files by transcribing it and
  cutting on story beats and song numbers. Use this whenever the user wants to
  divide, chapterize, segment, or split a Storyteller / read-along / audiobook
  recording into chapters or tracks — even if they only say "break this mp3 into
  chapters", "find logical chapter breaks", or name a Disney Storyteller file.
  Reach for it any time the request is "turn one long spoken-word audio file into
  several scene/chapter files," since naive silence-splitting fails on these
  music-scored records.
---

# Chapterize

Disney Storyteller (and read-along) records are one continuous MP3 of a narrator
telling a film's story, interleaved with the film's songs. The goal is to cut
that one file into logical chapter MP3s — one per story beat / song.

## Why not just split on silence
`silencedetect` → cut on the gaps fails here: the narration runs over
near-continuous underscore, so true silences are rare and land in arbitrary
places (you'll get a 14-min "chapter 1" beside a 2-min "chapter 3"). The reliable
signal is the **content** — scene-opening narration ("Back in the village…",
"Meanwhile…") and the first line of each musical number. So: transcribe → read
the story → cut on beats. Silence detection only *nudges* a chosen cut into the
nearest pause so it doesn't clip a word; `cut_chapters.py` does that for you.
Your job is choosing *where* the beats are.

## Workflow

### 1. Probe the file
```bash
ffprobe -v quiet -print_format json -show_format -show_chapters "INPUT.mp3"
```
Note `duration` (you'll verify against it at the end). If `chapters` is already
populated, the file has embedded markers — tell the user and offer to split on
those directly instead of transcribing.

### 2. Transcribe
```bash
scripts/transcribe.sh "INPUT.mp3"        # -> /tmp/<basename>.srt
```
Converts to 16 kHz mono and runs whisper.cpp (`small.en`) with anti-loop flags.
**If you see a long run of identical repeated phrases in the SRT**, the decoder
fell into a repetition loop and silently dropped plot — re-run (the script's
flags prevent it) or try `medium.en` before trusting the transcript. A 40–45 min
file takes a few minutes; run it in the background and wait.

### 3. Read the transcript and choose chapter breaks
Read the whole `.srt` and identify the story's beats. A Storyteller record almost
always decomposes into a prologue, each major scene, and each song as its own
chapter. Your boundaries are the narrator's scene-transition phrasings and the
first line of each musical number.

Anchor each chapter's **start** at the timestamp of its scene-opening SRT segment
(the first word of the new scene). Use that timestamp as-is — don't hand-place
the cut inside the preceding pause; the script snaps it for you, so slightly
early is fine. Aim for coherent scenes, not uniform lengths — a 1:51 prologue
beside a 7:23 song medley is correct if that's how the story divides.

### 4. Write the chapter plan
Copy `templates/chapters.tsv` to `/tmp/<basename>.chapters.tsv` and fill it in —
one `start<TAB>Title` line per chapter (the template documents the format). Give
content-based titles (scene or song name, e.g. `Be Our Guest`), not "Chapter 1".

### 5. Cut
```bash
scripts/cut_chapters.py "INPUT.mp3" /tmp/<basename>.chapters.tsv
```
Stream-copies each segment (lossless, fast), tags it, and writes `NN - Title.mp3`
into a new `"<Album> - Chapters"` folder beside the source — leaving the original
untouched. Before cutting it **snaps each interior boundary into the nearest
pause** (so a chapter never ends mid-sentence and tracks play back-to-back with
no gap) and prints what moved; afterward it **verifies the chapter durations sum
to the source** and fails loudly on drift. Run with `--help` for snap-tuning
flags (`--no-snap`, `--snap-window`, `--snap-min-silence`, …) — rarely needed;
reach for them only if a boundary didn't move where you expected.

### 6. Verify the boundaries
A correct duration sum proves nothing was lost, not that cuts landed in the right
place. Spot-check a boundary or two:
```bash
scripts/check_boundary.sh "02 - ….mp3"   # transcribes the first ~7s
```
Confirm it opens on the expected line, then report the chapter list with lengths.

## Dependencies
- `ffmpeg` / `ffprobe` — `brew install ffmpeg`
- `whisper-cli` — `brew install whisper-cpp` (models auto-download to
  `~/.whisper-models/` on first use; override with `WHISPER_MODELS_DIR`)

## Batching a whole folder
Run the same pipeline per file: transcribe them all first (background jobs), then
do the read-and-cut step file by file. Transcription and cutting parallelize, but
the chaptering judgment is per-story — don't automate it away.
