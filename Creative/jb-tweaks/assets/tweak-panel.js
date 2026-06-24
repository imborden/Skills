// tweak-panel.js — a live in-page controls panel as a vanilla custom element.
// No build, no deps. Load with <script src="tweak-panel.js"></script>.
//
// WHAT IT DOES
//   <tweak-panel> renders a small floating panel of controls that write straight
//   to your design's CSS custom properties (or an attribute / element text) in
//   real time. Declare each control as a child; the panel reads its destination,
//   seeds the control from the page's CURRENT value (single source of truth — no
//   duplicating your :root), and writes back on every change. The panel renders
//   in shadow DOM, so tweaking --ink / --brand restyles the PAGE, never the panel.
//
// USAGE
//   <tweak-panel title="Tweaks">                <!-- starts collapsed to a launcher -->
//     <tweak-section label="Theme"></tweak-section>
//     <tweak-control var="--brand" type="color" label="Primary"
//                    options="#6d5efc,#2A6FDB,#1F8A5B,#D97757"></tweak-control>
//     <tweak-control var="--brand,--paper,--ink" type="color" label="Palette"
//                    options="#6d5efc|#faf9ff|#15131f, #1F8A5B|#f3faf6|#0f1f17"></tweak-control>
//     <tweak-section label="Layout"></tweak-section>
//     <tweak-control var="--headline-size" type="slider" label="Headline"
//                    min="40" max="88" unit="px"></tweak-control>
//     <tweak-control var="--radius" type="slider" label="Roundness" min="0" max="32" unit="px"></tweak-control>
//     <tweak-control attr="data-density" type="segmented" label="Density"
//                    options="compact,regular,comfy"></tweak-control>
//     <tweak-control attr="data-theme" type="toggle" label="Dark mode" on="dark" off="light"></tweak-control>
//     <tweak-control type="text" target=".hero h1" content label="Headline copy"></tweak-control>
//   </tweak-panel>
//
// DESTINATION — each <tweak-control> writes to exactly one of:
//   var="--name"      a CSS custom property on :root (override element via target="…").
//                     A comma-list (var="--a,--b,--c") drives a whole palette at once.
//   attr="name"       an attribute on the target element (default :root) — pairs with
//                     [data-x] CSS for layout variants / theme switches / feature flags.
//   content           the target element's text (requires target="…") — e.g. headline copy.
//
// CONTROL TYPES (the `type` attribute):
//   color     curated swatch chips from `options`; with multiple vars each chip is a
//             palette (hero + supplementary stripe). Curated only — no free picker by
//             default (a free picker lets a viewer wreck the palette). Omit `options`
//             to fall back to a native color input bound to a single var.
//   slider    range input; `min` `max` `step` `unit`. Writes value+unit.
//   number    stepper input; `min` `max` `step` `unit`.
//   select    dropdown from `options` (use for many / long options).
//   segmented iOS-style segmented buttons from `options` (2–3 short options: a layout variant).
//   toggle    on/off switch. Writes `on`/`off` values (default "1"/"0").
//   text      free text input. Drives a var (e.g. a font stack) or, with `content`, an
//             element's text.
//
// SHOW / HIDE
//   Starts collapsed to a discreet launcher button; click to open, ✕ (or the launcher)
//   to collapse. Add the `open` attribute to start open. To remove the panel entirely
//   (e.g. the shipped/exported design — Tweaks off), set the `hidden` attribute on
//   <tweak-panel> or delete the block + its <script>. JS API: panel.open() / .close() /
//   .toggle() / .show() / .hide(). The header is draggable. The panel listens for nothing
//   from a host — it is fully self-contained.
//
// EXTRAS
//   - `persist` (boolean attr) saves the viewer's tweaks to localStorage so they survive
//     reload (key = panel id or the `persist` value).
//   - Fires a bubbling `tweak-change` event ({ control, value }) on every change.
//   - Motion collapses to instant under prefers-reduced-motion.

