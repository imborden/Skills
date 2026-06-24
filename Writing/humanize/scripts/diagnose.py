#!/usr/bin/env python3
"""humanize diagnostic — deterministic measurement of AI-writing tells.

This is the mechanical front-end for the humanize skill. It does the work a
language model is bad at: parsing args, counting exact occurrences of countable
tells, and measuring sentence/paragraph distributions. The model reads this
report and uses the numbers as the factual basis for its self-audit, then spends
its judgment on the rewrite itself.

HARD RULE: this script MEASURES. It never rewrites text. Meaning-changing work
stays with the model so the "never change the meaning" constraint can't be
violated by a regex.

Stdlib only. No dependencies.
"""

import argparse
import json
import re
import sys
from pathlib import Path

# --- Rule vocabularies (kept in sync with rules.md) -------------------------

CONNECTORS = [
    "therefore", "however", "furthermore", "moreover", "in conclusion",
    "nonetheless", "consequently", "thus",
]

FORMAL = {
    "additionally": "also / cut", "subsequently": "then / next",
    "utilize": "use", "facilitate": "help / make",
    "demonstrate": "show", "commence": "start / begin",
}

CONTRACTIONS = [
    "it is", "do not", "cannot", "I am", "you are", "they are", "we are",
    "that is", "there is", "will not", "would not",
]

FIRST_PERSON = [
    "one might consider", "it can be observed that", "one could argue that",
    "it is worth noting that", "it should be considered that",
]

PREAMBLE = [
    r"this is a (?:fascinating|great|wonderful|interesting) question",
    r"i'?d be happy to help", r"i would be happy to help",
    r"let me explore this", r"let me dive into",
    r"that'?s a great question", r"that is a great question",
    r"to answer this,? we (?:must|need to) first",
    r"great question", r"wonderful question",
]

# --- Helpers ----------------------------------------------------------------


def find_spans(text, patterns, flags=re.IGNORECASE):
    """Return [(start, end, matched_text)] for every pattern hit."""
    spans = []
    for pat in patterns:
        for m in re.finditer(pat, text, flags):
            spans.append((m.start(), m.end(), m.group(0)))
    return spans


def dedup_contained(spans):
    """Drop spans fully contained within another (overlapping pattern hits)."""
    out = []
    for s in sorted(spans, key=lambda x: (x[0], -(x[1] - x[0]))):
        if any(o[0] <= s[0] and s[1] <= o[1] for o in out):
            continue
        out.append(s)
    return out


def mask(text, spans):
    """Blank out the given spans (preserve length) so later counts skip them."""
    if not spans:
        return text
    chars = list(text)
    for start, end, _ in spans:
        for i in range(start, end):
            chars[i] = " "
    return "".join(chars)


def quoted_spans(text):
    """Spans of straight/curly double-quoted material (pass-through in the skill)."""
    pats = [r'"[^"]*"', r"“[^”]*”"]
    return find_spans(text, pats, flags=0)


def phrase_regex(phrase):
    """Word-boundary regex tolerant of variable whitespace between words."""
    return r"\b" + re.escape(phrase).replace(r"\ ", r"\s+") + r"\b"


def count_phrases(words, text):
    out = {}
    for w in words:
        out[w] = len(re.findall(phrase_regex(w), text, re.IGNORECASE))
    return out


def sentences(text):
    stripped = re.sub(r"\s+", " ", text).strip()
    if not stripped:
        return []
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"“])", stripped)
    return [p.strip() for p in parts if p.strip()]


def word_count(s):
    return len(re.findall(r"[A-Za-z0-9']+", s))


def paragraphs(text):
    return [p for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]


# --- Detectors for the heuristic (candidate-flagging) rules -----------------


def adjective_stacks(text):
    """Heuristic: 3+ comma-separated modifiers before a noun. Verify manually."""
    pat = r"(?:\b[\w-]+,\s+){2,}(?:and\s+|or\s+)?[\w-]+\s+[\w-]+"
    return [m.group(0).strip() for m in re.finditer(pat, text)]


def parallel_openings(text):
    """Paragraphs where 3+ sentences share the same opening word."""
    flagged = []
    for i, para in enumerate(paragraphs(text), 1):
        firsts = {}
        sents = sentences(para)
        if len(sents) < 3:
            continue
        for s in sents:
            m = re.match(r"[\"“]?([A-Za-z']+)", s)
            if m:
                key = m.group(1).lower()
                firsts.setdefault(key, []).append(s)
        for word, group in firsts.items():
            if len(group) >= 3:
                flagged.append((i, word, len(group)))
    return flagged


def length_histogram(counts):
    bands = {"<8 (short)": 0, "8-14": 0, "15-25 (AI band)": 0, "26+ (long)": 0}
    for c in counts:
        if c < 8:
            bands["<8 (short)"] += 1
        elif c < 15:
            bands["8-14"] += 1
        elif c <= 25:
            bands["15-25 (AI band)"] += 1
        else:
            bands["26+ (long)"] += 1
    return bands


# --- Report -----------------------------------------------------------------

