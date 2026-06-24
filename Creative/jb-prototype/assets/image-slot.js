// image-slot.js — drag-drop / click / paste placeholder for the USER's own image.
// Vanilla custom element, no deps. Load with <script src="image-slot.js"></script>.
// Use whenever a layout needs a real photo/logo you don't have — never fabricate one.
//
// USAGE
//   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
//               placeholder="Drop a hero image"></image-slot>
//   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
//   <image-slot id="kite"   style="width:300px;height:300px"
//               mask="polygon(50% 0,100% 50%,50% 100%,0 50%)"></image-slot>
//
//   Attributes: id (persistence key — give every slot one), shape="rounded|circle|square",
//   radius (px, for rounded), placeholder (label text), fit="cover|contain", mask (CSS clip-path).
//   The dropped image persists across reloads via localStorage (key image-slot:<id>).
//   Adapted for plain HTML — no host filesystem; the key is the element id, not a sidecar file.

(() => {
  const KEY = (id) => `image-slot:${id}`;

  class ImageSlot extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      const id = this.getAttribute('id');
      if (!id) console.warn('<image-slot> without an id will not persist its dropped image.');
      const shape = this.getAttribute('shape') || 'rounded';
      const radius = this.getAttribute('radius') || (shape === 'circle' ? '50%' : shape === 'square' ? '0' : '14');
      const fit = this.getAttribute('fit') || 'cover';
      const mask = this.getAttribute('mask');
      const placeholder = this.getAttribute('placeholder') || 'Drop an image';
      const br = shape === 'circle' ? '50%' : (String(radius).includes('%') ? radius : radius + 'px');

      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `<style>
        :host { display: inline-block; width: 200px; height: 200px; cursor: pointer; }
        .slot { width: 100%; height: 100%; position: relative; overflow: hidden;
          border-radius: ${br}; ${mask ? `clip-path: ${mask};` : ''}
          background: #eceae6; outline: 2px dashed #c7c3bb; outline-offset: -2px;
          display: flex; align-items: center; justify-content: center; transition: outline-color .15s, background .15s; }
        .slot.has-img { outline: none; background: #000; }
        .slot.drag { outline-color: #2b6; background: #e7f3ec; }
        img { width: 100%; height: 100%; object-fit: ${fit}; display: block; }
        .ph { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px;
          text-align: center; color: #8a8578; font: 500 13px/1.4 system-ui, sans-serif; pointer-events: none; }
        .ph svg { width: 28px; height: 28px; opacity: .55; }
        :host(:focus-visible) .slot { outline: 2px solid #2b6; }
      </style>
      <div class="slot" tabindex="0" role="button" aria-label="${placeholder}">
        <div class="ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/>
          <path d="M21 15l-5-5L5 21"/></svg><span>${placeholder}</span></div>
      </div>`;

      this._box = this.shadowRoot.querySelector('.slot');
      const open = () => this._pick();
      this._box.addEventListener('click', open);
      this._box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      this._box.addEventListener('dragover', (e) => { e.preventDefault(); this._box.classList.add('drag'); });
      this._box.addEventListener('dragleave', () => this._box.classList.remove('drag'));
      this._box.addEventListener('drop', (e) => {
        e.preventDefault(); this._box.classList.remove('drag');
        const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) this._read(f);
      });
      this.addEventListener('paste', (e) => {
        const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
        if (item) this._read(item.getAsFile());
      });

      if (id) { const saved = localStorage.getItem(KEY(id)); if (saved) this._set(saved); }
    }

    _pick() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => { if (input.files[0]) this._read(input.files[0]); };
      input.click();
    }
    _read(file) {
      const r = new FileReader();
      r.onload = () => { this._set(r.result); const id = this.getAttribute('id'); if (id) { try { localStorage.setItem(KEY(id), r.result); } catch (e) { console.warn('image-slot: could not persist (storage full?)', e); } } };
      r.readAsDataURL(file);
    }
    _set(src) {
      this._box.classList.add('has-img');
      let img = this._box.querySelector('img');
      if (!img) { img = document.createElement('img'); this._box.appendChild(img); }
      img.src = src;
      const ph = this._box.querySelector('.ph'); if (ph) ph.style.display = 'none';
      this.dispatchEvent(new CustomEvent('image-set', { bubbles: true, detail: { src } }));
    }
  }

  if (!customElements.get('image-slot')) customElements.define('image-slot', ImageSlot);
})();