(() => {
  const PAD = 16;

  // Style isolation is the whole point of the shadow root: these rules can't be
  // reached by the page's CSS, and tweaking the page's vars never touches them.
  const CSS = `
    :host{position:fixed;right:16px;bottom:16px;z-index:2147483646;
      font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif}
    :host([hidden]){display:none}
    *{box-sizing:border-box}
    /* An explicit display: rule beats the [hidden] attribute's UA display:none, so
       the launcher/panel need their own [hidden] rule to actually collapse. */
    .launch[hidden],.panel[hidden]{display:none}

    .launch{appearance:none;display:flex;align-items:center;gap:7px;height:34px;padding:0 12px 0 10px;
      border:.5px solid rgba(255,255,255,.6);border-radius:999px;cursor:pointer;
      background:rgba(250,249,247,.82);color:#29261b;font:inherit;font-weight:600;
      -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
      box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 8px 24px rgba(0,0,0,.16)}
    .launch:hover{background:rgba(250,249,247,.95)}
    .launch svg{width:15px;height:15px;flex:0 0 auto}

    .panel{width:280px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;
      transform-origin:bottom right;
      background:rgba(250,249,247,.82);color:#29261b;
      -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
      border:.5px solid rgba(255,255,255,.6);border-radius:14px;
      box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);overflow:hidden}
    .hd{display:flex;align-items:center;justify-content:space-between;
      padding:10px 8px 10px 14px;cursor:move;user-select:none}
    .hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
    .x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
      width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
    .x:hover{background:rgba(0,0,0,.06);color:#29261b}
    .body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
      overflow-y:auto;overflow-x:hidden;min-height:0;
      scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
    .body::-webkit-scrollbar{width:8px}
    .body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
      border:2px solid transparent;background-clip:content-box}

    .row{display:flex;flex-direction:column;gap:5px}
    .row.h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
    .lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}
    .lbl>span:first-child{font-weight:500}
    .val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}
    .sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
      color:rgba(41,38,27,.45);padding:10px 0 0}
    .sect:first-child{padding-top:0}

    .field{appearance:none;width:100%;min-width:0;height:26px;padding:0 8px;
      border:.5px solid rgba(0,0,0,.1);border-radius:7px;
      background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
    .field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
    select.field{padding-right:22px;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
      background-repeat:no-repeat;background-position:right 8px center}

    .slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
      border-radius:999px;background:rgba(0,0,0,.12);outline:none}
    .slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;
      border-radius:50%;background:#fff;border:.5px solid rgba(0,0,0,.12);
      box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer}
    .slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;
      border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer}

    .seg{position:relative;display:flex;padding:2px;border-radius:8px;
      background:rgba(0,0,0,.06);user-select:none}
    .seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;background:rgba(255,255,255,.9);
      box-shadow:0 1px 2px rgba(0,0,0,.12);transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
    .seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;background:transparent;
      color:inherit;font:inherit;font-weight:500;min-height:22px;border-radius:6px;cursor:pointer;
      padding:4px 6px;line-height:1.2;overflow-wrap:anywhere}

    .toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
      background:rgba(0,0,0,.15);transition:background .15s;cursor:pointer;padding:0;flex:0 0 auto}
    .toggle[data-on="1"]{background:#34c759}
    .toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
      background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
    .toggle[data-on="1"] i{transform:translateX(14px)}

    .swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
      border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:pointer;
      background:transparent;flex-shrink:0}
    .swatch::-webkit-color-swatch-wrapper{padding:0}
    .swatch::-webkit-color-swatch{border:0;border-radius:5.5px}

    .chips{display:flex;gap:6px}
    .chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;padding:0;border:0;
      border-radius:6px;overflow:hidden;cursor:pointer;
      box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
      transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
    .chip:hover{transform:translateY(-1px);box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
    .chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),0 2px 6px rgba(0,0,0,.15)}
    .chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;display:flex;flex-direction:column;
      box-shadow:-1px 0 0 rgba(0,0,0,.1)}
    .chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
    .chip>span>i:first-child{box-shadow:none}
    .chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
      filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}

    @media (prefers-reduced-motion: reduce){.panel,.seg-thumb,.toggle,.toggle i,.chip{transition:none}}
  `;

  const sliderGlyph = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 4.5h8M13 4.5h1M2 11.5h2M7 11.5h7"/><circle cx="11" cy="4.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="5" cy="11.5" r="1.6" fill="currentColor" stroke="none"/></svg>`;

  // Relative-luminance pick so a check drawn over a swatch reads on light AND dark.
  // Hex only (#rgb / #rrggbb); anything else falls through to "treat as light".
  const isLight = (hex) => {
    const h = String(hex).replace('#', '');
    const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
    const n = parseInt(x.slice(0, 6), 16);
    if (Number.isNaN(n)) return true;
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return r * 299 + g * 587 + b * 114 > 148000;
  };
  const check = (light) =>
    `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.2 5.8 10 11 4.2" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke="${light ? 'rgba(0,0,0,.78)' : '#fff'}"/></svg>`;

  const splitList = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

  // Config-only children — never rendered (the panel has no <slot>); the panel reads
  // their attributes and builds the real widgets in its shadow root.
  class TweakControl extends HTMLElement {}
  class TweakSection extends HTMLElement {}

  class TweakPanel extends HTMLElement {
    connectedCallback() {
      // connectedCallback can fire before our config children are parsed when the
      // element sits in the initial HTML — wait for DOMContentLoaded in that case.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._init(), { once: true });
      } else {
        this._init();
      }
    }

    _init() {
      if (this._ready) return;
      this._ready = true;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this._open = this.hasAttribute('open');
      this._saved = this._loadPersisted();
      this._render();
    }

    // ── persistence (opt-in) ────────────────────────────────────────────────
    _persistKey() {
      if (!this.hasAttribute('persist')) return null;
      return 'tweak-panel:' + (this.getAttribute('persist') || this.id || 'default');
    }
    _loadPersisted() {
      const k = this._persistKey();
      if (!k) return null;
      try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; }
    }
    _savePersisted() {
      const k = this._persistKey();
      if (!k || !this._store) return;
      try { localStorage.setItem(k, JSON.stringify(this._store)); } catch { /* quota / private mode */ }
    }

    // ── destination resolution ──────────────────────────────────────────────
    _targets(ctrl) {
      const sel = ctrl.getAttribute('target');
      return sel ? [...document.querySelectorAll(sel)] : [document.documentElement];
    }
    // Read the current value straight from the page so the control reflects reality
    // instead of a hardcoded copy of :root.
    _read(ctrl) {
      const els = this._targets(ctrl);
      const el = els[0];
      if (!el) return '';
      if (ctrl.hasAttribute('content')) return (el.textContent || '').trim();
      if (ctrl.hasAttribute('attr')) return el.getAttribute(ctrl.getAttribute('attr')) || '';
      const vars = splitList(ctrl.getAttribute('var'));
      if (!vars.length) return '';
      const cs = getComputedStyle(el);
      const vals = vars.map((v) => cs.getPropertyValue(v).trim());
      return vals.length > 1 ? vals : vals[0];
    }
    // Write a value (string, or array for a multi-var palette) to the destination.
    _write(ctrl, value) {
      const els = this._targets(ctrl);
      if (ctrl.hasAttribute('content')) { els.forEach((el) => { el.textContent = value; }); }
      else if (ctrl.hasAttribute('attr')) {
        const name = ctrl.getAttribute('attr');
        els.forEach((el) => el.setAttribute(name, value));
      } else {
        const vars = splitList(ctrl.getAttribute('var'));
        const arr = Array.isArray(value) ? value : [value];
        els.forEach((el) => vars.forEach((v, i) => el.style.setProperty(v, arr[i] != null ? arr[i] : arr[0])));
      }
      this._store = this._store || {};
      this._store[this._ctrlKey(ctrl)] = value;
      this._savePersisted();
      this.dispatchEvent(new CustomEvent('tweak-change', {
        bubbles: true, composed: true, detail: { control: ctrl, value },
      }));
    }
    _ctrlKey(ctrl) {
      return ctrl.getAttribute('var') || ctrl.getAttribute('attr') ||
        ('content:' + (ctrl.getAttribute('target') || ''));
    }
    // Initial value: a persisted tweak wins, then an explicit value=, then the page.
    // An explicit value= or persisted value is applied immediately so the page matches.
    _initial(ctrl) {
      const key = this._ctrlKey(ctrl);
      if (this._saved && key in this._saved) { this._write(ctrl, this._saved[key]); return this._saved[key]; }
      if (ctrl.hasAttribute('value')) {
        const v = ctrl.getAttribute('var') && splitList(ctrl.getAttribute('var')).length > 1
          ? ctrl.getAttribute('value').split('|').map((s) => s.trim())
          : ctrl.getAttribute('value');
        this._write(ctrl, v); return v;
      }
      return this._read(ctrl);
    }

    // ── render ──────────────────────────────────────────────────────────────
    _render() {
      const title = this.getAttribute('title') || 'Tweaks';
      this.shadowRoot.innerHTML =
        `<style>${CSS}</style>` +
        `<button class="launch" part="launch" aria-label="Open ${title}">${sliderGlyph}<span>${title}</span></button>` +
        `<div class="panel" role="dialog" aria-label="${title}">` +
          `<div class="hd"><b>${title}</b><button class="x" aria-label="Close ${title}">✕</button></div>` +
          `<div class="body"></div>` +
        `</div>`;
      this._launch = this.shadowRoot.querySelector('.launch');
      this._panel = this.shadowRoot.querySelector('.panel');
      this._body = this.shadowRoot.querySelector('.body');

      this._launch.addEventListener('click', () => this.open());
      this.shadowRoot.querySelector('.x').addEventListener('click', () => this.close());
      this.shadowRoot.querySelector('.hd').addEventListener('mousedown', (e) => this._drag(e));

      // Build controls from the config children, in document order.
      [...this.children].forEach((node) => {
        const tag = node.tagName.toLowerCase();
        if (tag === 'tweak-section') this._body.appendChild(this._section(node));
        else if (tag === 'tweak-control') this._body.appendChild(this._control(node));
      });

      this._reflectOpen();
    }

    _section(node) {
      const d = document.createElement('div');
      d.className = 'sect';
      d.textContent = node.getAttribute('label') || '';
      return d;
    }

    _row(label, valueText) {
      const row = document.createElement('div');
      row.className = 'row';
      if (label) {
        const l = document.createElement('div');
        l.className = 'lbl';
        l.innerHTML = `<span></span>${valueText != null ? '<span class="val"></span>' : ''}`;
        l.querySelector('span').textContent = label;
        if (valueText != null) l.querySelector('.val').textContent = valueText;
        row.appendChild(l);
        row._val = l.querySelector('.val');
      }
      return row;
    }

    _control(ctrl) {
      const type = ctrl.getAttribute('type') || (ctrl.hasAttribute('content') ? 'text' : 'slider');
      const label = ctrl.getAttribute('label') || '';
      const init = this._initial(ctrl);
      switch (type) {
        case 'color': return this._color(ctrl, label, init);
        case 'select': return this._select(ctrl, label, init);
        case 'segmented': return this._segmented(ctrl, label, init);
        case 'toggle': return this._toggleCtl(ctrl, label, init);
        case 'number': return this._number(ctrl, label, init);
        case 'text': return this._text(ctrl, label, init);
        case 'slider':
        default: return this._slider(ctrl, label, init);
      }
    }

    _numParts(ctrl, init) {
      const unit = ctrl.getAttribute('unit') || '';
      const num = parseFloat(String(init).replace(/[^-\d.]/g, ''));
      return { unit, num: Number.isNaN(num) ? Number(ctrl.getAttribute('min') || 0) : num };
    }

    _slider(ctrl, label, init) {
      const { unit, num } = this._numParts(ctrl, init);
      const row = this._row(label, num + unit);
      const input = document.createElement('input');
      input.type = 'range'; input.className = 'slider';
      input.min = ctrl.getAttribute('min') || '0';
      input.max = ctrl.getAttribute('max') || '100';
      input.step = ctrl.getAttribute('step') || '1';
      input.value = num;
      input.addEventListener('input', () => {
        if (row._val) row._val.textContent = input.value + unit;
        this._write(ctrl, input.value + unit);
      });
      row.appendChild(input);
      return row;
    }

    _number(ctrl, label, init) {
      const { unit, num } = this._numParts(ctrl, init);
      const row = this._row(label);
      row.classList.add('h');
      const input = document.createElement('input');
      input.type = 'number'; input.className = 'field'; input.style.width = '92px';
      if (ctrl.hasAttribute('min')) input.min = ctrl.getAttribute('min');
      if (ctrl.hasAttribute('max')) input.max = ctrl.getAttribute('max');
      input.step = ctrl.getAttribute('step') || '1';
      input.value = num;
      input.addEventListener('input', () => this._write(ctrl, input.value + unit));
      row.appendChild(input);
      return row;
    }

    _text(ctrl, label, init) {
      const row = this._row(label);
      const input = document.createElement('input');
      input.type = 'text'; input.className = 'field';
      if (ctrl.hasAttribute('placeholder')) input.placeholder = ctrl.getAttribute('placeholder');
      input.value = init == null ? '' : init;
      input.addEventListener('input', () => this._write(ctrl, input.value));
      row.appendChild(input);
      return row;
    }

    _select(ctrl, label, init) {
      const row = this._row(label);
      const sel = document.createElement('select');
      sel.className = 'field';
      splitList(ctrl.getAttribute('options')).forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o; opt.textContent = o;
        if (eq(o, init)) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => this._write(ctrl, sel.value));
      row.appendChild(sel);
      return row;
    }

    _segmented(ctrl, label, init) {
      const opts = splitList(ctrl.getAttribute('options'));
      const row = this._row(label);
      const seg = document.createElement('div');
      seg.className = 'seg'; seg.setAttribute('role', 'radiogroup');
      const n = opts.length;
      let idx = Math.max(0, opts.findIndex((o) => eq(o, init)));
      const thumb = document.createElement('div');
      thumb.className = 'seg-thumb';
      const place = () => {
        thumb.style.width = `calc((100% - 4px) / ${n})`;
        thumb.style.left = `calc(2px + ${idx} * (100% - 4px) / ${n})`;
      };
      seg.appendChild(thumb);
      opts.forEach((o, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'radio'); b.textContent = o;
        b.setAttribute('aria-checked', String(i === idx));
        b.addEventListener('click', () => {
          idx = i; place();
          [...seg.querySelectorAll('button')].forEach((x, j) => x.setAttribute('aria-checked', String(j === i)));
          this._write(ctrl, o);
        });
        seg.appendChild(b);
      });
      requestAnimationFrame(place);
      row.appendChild(seg);
      return row;
    }

    _toggleCtl(ctrl, label, init) {
      const on = ctrl.getAttribute('on') || '1';
      const off = ctrl.getAttribute('off') || '0';
      const row = this._row(label); row.classList.add('h');
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'toggle'; btn.setAttribute('role', 'switch');
      let active = eq(init, on);
      const reflect = () => { btn.dataset.on = active ? '1' : '0'; btn.setAttribute('aria-checked', String(active)); };
      btn.innerHTML = '<i></i>'; reflect();
      btn.addEventListener('click', () => { active = !active; reflect(); this._write(ctrl, active ? on : off); });
      row.appendChild(btn);
      return row;
    }

    _color(ctrl, label, init) {
      const options = ctrl.getAttribute('options');
      // No curated options → native picker bound to a single var (back-compat escape).
      if (!options) {
        const row = this._row(label); row.classList.add('h');
        const input = document.createElement('input');
        input.type = 'color'; input.className = 'swatch';
        input.value = (Array.isArray(init) ? init[0] : init) || '#000000';
        input.addEventListener('input', () => this._write(ctrl, input.value));
        row.appendChild(input);
        return row;
      }
      // Curated chips. Each option is one color, or a "|"-list mapping to the var list.
      const opts = options.split(',').map((s) => s.trim().split('|').map((c) => c.trim()));
      const row = this._row(label);
      const chips = document.createElement('div');
      chips.className = 'chips'; chips.setAttribute('role', 'radiogroup');
      const curArr = Array.isArray(init) ? init : [init];
      const matches = (colors) => colors.every((c, i) => eq(c, curArr[i]));
      opts.forEach((colors) => {
        const [hero, ...rest] = colors;
        const sup = rest.slice(0, 4);
        const on = matches(colors);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio');
        b.dataset.on = on ? '1' : '0'; b.setAttribute('aria-checked', String(on));
        b.setAttribute('aria-label', colors.join(', ')); b.title = colors.join(' · ');
        b.style.background = hero;
        b.innerHTML = (sup.length ? `<span>${sup.map((c) => `<i style="background:${c}"></i>`).join('')}</span>` : '') +
          (on ? check(isLight(hero)) : '');
        b.addEventListener('click', () => {
          [...chips.children].forEach((x) => { x.dataset.on = '0'; x.setAttribute('aria-checked', 'false'); x.querySelector('svg')?.remove(); });
          b.dataset.on = '1'; b.setAttribute('aria-checked', 'true');
          b.insertAdjacentHTML('beforeend', check(isLight(hero)));
          this._write(ctrl, colors.length > 1 ? colors : colors[0]);
        });
        chips.appendChild(b);
      });
      row.appendChild(chips);
      return row;
    }

    // ── open / close / drag ─────────────────────────────────────────────────
    _reflectOpen() {
      if (!this._launch) return;
      this._launch.hidden = this._open;
      this._panel.hidden = !this._open;
      this._launch.setAttribute('aria-expanded', String(this._open));
      if (this._open) this._clamp();
    }
    open()  { if (!this._ready) this._init(); this._open = true; this._reflectOpen(); }
    close() { this._open = false; this._reflectOpen(); }
    toggle(){ this._open ? this.close() : this.open(); }
    show()  { this.removeAttribute('hidden'); }
    hide()  { this.setAttribute('hidden', ''); }

    _clamp() {
      const w = this._panel.offsetWidth, h = this._panel.offsetHeight;
      let x = parseFloat(this.style.right) || PAD;
      let y = parseFloat(this.style.bottom) || PAD;
      x = Math.min(Math.max(PAD, window.innerWidth - w - PAD), Math.max(PAD, x));
      y = Math.min(Math.max(PAD, window.innerHeight - h - PAD), Math.max(PAD, y));
      this.style.right = x + 'px';
      this.style.bottom = y + 'px';
    }
    _drag(e) {
      const sx = e.clientX, sy = e.clientY;
      const startRight = parseFloat(this.style.right) || PAD;
      const startBottom = parseFloat(this.style.bottom) || PAD;
      const move = (ev) => {
        this.style.right = (startRight - (ev.clientX - sx)) + 'px';
        this.style.bottom = (startBottom - (ev.clientY - sy)) + 'px';
        this._clamp();
      };
      const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    }
  }

  if (!customElements.get('tweak-control')) customElements.define('tweak-control', TweakControl);
  if (!customElements.get('tweak-section')) customElements.define('tweak-section', TweakSection);
  if (!customElements.get('tweak-panel')) customElements.define('tweak-panel', TweakPanel);
})();