LEVEL_RULES = {
    "light": {1, 2, 3},
    "medium": {1, 2, 3, 4, 5, 6},
    "deep": set(range(1, 12)),
    "compare": set(range(1, 12)),
}


def build_report(text, level):
    active = LEVEL_RULES[level]

    quotes = quoted_spans(text)
    # Pass-through rules ignore quoted material; first-person phrases and
    # preamble are masked before contraction/connector/formal counts so a
    # buried "it is" isn't double-counted.
    fp_spans = find_spans(text, [phrase_regex(p) for p in FIRST_PERSON])
    pre_spans = find_spans(text, PREAMBLE)
    countable = mask(text, quotes + fp_spans + pre_spans)

    connectors = count_phrases(CONNECTORS, countable)
    formal = count_phrases(list(FORMAL), countable)
    contractions = count_phrases(CONTRACTIONS, countable)
    first_person = count_phrases(FIRST_PERSON, text)

    em = text.count("—")
    en = text.count("–")
    spaced_hyphen = len(re.findall(r"(?<=\S) - (?=\S)", text))
    dash_total = em + en + spaced_hyphen
    dash_in_quotes = sum(
        q[2].count("—") + q[2].count("–") + len(re.findall(r"(?<=\S) - (?=\S)", q[2]))
        for q in quotes
    )

    pre_hits = [s[2] for s in dedup_contained(pre_spans) if s[0] < 250]
    stacks = adjective_stacks(text)
    parallels = parallel_openings(text)

    sents = sentences(text)
    counts = [word_count(s) for s in sents]
    in_band = sum(1 for c in counts if 15 <= c <= 25)
    band_pct = round(100 * in_band / len(counts)) if counts else 0

    paras = paragraphs(text)
    para_sent_counts = [len(sentences(p)) for p in paras]
    in_para_band = sum(1 for c in para_sent_counts if 3 <= c <= 5)

    return {
        "level": level,
        "active_rules": sorted(active),
        "quoted_spans": len(quotes),
        "rule1_connectors": {k: v for k, v in connectors.items() if v},
        "rule1_total": sum(connectors.values()),
        "rule2_dash_total": dash_total,
        "rule2_dash_in_quotes": dash_in_quotes,
        "rule3_formal": {k: v for k, v in formal.items() if v},
        "rule3_total": sum(formal.values()),
        "rule4_preamble_candidates": pre_hits,
        "rule5_contractions": {k: v for k, v in contractions.items() if v},
        "rule5_total": sum(contractions.values()),
        "rule6_sentences": len(counts),
        "rule6_band_pct": band_pct,
        "rule6_histogram": length_histogram(counts),
        "rule6_min": min(counts) if counts else 0,
        "rule6_max": max(counts) if counts else 0,
        "rule7_adjective_stacks": stacks,
        "rule9_paragraphs": len(paras),
        "rule9_sentences_per_para": para_sent_counts,
        "rule9_in_3to5_band": in_para_band,
        "rule10_first_person": {k: v for k, v in first_person.items() if v},
        "rule10_total": sum(first_person.values()),
        "rule11_parallel_openings": parallels,
    }


def render_markdown(r):
    L = []
    a = r["active_rules"]

    def status(n):
        return "active" if n in a else "skipped at this level"

    L.append("# Humanize diagnostic report")
    L.append(f"_Level: **{r['level']}** · active rules: {a} · MEASUREMENT ONLY (no rewrite)_")
    if r["quoted_spans"]:
        L.append(f"_{r['quoted_spans']} quoted span(s) detected and excluded from pass-through counts._")
    L.append("")
    L.append("Use these counts for the **Found** column of the audit. Rules 4, 7, 11 are")
    L.append("heuristic candidates — confirm by eye. Rule 8 is not machine-detectable.")
    L.append("")

    L.append(f"## Rule 1 — Connector words ({status(1)})")
    L.append(f"**Found: {r['rule1_total']}** {r['rule1_connectors'] or '— none'}")
    L.append(f"\n## Rule 2 — Dash structures ({status(2)})")
    L.append(f"**Found: {r['rule2_dash_total']}** ({r['rule2_dash_in_quotes']} inside quotes → annotate, don't drop)")
    L.append(f"\n## Rule 3 — Overly formal words ({status(3)})")
    L.append(f"**Found: {r['rule3_total']}** {r['rule3_formal'] or '— none'}")
    L.append(f"\n## Rule 4 — Filler preamble ({status(4)}, heuristic)")
    L.append(f"**Candidates: {len(r['rule4_preamble_candidates'])}** {r['rule4_preamble_candidates'] or '— none'}")
    L.append(f"\n## Rule 5 — Missing contractions ({status(5)})")
    L.append(f"**Found: {r['rule5_total']}** {r['rule5_contractions'] or '— none'}")
    L.append(f"\n## Rule 6 — Sentence-length uniformity ({status(6)})")
    L.append(f"{r['rule6_sentences']} sentences · **{r['rule6_band_pct']}% in the 15-25 word AI band** "
             f"(min {r['rule6_min']}, max {r['rule6_max']})")
    L.append(f"Histogram: {r['rule6_histogram']}")
    L.append(f"\n## Rule 7 — Adjective stacking ({status(7)}, heuristic)")
    L.append(f"**Candidates: {len(r['rule7_adjective_stacks'])}** {r['rule7_adjective_stacks'] or '— none'}")
    L.append(f"\n## Rule 8 — Thesis restatement ({status(8)})")
    L.append("Not machine-detectable — model must read each paragraph's last sentence.")
    L.append(f"\n## Rule 9 — Uniform paragraph length ({status(9)})")
    L.append(f"{r['rule9_paragraphs']} paragraphs · sentences each: {r['rule9_sentences_per_para']} "
             f"· {r['rule9_in_3to5_band']} in the 3-5 band")
    L.append(f"\n## Rule 10 — First-person avoidance ({status(10)})")
    L.append(f"**Found: {r['rule10_total']}** {r['rule10_first_person'] or '— none'}")
    L.append(f"\n## Rule 11 — Overly balanced structure ({status(11)}, heuristic)")
    if r["rule11_parallel_openings"]:
        pretty = [f"para {i}: '{w}' opens {n} sentences" for i, w, n in r["rule11_parallel_openings"]]
        L.append(f"**Candidates: {len(pretty)}** {pretty}")
    else:
        L.append("**Candidates: 0** — none")
    return "\n".join(L)


