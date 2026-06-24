#!/usr/bin/env python3
"""Tests for the silence-snap logic in cut_chapters.py.

Pure-function tests (parse_silences, choose_snap) run anywhere. The end-to-end
test builds a tiny synthetic MP3 (tone / silence / tone) and is skipped if
ffmpeg is missing.

Run:  python3 test_cut_chapters.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

import cut_chapters as cc


def check(name, cond):
    print(f"{'ok  ' if cond else 'FAIL'} {name}")
    if not cond:
        check.failed += 1
check.failed = 0


def approx(a, b, tol=0.06):
    return abs(a - b) <= tol


# --- parse_silences ----------------------------------------------------------
SAMPLE = """\
[silencedetect @ 0x1] silence_start: 2.0
[silencedetect @ 0x1] silence_end: 3.0 | silence_duration: 1.0
size=N/A time=00:00:05 bitrate=N/A
[silencedetect @ 0x1] silence_start: 5.0
[silencedetect @ 0x1] silence_end: 6.0 | silence_duration: 1.0
"""

sil = cc.parse_silences(SAMPLE)
check("parse: two intervals", sil == [(2.0, 3.0), (5.0, 6.0)])

off = cc.parse_silences(SAMPLE, offset=10.0)
check("parse: offset applied", off == [(12.0, 13.0), (15.0, 16.0)])

trailing = cc.parse_silences("[x] silence_start: 4.0\n")
check("parse: unmatched start -> end None", trailing == [(4.0, None)])

check("parse: empty -> []", cc.parse_silences("") == [])


# --- choose_snap -------------------------------------------------------------
# Cut should land at end-of-pause minus the back-off margin.
n = cc.choose_snap([(2.0, 3.0)], t=2.5, lo=0.0, hi=8.0, margin=0.25)
check("snap: end - margin", approx(n, 2.75))

# Pick the silence whose END is nearest the requested boundary.
n = cc.choose_snap([(1.0, 1.4), (2.6, 3.0)], t=2.9, lo=0.0, hi=8.0, margin=0.25)
check("snap: nearest-end silence chosen", approx(n, 2.75))

# Prefer a silence that actually contains t.
n = cc.choose_snap([(2.0, 3.0), (3.5, 3.9)], t=2.4, lo=0.0, hi=8.0, margin=0.25)
check("snap: containing silence preferred", approx(n, 2.75))

# Margin larger than the silence clamps to just inside the silence.
n = cc.choose_snap([(2.0, 2.2)], t=2.1, lo=0.0, hi=8.0, margin=0.25)
check("snap: short silence clamps inside", 2.0 < n <= 2.2)

# No silence in range -> None (caller keeps the original boundary).
check("snap: none -> None", cc.choose_snap([], t=2.5, lo=0.0, hi=8.0, margin=0.25) is None)

# Result must respect the [lo, hi] ordering window.
n = cc.choose_snap([(2.0, 3.0)], t=2.5, lo=0.0, hi=2.6, margin=0.25)
check("snap: clamped to hi", n <= 2.6)


# --- end-to-end (needs ffmpeg) ----------------------------------------------
if shutil.which("ffmpeg") and shutil.which("ffprobe"):
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "synthetic.mp3")
    # tone(2s) + digital silence(1s) + tone(2s); silence spans [2.0, 3.0].
    subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-y",
         "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
         "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=1",
         "-f", "lavfi", "-i", "sine=frequency=660:duration=2",
         "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1[a]",
         "-map", "[a]", src],
        check=True,
    )
    found = cc.detect_silences(src, lo=0.0, hi=5.0, noise_db=-35.0, min_silence=0.4)
    has_gap = any(approx(s, 2.0, 0.2) and approx(e, 3.0, 0.2) for s, e in found)
    check("e2e: silence [2,3] detected", has_gap)

    # A mid-gap boundary (old behavior) should snap to ~2.75 (end - 0.25).
    snapped = cc.snap_boundaries(
        src, [0.0, 2.5], window=3.0, noise_db=-35.0, min_silence=0.4, margin=0.25)
    check("e2e: first boundary untouched", snapped[0] == 0.0)
    check("e2e: mid-gap boundary snaps to end-of-pause", approx(snapped[1], 2.75, 0.1))
    shutil.rmtree(tmp, ignore_errors=True)
else:
    print("skip end-to-end (ffmpeg not found)")


if check.failed:
    print(f"\n{check.failed} FAILED")
    sys.exit(1)
print("\nall passed")
