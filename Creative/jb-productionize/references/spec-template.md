# Implementation-spec template (`design_handoff_<feature>/`)

The deliverable is a **spec folder** in the user's project. Default to a single
self-contained `README.md` plus a copy of the design artifact. Only split into
extra files when the spec genuinely won't fit one readable doc — and if you split,
**write every file you link**. A README that indexes files you never wrote is a
broken handoff.

## Folder layout

```
design_handoff_<feature>/
  README.md            # the spec (sections below)
  <artifact>.html      # COPY of the actual design file(s) — travels with the spec
  assets/              # copy any images/fonts/asset .js the artifact references
  tokens.css           # OPTIONAL — only if a token file helps the target stack
```

- **Copy the design file(s) in.** `cp` the real `.html` (and any `assets/`) into
  the folder so the developer opens the reference next to the spec. Never point
  the spec at an absolute path outside the folder — it breaks when shared/zipped.
- One feature → one folder. Name it for the feature, not the date.

## `README.md` — fill every section with concrete values, not adjectives

### 1. Overview
One paragraph: what this screen/flow is for and where it lives in the product.

### 2. About the design files
State plainly: **these files are design references created in HTML — prototypes
showing the intended look and behavior, not production code to copy.** The task
is to **recreate the design in the target codebase's own environment**, using its
established framework, component library, and patterns. A prototype's inline
`<script>` is usually a demo stub — call it out so nobody ships it.

### 3. Fidelity  ← classify up front; this changes how everything below is used
- **High-fidelity (hifi):** polished, pixel-considered mockup → recreate the UI
  faithfully; every measurement, color, and type value is load-bearing.
- **Low-fidelity (lofi):** wireframe/sketch → a guide for layout and
  functionality only; the developer applies their own design system for styling.

If you can't tell from the artifact, **ask** before writing the rest.

### 4. Screens / Views
For each screen: **name · purpose · layout** (grid/flex structure, widths,
heights, margins, padding) **· components** (position, size, color, typography,
states, exact copy). Be precise — the developer should be able to rebuild from
this without re-measuring the mockup.

### 5. Interactions & behavior
Click/tap handlers, navigation flow, animations (**duration + easing**),
hover/focus/loading/error states, form validation, responsive behavior.
Separate **real behavior** from **demo stubs**, and name the data/wiring the
developer must supply that the prototype faked.

### 6. State model
State variables, transitions and their triggers, and data-fetching/mutation
requirements (optimistic update, rollback, disabled-while-pending, etc.).

### 7. Design tokens
Extract **exact** values from the artifact's CSS — never eyeball:
- **Color** — hex or oklch, with the role of each.
- **Spacing** scale · **Type** scale (family, size, weight, tracking) ·
  **Radii** · **Shadows**.
- If a **jb-design-system** folder backs the artifact, name its **existing
  semantic tokens** (`--color-brand`, `--space-3`) and tell the developer to map
  onto the codebase's tokens rather than introduce a parallel set. Don't
  re-derive names the codebase won't recognize.

### 8. Assets
Every image/icon/font/illustration used, and **where it came from**. Real assets
are **copied into `assets/`**, never redrawn as SVG or regenerated. Flag any
placeholder the developer must replace.

### 9. Files
List the HTML/CSS/JS files in the folder and what each contains.

### 10. Open questions
What the artifact **can't** answer — responsive context, error/empty/loading
states, permissions, theming, edge cases. List them for product/design rather
than inventing answers.

## After writing
Ask the user whether they want **screenshots** of the designs included — don't
embed them by default. If yes, capture and reference them; if no, the copied
HTML is the visual reference.