HELP = """humanize — de-AI your writing

USAGE:
  /humanize <file>              Humanize a file (writes {name}-humanized{ext})
  /humanize <text...>           Humanize pasted text (echoes in chat)
  /humanize <file> --level light|medium|deep|compare
  /humanize <file> --voice <path>
  /humanize <file> --dry-run

FLAGS:
  --level light     Connector words, dash structures, formal words only
  --level medium    Light + preambles, contractions, sentence-length variety
  --level deep      Full rewrite — all 11 rules (default)
  --level compare   Run all three levels side by side
  --voice <path>    Use a voice profile to match a specific writing style
  --dry-run         Show changes without writing any file

EXAMPLES:
  /humanize cover-letter.md
  /humanize cover-letter.md --level light
  /humanize cover-letter.md --level compare
  /humanize cover-letter.md --voice ~/.config/humanize/voice.md
  /humanize This text reads like a robot wrote it. Please fix it.

VOICE PROFILE:
  Store at ~/.config/humanize/voice.md
  The skill will offer to generate one on first deep-level run.
"""


def main():
    p = argparse.ArgumentParser(add_help=False)
    p.add_argument("input", nargs="*")
    p.add_argument("--level", choices=["light", "medium", "deep", "compare"], default="deep")
    p.add_argument("--compare", action="store_true")
    p.add_argument("--voice")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--json", action="store_true")
    p.add_argument("-h", "--help", action="store_true")
    args = p.parse_args()

    if args.help or not args.input:
        print(HELP)
        return 0

    level = "compare" if args.compare else args.level
    joined = " ".join(args.input)
    src = Path(joined)
    try:
        is_file = src.is_file()  # raises OSError if the "path" is really long pasted text
    except OSError:
        is_file = False
    text = src.read_text() if is_file else joined

    # Resolve config the model needs (output target, voice).
    voice_default = Path.home() / ".config" / "humanize" / "voice.md"
    voice_path = Path(args.voice) if args.voice else voice_default
    voice_found = voice_path.exists()

    out_name = None
    if is_file:
        stem, suffix = src.stem, src.suffix
        out_name = (f"{stem}-humanized-compare.md" if level == "compare"
                    else f"{stem}-humanized{suffix}")

    levels = ["light", "medium", "deep"] if level == "compare" else [level]
    reports = {lv: build_report(text, lv) for lv in levels}

    if args.json:
        print(json.dumps({
            "input_kind": "file" if is_file else "inline",
            "input_path": str(src) if is_file else None,
            "level": level,
            "voice_path": str(voice_path),
            "voice_found": voice_found,
            "dry_run": args.dry_run,
            "output_file": None if args.dry_run else out_name,
            "reports": reports,
        }, indent=2))
        return 0

    print("=" * 70)
    print(f"INPUT: {'file ' + str(src) if is_file else 'inline text'}")
    print(f"LEVEL: {level}")
    print(f"VOICE: {voice_path} ({'found — Read it and apply in VOICE OVERLAY' if voice_found else 'not found'})")
    if level == 'deep' and not voice_found and not args.voice:
        print("       → offer to generate a voice profile after output (see voice-profile.md)")
    if is_file and not args.dry_run:
        print(f"OUTPUT: write rewrite to {out_name}")
    elif args.dry_run:
        print("OUTPUT: --dry-run — echo in chat, write nothing")
    else:
        print("OUTPUT: inline input — echo humanized text in chat")
    print("=" * 70)
    for lv in levels:
        if level == "compare":
            print(f"\n{'#' * 3} ===== {lv.upper()} =====")
        print(render_markdown(reports[lv]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
