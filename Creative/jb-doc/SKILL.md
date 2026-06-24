---
name: jb-doc
description: Use when creating a page-style document that reads as one continuous column on screen and exports to a clean multi-page PDF with no setup — resume/CV, one-pager, memo, letter, report, guide, white paper, brief, academic paper. Ships a print-ready HTML template with load-bearing pagination CSS (page margins, optional running header/footer, break control). Builds on jb-design. Triggers on "make a doc", "one-pager", "resume", "CV", "memo", "report", "white paper", "PDF document", "write-up".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-doc: Printable Page-Style Documents

## Overview

Create a document — resume, one-pager, memo, letter, report, guide, paper — that reads as **one continuous column** on screen and exports to a **clean PDF with no extra setup**. The browser paginates at print time.

**REQUIRED BACKGROUND:** Use **jb-design** for process, typography sense, and anti-slop discipline. Documents are typographic objects — restraint and hierarchy matter more than decoration.

**Core principle:** Write the whole body as static HTML inside one flowing column and let the print engine paginate. Don't manually break pages.

## When to use

Anything meant to be read as a document and likely printed or saved as PDF. For slides use **jb-deck**; for an app/screen use **jb-prototype**.

## Start from the template

Copy the bundled **`assets/doc-template.html`** (in this skill's folder) and write your content into the `<tbody>`. It already contains the pagination CSS and the correct structure.

**Why the structure is what it is — keep the LOAD-BEARING block verbatim:**
- The whole body lives in one `<main class="doc">`.
- The `.doc-frame` **table with repeating `<thead>`/`<tfoot>` spacers is what gives every printed page its top and bottom margin** — it is not decorative. Keep the table even if you never add a running header/footer.
- `@page { size: letter; margin: 0 }` is intentional: margins come from the spacers, not from `@page`.
- The **first element in the body is the `<h1>`** — never a masthead, logo bar, or eyebrow line above it.

Write the document body as **static HTML** with real structure: headings, lists, tables, figures, blockquotes.

## Running header/footer & page numbers

- **Off by default.** Only add a running header/footer when the user asks or the document genuinely needs one — uncomment the two `.running-hdr`/`.running-ftr` lines in the template (they render in print only). The `.doc-frame` table stays in either case.
- **No printed page numbers by default.** CSS can only produce them via `@page` margin boxes, which need a nonzero `@page` margin (conflicting with this template's margin strategy). Add only when explicitly asked.

## Typography

- **Body 14–16px**, generous line-height **1.55–1.7**, clear heading hierarchy, restrained palette.
- Headings `text-wrap: balance`; body `text-wrap: pretty` (already in the template).
- **Links resolve to body ink in print** (already handled in `@media print`).
- **Tables:** a header row + hairline borders (`table.data` in the template).
- **Figures and code blocks** each carry a short caption.
- Pick a document pairing — a refined serif for body reads well long-form (the template defaults to Newsreader + IBM Plex Sans); swap if you have a better lane-true choice. Avoid the banned faces.

## Export to PDF

Open the file in a browser and print → **Save as PDF**, with margins set to **None** (the template supplies its own margins via the spacers; the OS adding more would double them). This is the no-setup path — no extra tooling needed.

## Verify

Open in a browser and check: the `<h1>` is the first thing on the page, body flows as one column, line-length is comfortable (~`8.5in` max), and a print preview shows even top/bottom margins on every page with no orphaned headings.

## Red flags

- Manually inserting page breaks or sizing pages → let the flow + spacers paginate
- Removing or restyling the `.doc-frame` table → printed pages lose their margins
- A masthead/logo/eyebrow above the `<h1>` → the `<h1>` comes first
- Adding running headers/footers or page numbers unprompted → off by default
- Web-app body sizes (18–20px) or tight 1.3 line-height → use 14–16px at 1.55–1.7
