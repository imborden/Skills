# RK

A collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for design, planning, writing, and media work.

## What's a skill?

A skill is a folder with a `SKILL.md` file that teaches Claude one kind of work: designing a slide deck, planning a multi-step build, stripping AI tells from prose. Claude loads the skill when the task matches, either on its own or when you call it with a `/` command. Each skill here is self-contained, bundling its instructions, reference docs, and any scripts or assets it needs.

See the [Claude Code skills docs](https://docs.anthropic.com/en/docs/claude-code/skills) for how skills are discovered and loaded.

## Install

Copy a skill's folder into your Claude skills directory:

```bash
cp -r Creative/rk-design ~/.claude/skills/
```

Each skill is the folder that contains the `SKILL.md`. Copy as many as you want, then restart your Claude Code session and the skill is available.

## Creative

Design and build visual artifacts in HTML. `rk-design` is the base. It sets the design process and aesthetic rules the rest build on.

| Skill | What it does |
| --- | --- |
| `rk-design` | The foundation. Brings real design craft to HTML work (UI, mockups, prototypes, decks, docs) instead of generic output. |
| `rk-design-system` | Build a reusable design system, brand kit, or token library that later work pulls from. |
| `rk-deck` | Slide decks and presentations in HTML at 1920×1080, with auto-scaling, keyboard nav, speaker notes, and print-to-PDF. |
| `rk-doc` | Page-style documents that export to clean multi-page PDF: resume, one-pager, memo, report, white paper. |
| `rk-prototype` | Interactive, animated app prototypes inside a device frame, with multi-screen flows, state, and transitions. |
| `rk-wireframe` | Fast, broad lo-fi wireframes and storyboards for exploring the design space before committing. |
| `rk-tweaks` | Add an in-page controls panel so a viewer can adjust colors, type, and layout live. |
| `rk-export-html` | Inline every external reference into one portable HTML file that works fully offline. |
| `rk-llm-prototypes` | Wire a prototype to real LLM calls through a local proxy, keeping the API key out of the browser. |
| `rk-productionize` | Turn a finished design into a developer implementation spec for engineers to rebuild. |

## Planning

Turn a build into a written plan a fresh session can execute by dispatching subagents. The tiers scale with complexity and risk.

| Skill | What it does |
| --- | --- |
| `rk-plan-router` | Picks the right tier below before planning starts. |
| `rk-plan` | Medium builds driven by a Sonnet orchestrator. |
| `rk-plan-pro` | High-complexity or safety-critical builds, run by an Opus orchestrator with adversarial critique. |
| `rk-plan-max` | Mission-critical or large-scale builds run by a persistent team of agents. |
| `rk-plan-pro-DS` | The `rk-plan` approach rebuilt for a DeepSeek V4 Pro orchestrator. |

## Writing

| Skill | What it does |
| --- | --- |
| `humanize` | Strip AI-sounding patterns from text: overused connectors, dash structures, uniform sentences, filler. |

## Utilities

| Skill | What it does |
| --- | --- |
| `chapterize` | Split a long narrated MP3, like a Disney Storyteller record or audiobook, into per-chapter files by transcribing it and cutting on story beats. |

## License

[MIT](LICENSE)
