# Humanize: Voice Profile

A voice profile at `~/.config/humanize/voice.md` describes how a specific
human writes. It's used in the VOICE OVERLAY phase of deep-level processing
(the diagnostic report tells you whether one was found).

## Template

```markdown
# Voice Profile

## Sentence habits
- Default sentence length: [short (3-10 words) / medium (10-20) / long (20+) / mixed]
- Do you use sentence fragments? [never / sparingly / often / as emphasis]
- Opening sentences tend to be: [short and declarative / a question / an observation]

## Vocabulary
- Words you use a lot: [list 5-10 — the human kind, not the AI kind]
- Words you never use: [list 5-10 — corporate-speak, academic filler, buzzwords you hate]
- Contractions: [always / default but not forced / rarely / depends on context]
- Swearing: [never / sparingly for emphasis / casually]

## Tone
- Humor style: [dry / sarcastic / earnest / absurd / dark / none]
- Formality level: [formal / conversational / somewhere in between]
- How you address the reader: [second person "you" / first person "I" / inclusive "we"]

## Rhythm
- Paragraph structure: [consistent 3-5 sentences / highly variable / mostly short]
- Transition style: [subheads / just line breaks / "So" or "Anyway" / formal transitions]
- How you open: [with a claim / with context / straight into it / with a question]

## Crutch phrases
[List 3-5 phrases you catch yourself using all the time. These are fine in moderation —
they make the voice recognizable — but the skill will use them sparingly.]

## Non-negotiables
[Things you never do. Examples: "I never use exclamation points", "I never quote Steve Jobs
to open a piece", "I never use the word 'delighted'", "I never end with a
moral-of-the-story paragraph"]
```

## Lifecycle

1. **First run detection:** If `~/.config/humanize/voice.md` does not exist, no `--voice` flag was passed, and the run is deep-level: after outputting the humanized text, offer:
   > "No voice profile found. Want me to generate one from a sample of your writing? Paste something you wrote (a blog post, email, Slack message — anything) and I'll build a voice profile that makes the output sound like you, not just 'not AI.'"

2. **Generation:** When the user provides a writing sample, analyze it against every field in the template. Fill in the template with specific observations — not generic defaults. Quote the source at least once per section to show your work.

3. **User review:** Present the generated profile in chat. Tell the user to review, edit, then save to `~/.config/humanize/voice.md`. Do NOT write the file yourself — the user controls their voice.

4. **Activation:** On subsequent deep-level runs, if `~/.config/humanize/voice.md` exists (or `--voice <path>` was passed), load it and apply it in the VOICE OVERLAY phase. Match sentence habits, vocabulary preferences, tone, rhythm, and crutch phrases. Respect non-negotiables.
