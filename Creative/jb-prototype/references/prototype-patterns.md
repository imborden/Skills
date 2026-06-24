# Prototype Patterns — Frames, Navigation, State, Animation

Heavy reference for **jb-prototype**. The SKILL.md governs the approach; this file
is the how-to for the shipped primitives and the native recipes.

---

## Device frames (`device-frames.js`)

All four put your content (or a `<screen-deck>`) in the default slot and render
chrome in shadow DOM. The screen area is a positioned, clipped, flex-column box,
so an inner `<screen-deck>` fills it.

| Element | Attributes | Notes |
|---|---|---|
| `<ios-frame>` | `dark`, `time` (default `9:41`), `scale` | iPhone — Dynamic Island, status bar, home indicator. 414×868 bezel. |
| `<android-frame>` | `dark`, `scale` | Material 3 — centered punch-hole, status bar, gesture pill. |
| `<macos-window>` | `title`, `width` (980), `height` (620), `dark` | Tahoe window — traffic lights + centered title. Content scrolls. |
| `<browser-window>` | `url`, `title`, `width` (1100), `height` (680) | Chrome (dark) — tab + URL bar; white content area. |

- **Fit to small viewports:** phones are tall (≈868px). Use `scale="0.8"` (or
  wrap in a CSS `transform: scale()`) so the frame fits without scrolling the page.
- **Multiple tabs / sidebars / keyboards:** the originals had extra sub-parts.
  Keep it simple here — build those inside your slotted content if a screen needs
  them, styled with your design tokens.
- The frame is **paradigm-neutral**: vanilla screens *or* a React root mounted in
  the slot both work.

---

## Navigation & transitions (`screen-deck.js`)

```html
<screen-deck transition="push">   <!-- push (default) | fade | none -->
  <screen-panel name="a">…<button data-go="b">Next</button></screen-panel>
  <screen-panel name="b">…<button data-back>Back</button></screen-panel>
</screen-deck>
```

**API:** `deck.go(name|index)` · `deck.go(name, {dir:'back'})` · `deck.back()` ·
`deck.current` · `'screen-change'` event (`detail:{from,to,dir}`). Declarative:
`[data-go="<name>"]` and `[data-back]` on any control inside the deck.

**The traps it handles for you** (the baseline hit all of these by hand):
- **Click-through:** inactive panels get `pointer-events:none` immediately, so a
  mid-transition tap can't land on the wrong screen.
- **Focus:** focus moves to the incoming panel (`tabindex=-1`) for keyboard/SR users.
- **Reduced motion:** `prefers-reduced-motion` (or `transition="none"`) collapses
  to an instant swap.
- **Re-entrancy:** a `go()` during an animation cancels the in-flight one cleanly.

**View Transitions alternative.** For animated swaps where you replace DOM rather
than toggle stacked panels, use the native API instead of the deck:

```js
function navigate(render) {
  if (!document.startViewTransition) return render();        // graceful fallback
  document.startViewTransition(render);                       // browser cross-fades old→new
}
// CSS: name shared elements with view-transition-name to morph them between states.
```

Use `<screen-deck>` for a fixed set of screens that all live in the DOM (most
prototypes). Use View Transitions when screens are generated/swapped or you want
shared-element morphs. Don't combine both on the same transition.

---

## State & validation (plain JS)

No framework needed for moderate complexity. Keep a small state object, render
derived bits on change:

```js
const state = { banks: new Set() };
const continueBtn = document.querySelector('#continue');
function sync() {
  continueBtn.disabled = state.banks.size === 0;        // disabled-until-valid
  document.querySelector('#count').textContent =
    `${state.banks.size} account${state.banks.size === 1 ? '' : 's'} selected`;
}
document.querySelectorAll('[data-bank]').forEach((row) => {
  row.setAttribute('role', 'checkbox'); row.tabIndex = 0;
  const toggle = () => {
    const id = row.dataset.bank;
    state.banks.has(id) ? state.banks.delete(id) : state.banks.add(id);
    row.classList.toggle('selected'); row.setAttribute('aria-checked', state.banks.has(id)); sync();
  };
  row.addEventListener('click', toggle);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
});
sync();
```

Make tappable things real controls (`role`, `tabindex`, Enter/Space) — a
prototype that's keyboard-operable feels real and is accessible for free.

---

## Animation (native)

- **CSS** for state-driven motion: `transition` on hover/press/`.selected`,
  `@keyframes` for loops (a breathing logo, a pulse ring).
- **Web Animations API** for one-off orchestration — a check that draws in, a
  staggered list reveal, a "haptic" squeeze:
  ```js
  panel.querySelectorAll('.rise').forEach((el, i) =>
    el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 460, delay: i * 70, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'both' }));
  ```
  Follow jb-design's motion default: ~60–80ms stagger, 400–600ms ease-out, chains
  capped at ~4–6 elements.
- **Always** provide a reduced-motion path:
  ```css
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after {
    animation-duration: .01ms !important; transition-duration: .01ms !important; } }
  ```
- **SVG nuance:** don't *draw illustrations* in SVG (jb-design ban), but
  functional micro-interactions — a checkmark animated via `stroke-dashoffset`,
  an icon from a real set (Lucide/Heroicons) — are fine. Device chrome comes from
  the frame, so you never hand-draw a status bar.

---

## Composition — frame + deck + media

```html
<script src="device-frames.js"></script>
<script src="screen-deck.js"></script>
<script src="image-slot.js"></script>

<ios-frame dark scale="0.85">
  <screen-deck transition="push">
    <screen-panel name="welcome">
      <image-slot id="logo" style="width:72px;height:72px" shape="circle"></image-slot>
      …<button data-go="connect">Get started</button>
    </screen-panel>
    <screen-panel name="connect">…</screen-panel>
  </screen-deck>
</ios-frame>
```

Pull your design system's tokens in (paste its `:root` block, or link
`styles.css`) so the prototype is on-brand — see **jb-design-system**.

---

## Escape hatches

- **React (complex shared state only):** load from CDN and mount the root inside
  a frame's slot. You trade away offline/self-contained — do it deliberately.
  ```html
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <ios-frame dark><div id="root"></div></ios-frame>
  <script type="text/babel"> ReactDOM.createRoot(document.getElementById('root')).render(<App/>); </script>
  ```
- **LLM-powered behavior:** use the **jb-llm-prototypes** helper — a local proxy
  exposes `window.llm.complete(...)` and the API key stays in a gitignored `.env`,
  **never in the HTML**. Don't inline a key or call a provider directly from the page.
