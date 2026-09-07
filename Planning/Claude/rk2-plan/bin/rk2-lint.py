#!/usr/bin/env python3
"""rk2-lint.py - mechanize the rk2 plan-format rules. Stdlib only, Python 3.9 compatible.

Usage: python3 rk2-lint.py <plan.md>
Prints `OK` and exits 0 when clean; otherwise one `<line>: <CODE> <message>` per finding,
sorted by line, then exits 1. Exits 2 with a usage line on bad args or an unreadable file.

Codes:
  RUNCFG    - Run config needs **Tier:** (mid|pro|max), **Promotion command:** naming `git mv`/`mv`, **Rk2 dir:**; **Workflow authorization:** present iff tier is not max.
  PHASEHDR  - each `## Phase N -` carries exactly one of [parallel]|[pipeline]|[sequential] (Phase 0 at max may carry [orchestrator]); [adversarial] never with [pipeline], never at mid.
  GATE      - every phase has a **Gate:** line with a backtick command and an arrow.
  VERIFY    - every `### Task` has a **Verify:** line with a backtick command and an arrow.
  COMMIT    - every task has a **Commit:** line.
  FILES     - every task has a **Files:** line.
  GATEONLY  - a `**Review:** gate-only` task whose Verify command runs no real checking tool.
  RECEIVES  - in a [pipeline] phase, every task after the first has **Receives:**.
  SCHEMAREF - a Gate identifier must be a **Schema:** key declared in that phase, and must not be a boolean (gates take nouns, not implementer verdicts).
  MIDCAP    - tier mid caps at 6 `### Task` headings.
  TAG       - every `### Task` heading ends with `[haiku]`, `[haiku] (verbatim)`, `[sonnet]` or `[orchestrator]`.
  MAXFIELDS - at max, every task has **Owner role:** and **BlockedBy:**.
  BUILDLOG  - a `## Build log` heading exists.

These mechanize family invariants 1, 2, 5, 7, 8 and 10 - see `Planning/Claude/CONVENTIONS.md`
for the full list; don't restate it here.
"""

import re
import sys

PHASE_RE = re.compile(r'^##\s+Phase\s+(\d+)\s*[—-]')
TASK_RE = re.compile(r'^###\s+Task\b')
SCHEMA_KV = re.compile(r'"(\w+)"\s*:\s*(\[?\s*"?\w+"?\s*\]?)')
ARROW = '→'
STRATS = ("[parallel]", "[pipeline]", "[sequential]")
TAGS = ("`[haiku]`", "`[haiku] (verbatim)`", "`[sonnet]`", "`[orchestrator]`")
TOOLS = ("test", "tsc", "grep", "diff", "cmp", "wc", "ls", "pytest", "jest",
         "vitest", "cargo", "go ", "swift build")

def get_tier(lines):
    for line in lines:
        if "**Tier:**" in line:
            m = re.search(r'\b(mid|pro|max)\b', line)
            return m.group(1) if m else None
    return None

def structure(lines):
    """Phase blocks, each carrying its task blocks. Indices are 0-based."""
    h2 = [i for i, l in enumerate(lines) if l.startswith("## ")]
    end_of = {i: (h2[k + 1] if k + 1 < len(h2) else len(lines)) for k, i in enumerate(h2)}
    phases = []
    for i in h2:
        m = PHASE_RE.match(lines[i])
        if not m:
            continue
        ph = {"num": int(m.group(1)), "i": i, "hdr": lines[i],
              "start": i, "end": end_of[i], "tasks": []}
        heads = [j for j in range(i, ph["end"]) if TASK_RE.match(lines[j])]
        for k, j in enumerate(heads):
            ph["tasks"].append({"i": j, "start": j,
                                "end": heads[k + 1] if k + 1 < len(heads) else ph["end"]})
        phases.append(ph)
    return phases

