#!/usr/bin/env python3
"""Cut a long MP3 into chapter files from a plan, losslessly.

The chapter PLAN is a small TSV the model writes after reading the transcript.
Each line is:  <start>\t<title>
  - <start> is the chapter's start, as seconds (e.g. 1373.0) or MM:SS / H:MM:SS.
  - <title> is the human chapter title (used for filename + ID3 tag).
Lines beginning with '#' and blank lines are ignored. The first chapter should
start at 0. Each chapter's end is the next chapter's start; the last runs to EOF.

Cuts use ffmpeg stream-copy (-c copy) so audio is bit-for-bit identical to the
source and the operation is fast.

Two invariants the cuts must hold (see SKILL.md):
  1. A chapter never ends mid-sentence — every cut lands inside a pause.
  2. No gaps — each chapter's end IS the next chapter's start (a single shared
     boundary), so concatenating the outputs reproduces the source exactly.

You give the *approximate* boundary (the timestamp of the next scene's opening
line). By default this script then SNAPS each interior boundary to the end of
the nearest detected pause (end-of-silence minus a small back-off margin), so
the previous chapter ends in the pause after its last word and the next chapter
opens promptly on its first word. The snapped value is used as one shared
boundary, so invariant 2 holds automatically. Disable with --no-snap.

Usage:
  cut_chapters.py <input.mp3> <plan.tsv> [output_dir]
                  [--no-snap] [--snap-window S] [--snap-noise DB]
                  [--snap-min-silence S] [--snap-margin S]

If output_dir is omitted, defaults to "<Album Name> - Chapters" beside the source.
Prints the resulting files with durations and verifies the total matches source.
"""
import argparse
import os
import re
import subprocess
import sys


def parse_time(s):
    s = s.strip()
    if ":" in s:
        parts = [float(p) for p in s.split(":")]
        secs = 0.0
        for p in parts:
            secs = secs * 60 + p
        return secs
    return float(s)


def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def parse_silences(text, offset=0.0):
    """Parse ffmpeg silencedetect stderr into [(start, end), ...] (seconds).

    `offset` is added to every timestamp (used when the detection ran over a
    seeked window). A trailing silence_start with no matching silence_end (the
    window ended mid-silence) yields (start, None) for the caller to clamp.
    """
    pairs, pending = [], None
    for line in text.splitlines():
        m = re.search(r"silence_start:\s*([-\d.]+)", line)
        if m:
            pending = float(m.group(1)) + offset
            continue
        m = re.search(r"silence_end:\s*([-\d.]+)", line)
        if m and pending is not None:
            pairs.append((pending, float(m.group(1)) + offset))
            pending = None
    if pending is not None:
        pairs.append((pending, None))
    return pairs


def detect_silences(src, lo, hi, noise_db=-35.0, min_silence=0.4):
    """Detected pauses (absolute seconds) within the [lo, hi] window of src.

    Seeks the window so the scan is fast even on a long file; a silence that
    runs past the window edge is clamped to `hi`.
    """
    lo = max(0.0, lo)
    dur = max(0.1, hi - lo)
    cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "info",
           "-ss", f"{lo}", "-t", f"{dur}", "-i", src,
           "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}",
           "-f", "null", "-"]
    out = subprocess.run(cmd, capture_output=True, text=True).stderr
    return [(s, hi if e is None else e) for s, e in parse_silences(out, offset=lo)]


def choose_snap(silences, t, lo, hi, margin):
    """Snap an approximate boundary t to the end of the nearest pause.

    Returns end-of-silence minus `margin` (kept strictly inside the silence and
    the [lo, hi] window), or None if there is no usable silence — in which case
    the caller keeps the original boundary. Prefers a pause that contains t,
    else the pause whose END is closest to t.
    """
    cands = [(s, e) for (s, e) in silences if e is not None and e > lo and s < hi]
    if not cands:
        return None
    containing = [(s, e) for (s, e) in cands if s <= t <= e]
    s, e = min(containing or cands, key=lambda se: abs(se[1] - t))
    nt = e - margin
    nt = max(nt, s + 0.05)   # stay inside the silence (don't clip the prior word's tail)
    nt = min(nt, e - 0.02)   # just before the next sound
    return max(lo, min(nt, hi))


