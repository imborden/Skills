// screen-deck.js — multi-screen prototype navigation with animated transitions.
// Vanilla custom elements, no build, no deps. Load with <script src="screen-deck.js"></script>.
//
// USAGE
//   <screen-deck transition="push">              <!-- push (default) | fade | none -->
//     <screen-panel name="welcome">
//       …<button data-go="connect">Get started</button>
//     </screen-panel>
//     <screen-panel name="connect">
//       …<button data-back>Back</button> <button data-go="done">Continue</button>
//     </screen-panel>
//     <screen-panel name="done">…</screen-panel>
//   </screen-deck>
//
//   - Navigate declaratively: any control with [data-go="<name>"] or [data-back].
//   - Or in JS:  deck.go('connect')  ·  deck.go(1)  ·  deck.back()
//   - Read state: deck.current (name)  ·  listen for the 'screen-change' event.
//
// What it handles so you don't have to: only the active panel receives clicks,
// focus moves to the new screen, and motion collapses to instant under
// prefers-reduced-motion. Drop it inside a device frame's slot, or use standalone.

(() => {
  const EASE = 'cubic-bezier(.32,.72,0,1)';   // iOS-like
  const DUR = 420;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One stylesheet for every deck on the page.
  if (!document.getElementById('screen-deck-css')) {
    const s = document.createElement('style');
    s.id = 'screen-deck-css';
    s.textContent = `
      screen-deck { position: relative; display: block; overflow: hidden;
        width: 100%; height: 100%; }
      screen-deck > screen-panel { position: absolute; inset: 0; display: block;
        overflow: auto; -webkit-overflow-scrolling: touch;
        opacity: 0; visibility: hidden; pointer-events: none; }
      screen-deck > screen-panel[active] { opacity: 1; visibility: visible;
        pointer-events: auto; }
      @media (prefers-reduced-motion: reduce) {
        screen-deck > screen-panel { transition: none !important; }
      }`;
    document.head.appendChild(s);
  }

  class ScreenPanel extends HTMLElement {}

  class ScreenDeck extends HTMLElement {
    connectedCallback() {
      // When in the initial HTML, this fires before the <screen-panel> children
      // are parsed — wait for DOMContentLoaded in that case so panels exist.
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this._init(), { once: true });
      else this._init();
    }
    _init() {
      if (this._ready) return;
      const panels = this.panels;
      if (!panels.length) return;   // children not parsed yet; a later call retries
      this._ready = true;
      this._anims = [];
      let active = panels.find((p) => p.hasAttribute('active')) || panels[0];
      panels.forEach((p) => p.toggleAttribute('active', p === active));
      active.setAttribute('tabindex', '-1');
      this._history = [this._nameOf(active)];

      this.addEventListener('click', (e) => {
        const goEl = e.target.closest('[data-go]');
        const backEl = e.target.closest('[data-back]');
        if (goEl && this.contains(goEl)) { e.preventDefault(); this.go(goEl.getAttribute('data-go')); }
        else if (backEl && this.contains(backEl)) { e.preventDefault(); this.back(); }
      });
    }

    get panels() { return [...this.querySelectorAll(':scope > screen-panel')]; }
    get current() { const a = this.panels.find((p) => p.hasAttribute('active')); return a ? this._nameOf(a) : null; }
    _nameOf(p) { return p.getAttribute('name') || String(this.panels.indexOf(p)); }
    _resolve(target) {
      const panels = this.panels;
      if (typeof target === 'number') return panels[target];
      return panels.find((p) => p.getAttribute('name') === target) || panels[Number(target)];
    }

    back() {
      if (!this._ready) { this._init(); if (!this._ready) return; }
      if (!this._history || this._history.length < 2) return;
      this._history.pop();
      this.go(this._history[this._history.length - 1], { dir: 'back', _history: false });
    }

    go(target, opts = {}) {
      if (!this._ready) { this._init(); if (!this._ready) return; }
      const incoming = this._resolve(target);
      const outgoing = this.panels.find((p) => p.hasAttribute('active'));
      if (!incoming || incoming === outgoing) return;
      const dir = opts.dir || 'forward';
      const mode = this.getAttribute('transition') || 'push';

      // Cancel any in-flight transition and snap to a clean state.
      this._anims.forEach((a) => a.cancel());
      this._anims = [];
      this.panels.forEach((p) => { if (p !== outgoing && p !== incoming) { p.style.transform = ''; p.style.opacity = ''; } });

      if (outgoing) outgoing.style.pointerEvents = 'none';   // stop click-through immediately
      incoming.setAttribute('active', '');
      incoming.setAttribute('tabindex', '-1');

      const finish = () => {
        if (outgoing) { outgoing.removeAttribute('active'); outgoing.style.transform = ''; outgoing.style.opacity = ''; outgoing.style.pointerEvents = ''; }
        incoming.style.transform = ''; incoming.style.opacity = '';
        incoming.focus({ preventScroll: true });
        this.dispatchEvent(new CustomEvent('screen-change', { bubbles: true, detail: { to: this._nameOf(incoming), from: outgoing ? this._nameOf(outgoing) : null, dir } }));
      };

      if (opts._history !== false) this._history.push(this._nameOf(incoming));

      if (mode === 'none' || reduce()) { finish(); return; }

      const sign = dir === 'back' ? -1 : 1;
      let inFrom, outTo;
      if (mode === 'fade') { inFrom = [{ opacity: 0 }, { opacity: 1 }]; outTo = [{ opacity: 1 }, { opacity: 0 }]; }
      else { // push
        inFrom = [{ transform: `translateX(${100 * sign}%)`, opacity: 0.5 }, { transform: 'translateX(0)', opacity: 1 }];
        outTo = [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-28 * sign}%)`, opacity: 0 }];
      }
      const cfg = { duration: DUR, easing: EASE, fill: 'both' };
      const a1 = incoming.animate(inFrom, cfg);
      this._anims.push(a1);
      if (outgoing) { const a2 = outgoing.animate(outTo, cfg); this._anims.push(a2); a2.onfinish = finish; a2.oncancel = () => {}; }
      else { a1.onfinish = finish; }
    }
  }

  if (!customElements.get('screen-panel')) customElements.define('screen-panel', ScreenPanel);
  if (!customElements.get('screen-deck')) customElements.define('screen-deck', ScreenDeck);
})();
