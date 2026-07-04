// wireframe-row.js — scrollable gray canvas + labeled frames for comparing
// wireframe directions side-by-side. Vanilla custom elements, no build, no
// deps. Load with <script src="wireframe-row.js"></script>.
//
// USAGE
//   <wireframe-row>
//     <wireframe-frame label="A — Sidebar nav" width="360">
//       …wireframe markup (gray bars, boxes)…
//     </wireframe-frame>
//     <wireframe-frame label="B — Top tabs" width="480">
//       …wireframe markup…
//     </wireframe-frame>
//   </wireframe-row>
//
// What it handles so you don't have to: the page BODY scrolls horizontally
// (wireframe-row never sets its own overflow), the gray fill uses
// width:max-content so it extends with the scroll instead of clipping at the
// viewport edge, and frames lay out left-aligned in a flex row — never
// centered, which would push frames off the left edge where scroll can't
// reach. Content is light-DOM, so it stays fully editable in place.

(() => {
  if (!document.getElementById('wireframe-row-css')) {
    const s = document.createElement('style');
    s.id = 'wireframe-row-css';
    s.textContent = `
      wireframe-row { display: flex; align-items: flex-start; gap: 48px;
        min-width: 100%; min-height: 100vh; width: max-content;
        box-sizing: border-box; padding: 48px; background: #e7e5df; }
      wireframe-frame { display: block; flex: none; }
      wireframe-frame > .wf-label { font: 600 13px/1.4 system-ui, sans-serif;
        margin-bottom: 12px; color: #333; }
      wireframe-frame > .wf-card { background: #fff; border-radius: 2px;
        box-shadow: 0 1px 3px rgba(0,0,0,.08); min-height: 640px; padding: 20px;
        box-sizing: border-box; }`;
    document.head.appendChild(s);
  }

  class WireframeRow extends HTMLElement {}

  class WireframeFrame extends HTMLElement {
    connectedCallback() {
      // When in the initial HTML, this fires before this element's own
      // children are parsed — wait for DOMContentLoaded so content exists.
      if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => this._build(), { once: true }); return; }
      this._build();
    }
    _build() {
      if (this._built) return;
      this._built = true;
      this.style.width = (this.getAttribute('width') || '360') + 'px';

      const label = document.createElement('div');
      label.className = 'wf-label';
      label.textContent = this.getAttribute('label') || '';

      const card = document.createElement('div');
      card.className = 'wf-card';
      while (this.firstChild) card.appendChild(this.firstChild); // keep light-DOM content

      this.append(label, card);
    }
  }

  if (!customElements.get('wireframe-frame')) customElements.define('wireframe-frame', WireframeFrame);
  if (!customElements.get('wireframe-row')) customElements.define('wireframe-row', WireframeRow);
})();
