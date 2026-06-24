# Humanize: The AI-Tell Ruleset

Read this at rewrite time. The diagnostic script (`scripts/diagnose.py`) already
counted the mechanical rules and handed you exact **Found** numbers — your job
here is the **Fix**: rewrite each instance without changing the meaning.

Rules are grouped by level. Light = 1-3. Medium = 1-6. Deep = all 11.

---

## Light-level rules

**1. Connector-word overuse**
Target words: `therefore`, `however`, `furthermore`, `moreover`, `in conclusion`, `nonetheless`, `consequently`, `thus`.

Action: Replace with nothing, a period, or a natural transition depending on context. The AI uses these at 5-10x human frequency. A paragraph with three connector words is a dead giveaway. Most can be cut entirely — the sentences work fine without them.

**2. Dash-structure removal**
Target: Every sentence containing a dash — `—`, `–`, or ` - `.

Action: Restructure to not need the parenthetical. Options:
- Make the aside its own sentence.
- Fold it in with a comma.
- Drop it if it's filler.

The goal is zero dash structures. AI loves the em-dash parenthetical interruption; humans use it sparingly. Do NOT just replace the character — kill the structure.

**3. Overly formal words**
Target and replace:
- `additionally` → `also` or cut entirely
- `subsequently` → `then` or `next`
- `utilize` → `use`
- `facilitate` → `help` or `make`
- `demonstrate` → `show`
- `commence` → `start` or `begin`

## Medium-level rules (includes all light rules)

**4. Filler preamble**
Target: Opening sentences that delay the actual answer. Patterns:
- "This is a fascinating question that requires careful consideration..."
- "I'd be happy to help with this..."
- "Let me explore this topic in depth..."
- "That's a great question..."
- "To answer this, we must first consider..."
- "Wonderful question, sir" / any compliment + question framing

Action: Strip them entirely. Start with the actual answer. If the first sentence would still make sense in a real conversation, it passes. If it sounds like someone stalling while they think, cut it.

**5. Missing contractions**
Target: Pairs that natural speech contracts.
- `it is` → `it's`
- `do not` → `don't`
- `cannot` → `can't`
- `I am` → `I'm`
- `you are` → `you're`
- `they are` → `they're`
- `we are` → `we're`
- `that is` → `that's`
- `there is` → `there's`
- `will not` → `won't`
- `would not` → `wouldn't`

Action: Contract by default. Exceptions: formal declarations, legal language, emphasis ("I do not — and will not — agree"). Judge per the voice profile's formality setting.

**6. Sentence-length uniformity**
Target: Text where 80%+ of sentences fall in the 15-25 word band. (The diagnostic reports the exact percentage.)

Action: Break the pattern.
- Shorten one sentence to 3-5 words.
- Lengthen another beyond 30 words (let it breathe).
- Insert a fragment. Not a sentence. Just a thought.
- The goal is rhythm — a mix of short, medium, long, and fragment — not a metronome.

## Deep-level rules (includes all light and medium rules)

**7. Adjective stacking**
Target: Noun phrases with 3+ consecutive modifiers.
Examples: "the innovative, cutting-edge, revolutionary platform", "a robust, scalable, enterprise-grade, cloud-native solution", "the beautiful, stunning, breathtaking view".

Action: Cut to one adjective or none. Pick the one that does the most work. Humans stack adjectives in speech but rarely in writing. Two is fine occasionally. Three or more reads as AI.

**8. Thesis restatement**
Target: Paragraph-final sentences that paraphrase the opening sentence of the same paragraph. (Not machine-detectable — read each paragraph's last sentence yourself.)

Example — BAD: "The platform offers three key benefits. First, it's fast. Second, it's secure. Third, it's affordable. These benefits make the platform a strong choice." The last sentence is thesis restatement — cut it.

Action: Cut the restatement. The paragraph should end on its strongest point, not a summary of itself. If every paragraph ends with "Overall, ..." or "In summary, ..." or restates the topic sentence in different words, you have work to do.

**9. Uniform paragraph length**
Target: Every paragraph is 3-5 sentences. (The diagnostic reports sentences-per-paragraph.)

Action: Vary the structure.
- Make one paragraph a single sentence.
- Combine two short, related paragraphs.
- The page should look uneven — some paragraphs dense, some sparse.

**10. First-person avoidance**
Target: Constructions that avoid "I" or "you" to sound objective.
- `one might consider` → `I think` or `you could`
- `it can be observed that` → `you'll notice`
- `one could argue that` → `I'd say`
- `it is worth noting that` → `note that` or cut entirely
- `it should be considered that` → `consider this:`

Action: Rewrite to first or second person where natural. Humans write about themselves and to other humans. AI writes about abstractions from nowhere.

**11. Overly balanced structure**
Target: Paragraphs that read like a bulleted list in prose — three parallel points, three sentences each, with parallel openings.

Signs: Every sentence in a paragraph starts with the same structure ("It provides...", "It enables...", "It supports..."). Or a section has exactly three paragraphs each with exactly three sentences.

Action: Break the symmetry. Combine two points into one sentence. Drop one. Make one a fragment. Restructure so the reader cannot predict the next sentence shape.

---

## Quoted Material

Text inside quotation marks from the original is PASS-THROUGH — do not change it, do not add contractions to a quote, do not strip connector words from a quote. (The diagnostic already excludes quoted spans from the pass-through counts.) The one exception: dash structures inside quotes get replaced, and the quote gets a `[dash replaced — original was "—"]` annotation.

---

## Formal Context Detection

If the text is legal, academic, or technical specification material, use lighter touch:
- Contractions: default to NOT contracting.
- Connector words: reduce by 50% rather than removing entirely.
- First-person avoidance: leave as-is for legal/academic; lightly adjust for technical.

Judge this per the voice profile's formality setting. If no profile, default to the original text's apparent register.