def snap_boundaries(src, starts, window=3.0, noise_db=-35.0,
                    min_silence=0.4, margin=0.25):
    """Snap every interior boundary to the end of its nearest pause.

    starts[0] (the first chapter, normally 0.0) is never moved. Each interior
    boundary is searched only within (prev_boundary, next_boundary) so snapping
    can never reorder or collide boundaries. Returns the new start list.
    """
    if len(starts) < 2:
        return list(starts)
    new = list(starts)
    for i in range(1, len(starts)):
        t = starts[i]
        lo = max(new[i - 1] + 0.5, t - window)
        hi = t + window
        if i + 1 < len(starts):
            hi = min(hi, starts[i + 1] - 0.5)
        if hi <= lo:
            continue
        nt = choose_snap(detect_silences(src, lo, hi, noise_db, min_silence),
                         t, lo, hi, margin)
        if nt is not None and nt > new[i - 1] + 0.05:
            new[i] = nt
    return new


def main():
    ap = argparse.ArgumentParser(
        description="Cut a long MP3 into chapter files from a plan, losslessly.")
    ap.add_argument("src")
    ap.add_argument("plan")
    ap.add_argument("out_dir", nargs="?")
    ap.add_argument("--no-snap", action="store_true",
                    help="use the plan's boundaries verbatim (skip pause-snapping)")
    ap.add_argument("--snap-window", type=float, default=3.0,
                    help="seconds to search either side of each boundary (default 3)")
    ap.add_argument("--snap-noise", type=float, default=-35.0,
                    help="silence threshold in dB (default -35)")
    ap.add_argument("--snap-min-silence", type=float, default=0.4,
                    help="shortest pause to snap to, seconds (default 0.4)")
    ap.add_argument("--snap-margin", type=float, default=0.25,
                    help="back-off from end-of-pause so the opening word isn't "
                         "clipped, seconds (default 0.25)")
    args = ap.parse_args()

    src, plan_path = args.src, args.plan
    base = os.path.splitext(os.path.basename(src))[0]
    out_dir = args.out_dir or os.path.join(
        os.path.dirname(os.path.abspath(src)), f"{base} - Chapters")

    chapters = []
    with open(plan_path) as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            start_s, _, title = line.partition("\t")
            if not title:  # tolerate multiple spaces instead of a tab
                start_s, _, title = line.partition("  ")
            chapters.append((parse_time(start_s), title.strip()))
    if not chapters:
        sys.exit("No chapters parsed from plan.")
    chapters.sort(key=lambda c: c[0])

    # Snap each interior boundary into the pause before the next scene so a
    # chapter never ends mid-sentence; the snapped value is the single shared
    # boundary between adjacent chapters, so the cuts stay gapless.
    if not args.no_snap and len(chapters) > 1:
        starts = [c[0] for c in chapters]
        snapped = snap_boundaries(src, starts, window=args.snap_window,
                                  noise_db=args.snap_noise,
                                  min_silence=args.snap_min_silence,
                                  margin=args.snap_margin)
        moved = [(i, starts[i], snapped[i]) for i in range(len(starts))
                 if abs(snapped[i] - starts[i]) > 0.01]
        if moved:
            print("Snapped boundaries to nearest pause:")
            for i, old, new in moved:
                print(f"  ch{i+1:02d} {old:8.2f}s -> {new:8.2f}s "
                      f"({new - old:+.2f}s)  {chapters[i][1]}")
        else:
            print("Snap: boundaries already in pauses (no change).")
        chapters = [(snapped[i], chapters[i][1]) for i in range(len(chapters))]

    src_dur = probe_duration(src)
    os.makedirs(out_dir, exist_ok=True)

    results = []
    for i, (start, title) in enumerate(chapters):
        end = chapters[i + 1][0] if i + 1 < len(chapters) else None
        # Sanitize title for a filename (keep it readable; drop path-hostile chars).
        safe = title.replace("/", "-").replace(":", " -").strip()
        out = os.path.join(out_dir, f"{i+1:02d} - {safe}.mp3")
        cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", src,
               "-ss", f"{start}"]
        if end is not None:
            cmd += ["-to", f"{end}"]
        cmd += ["-c", "copy",
                "-metadata", f"title={title}",
                "-metadata", f"track={i+1}",
                "-metadata", f"album={base}",
                out]
        subprocess.run(cmd, check=True)
        results.append((out, probe_duration(out)))

    total = 0.0
    print(f"\n=== {len(results)} chapters -> {out_dir} ===")
    for path, dur in results:
        total += dur
        m, s = divmod(int(round(dur)), 60)
        print(f"{os.path.basename(path):<52} {m:>2d}:{s:02d}")
    print(f"{'TOTAL':<52} {int(total)//60}:{int(total)%60:02d}")

    drift = abs(total - src_dur)
    status = "OK" if drift < 1.5 else "WARNING"
    print(f"\nSource duration: {src_dur:.1f}s   chapters sum: {total:.1f}s   "
          f"drift: {drift:.2f}s  [{status}]")
    if drift >= 1.5:
        print("Chapters do not sum to the source within tolerance — re-check the plan.")
        sys.exit(1)


if __name__ == "__main__":
    main()