def gate_text(lines, ph):
    """The phase's Gate line plus its AND/OR continuation lines."""
    stop = ph["tasks"][0]["i"] if ph["tasks"] else ph["end"]
    for j in range(ph["start"], stop):
        if "**Gate:**" in lines[j]:
            text, k = lines[j], j + 1
            while k < stop and lines[k].startswith(("AND", "OR")):
                text, k = text + " " + lines[k], k + 1
            return j, text
    return None, ""

def field_line(lines, block, field):
    for j in range(block["start"], block["end"]):
        if field in lines[j]:
            return j
    return None

def tasks_of(lines):
    return [t for ph in structure(lines) for t in ph["tasks"]]

def check_runcfg(lines, tier):
    out = []
    def find(label):
        return next((i for i, l in enumerate(lines) if label in l), None)
    i = find("**Tier:**")
    if i is None:
        out.append((1, "RUNCFG", "Run config has no **Tier:** line"))
    elif tier is None:
        out.append((i + 1, "RUNCFG", "**Tier:** must be one of mid|pro|max"))
    i = find("**Promotion command:**")
    if i is None:
        out.append((1, "RUNCFG", "Run config has no **Promotion command:** line"))
    elif not re.search(r'\bgit mv\b|\bmv\b', lines[i]):
        out.append((i + 1, "RUNCFG", "**Promotion command:** must name `git mv` or `mv`"))
    if find("**Rk2 dir:**") is None:
        out.append((1, "RUNCFG", "Run config has no **Rk2 dir:** line"))
    w = find("**Workflow authorization:**")
    if tier == "max" and w is not None:
        out.append((w + 1, "RUNCFG", "**Workflow authorization:** must be deleted at max"))
    if tier != "max" and w is None:
        out.append((1, "RUNCFG", "**Workflow authorization:** is required at mid/pro"))
    return out

def check_phasehdr(lines, tier):
    out = []
    for ph in structure(lines):
        found = [s for s in STRATS if s in ph["hdr"]]
        orch_ok = ph["num"] == 0 and tier == "max" and "[orchestrator]" in ph["hdr"]
        if len(found) != 1 and not (orch_ok and not found):
            out.append((ph["i"] + 1, "PHASEHDR",
                        "phase header needs exactly one of [parallel]|[pipeline]|[sequential]"))
        if "[adversarial]" in ph["hdr"]:
            if tier == "mid":
                out.append((ph["i"] + 1, "PHASEHDR", "[adversarial] is not available at mid"))
            if "[pipeline]" in ph["hdr"]:
                out.append((ph["i"] + 1, "PHASEHDR", "[adversarial] cannot combine with [pipeline]"))
    return out

def check_gate(lines, tier):
    out = []
    for ph in structure(lines):
        j, text = gate_text(lines, ph)
        if j is None:
            out.append((ph["i"] + 1, "GATE", "phase has no **Gate:** line"))
        elif "`" not in text or ARROW not in text:
            out.append((j + 1, "GATE", "**Gate:** needs a backtick command and an arrow to expected output"))
    return out

def check_verify(lines, tier):
    out = []
    for t in tasks_of(lines):
        j = field_line(lines, t, "**Verify:**")
        if j is None:
            out.append((t["i"] + 1, "VERIFY", "task has no **Verify:** line"))
        elif "`" not in lines[j] or ARROW not in lines[j]:
            out.append((j + 1, "VERIFY", "**Verify:** needs a backtick command and an arrow to expected output"))
    return out

def check_commit(lines, tier):
    return [(t["i"] + 1, "COMMIT", "task has no **Commit:** line") for t in tasks_of(lines)
            if field_line(lines, t, "**Commit:**") is None]

def check_files(lines, tier):
    return [(t["i"] + 1, "FILES", "task has no **Files:** line") for t in tasks_of(lines)
            if field_line(lines, t, "**Files:**") is None]

def check_gateonly(lines, tier):
    out = []
    for t in tasks_of(lines):
        body = lines[t["start"]:t["end"]]
        if not any(re.search(r'\*\*Review:\*\*\s*gate-only', l) for l in body):
            continue
        j = field_line(lines, t, "**Verify:**")
        if j is None:
            continue
        blob = " ".join(re.findall(r'`([^`]+)`', lines[j]))
        if not any(tok in blob for tok in TOOLS):
            out.append((t["i"] + 1, "GATEONLY",
                        "gate-only task needs a Verify that runs a real checking tool"))
    return out

def check_receives(lines, tier):
    out = []
    for ph in structure(lines):
        if "[pipeline]" not in ph["hdr"]:
            continue
        for t in ph["tasks"][1:]:
            if field_line(lines, t, "**Receives:**") is None:
                out.append((t["i"] + 1, "RECEIVES", "task in a [pipeline] phase needs **Receives:**"))
    return out

def check_schemaref(lines, tier):
    out = []
    for ph in structure(lines):
        types = {}
        for t in ph["tasks"]:
            for j in range(t["start"], t["end"]):
                if "**Schema:**" in lines[j]:
                    for key, val in SCHEMA_KV.findall(lines[j]):
                        types[key] = "boolean" if "boolean" in val else "noun"
        j, text = gate_text(lines, ph)
        if j is None:
            continue
        names = set(re.findall(r'([A-Za-z_]\w*)\.length', text))
        names |= set(re.findall(r'(?<![\w.])([A-Za-z_]\w*)\s*===', text))
        for n in sorted(names):
            if n not in types:
                out.append((j + 1, "SCHEMAREF",
                            "Gate references `%s` but no **Schema:** in this phase declares it" % n))
            elif types[n] == "boolean":
                out.append((j + 1, "SCHEMAREF",
                            "Gate references boolean `%s` - gates take nouns, not verdicts" % n))
    return out

def check_midcap(lines, tier):
    heads = [i for i, l in enumerate(lines) if TASK_RE.match(l)]
    if tier == "mid" and len(heads) > 6:
        return [(heads[6] + 1, "MIDCAP", "tier mid caps at 6 tasks; found %d" % len(heads))]
    return []

def check_tag(lines, tier):
    return [(i + 1, "TAG", "task heading must end with `[haiku]`, `[haiku] (verbatim)`, "
                           "`[sonnet]` or `[orchestrator]`")
            for i, l in enumerate(lines)
            if TASK_RE.match(l) and not any(l.rstrip().endswith(t) for t in TAGS)]

def check_maxfields(lines, tier):
    if tier != "max":
        return []
    return [(t["i"] + 1, "MAXFIELDS", "task missing %s (required at max)" % f)
            for t in tasks_of(lines) for f in ("**Owner role:**", "**BlockedBy:**")
            if field_line(lines, t, f) is None]

def check_buildlog(lines, tier):
    if any(l.startswith("## Build log") for l in lines):
        return []
    return [(len(lines), "BUILDLOG", "plan has no `## Build log` section")]

CHECKS = (check_runcfg, check_phasehdr, check_gate, check_verify, check_commit,
          check_files, check_gateonly, check_receives, check_schemaref,
          check_midcap, check_tag, check_maxfields, check_buildlog)

def main(argv):
    if len(argv) != 2:
        sys.stderr.write("usage: rk2-lint.py <plan.md>\n")
        return 2
    try:
        with open(argv[1], encoding="utf-8") as fh:
            lines = fh.read().split("\n")
    except OSError as exc:
        sys.stderr.write("usage: rk2-lint.py <plan.md> (cannot read %s: %s)\n" % (argv[1], exc.strerror))
        return 2
    tier = get_tier(lines)
    found = []
    for check in CHECKS:
        found.extend(check(lines, tier))
    if not found:
        print("OK")
        return 0
    for lineno, code, msg in sorted(found, key=lambda f: (f[0], f[1], f[2])):
        print("%d: %s %s" % (lineno, code, msg))
    return 1

if __name__ == "__main__":
    sys.exit(main(sys.argv))
