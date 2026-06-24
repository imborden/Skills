// device-frames.js — realistic device chrome as vanilla custom elements.
// No build, no deps. Load with <script src="device-frames.js"></script>.
//
// ELEMENTS (put your screen content — or a <screen-deck> — in the slot):
//   <ios-frame dark time="9:41" scale="1">        …iPhone: island, status bar, home indicator
//   <android-frame dark scale="1">                 …Material 3: punch-hole, status bar, gesture pill
//   <macos-window title="Documents" width="980" height="620">   …Tahoe window: traffic lights + titlebar
//   <browser-window url="lumen.app/welcome" title="Lumen" width="1100" height="680">  …Chrome (dark)
//
// Each renders its chrome in shadow DOM and slots your content into the screen
// area. Never redraw a status bar or window chrome by hand — use these. The
// screen area is a positioned, clipped box, so a <screen-deck> inside it fills
// correctly. Use `scale` (phones) to shrink a frame to fit small viewports.

(() => {
  // ── shared inline SVG glyphs ───────────────────────────────────────────────
  const iosSignal = (c) => `<svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="${c}"/><rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="${c}"/><rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="${c}"/><rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="${c}"/></svg>`;
  const iosWifi = (c) => `<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill="${c}"/><path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill="${c}"/><circle cx="8.5" cy="10.5" r="1.5" fill="${c}"/></svg>`;
  const iosBattery = (c) => `<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="${c}" stroke-opacity="0.35" fill="none"/><rect x="2" y="2" width="20" height="9" rx="2" fill="${c}"/><path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill="${c}" fill-opacity="0.4"/></svg>`;
  const aWifi = (c) => `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 13.3L.67 5.97a10.37 10.37 0 0114.66 0L8 13.3z" fill="${c}"/></svg>`;
  const aCell = (c) => `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M14.67 14.67V1.33L1.33 14.67h13.34z" fill="${c}"/></svg>`;
  const aBatt = (c) => `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="3.75" y="2" width="8.5" height="13" rx="1.5" fill="${c}"/><rect x="5.5" y="0.9" width="5" height="2" rx="0.5" fill="${c}"/></svg>`;

  function define(name, cls) { if (!customElements.get(name)) customElements.define(name, cls); }

  class BaseFrame extends HTMLElement {
    static get observedAttributes() { return ['dark', 'time', 'title', 'url', 'width', 'height', 'scale']; }
    connectedCallback() { if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); this.render(); }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }
  }

  // ── iPhone ──────────────────────────────────────────────────────────────────
  class IOSFrame extends BaseFrame {
    render() {
      const dark = this.hasAttribute('dark');
      const time = this.getAttribute('time') || '9:41';
      const scale = this.getAttribute('scale') || '1';
      const c = dark ? '#fff' : '#000';
      const screenBg = dark ? '#000' : '#fff';
      this.shadowRoot.innerHTML = `<style>
        :host { display: inline-block; transform: scale(${scale}); transform-origin: top center; }
        .bezel { width: 414px; height: 868px; padding: 12px; box-sizing: border-box;
          border-radius: 60px; background: linear-gradient(150deg,#54565a,#2b2c2e 40%,#1c1d1f 60%,#48494d);
          box-shadow: 0 2px 4px rgba(0,0,0,.4), 0 30px 60px -20px rgba(0,0,0,.5); }
        .screen { position: relative; width: 100%; height: 100%; border-radius: 47px;
          overflow: hidden; background: ${screenBg}; display: flex; flex-direction: column; }
        .statusbar { height: 54px; flex: 0 0 auto; display: flex; align-items: center;
          justify-content: space-between; padding: 16px 30px 0; box-sizing: border-box; z-index: 20; }
        .time { font: 600 17px/22px -apple-system,"SF Pro",system-ui; color: ${c}; }
        .glyphs { display: flex; align-items: center; gap: 7px; }
        .island { position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
          width: 126px; height: 37px; background: #000; border-radius: 20px; z-index: 30; display: flex;
          align-items: center; justify-content: flex-end; padding-right: 12px; box-sizing: border-box; }
        .island i { width: 8px; height: 8px; border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #3a3a4a, #0a0a12); }
        .content { position: relative; flex: 1 1 auto; overflow: hidden; }
        .home { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
          width: 140px; height: 5px; border-radius: 3px; z-index: 30; pointer-events: none;
          background: ${dark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.85)'}; }
        ::slotted(*) { }
      </style>
      <div class="bezel"><div class="screen">
        <div class="island"><i></i></div>
        <div class="statusbar"><span class="time">${time}</span>
          <span class="glyphs">${iosSignal(c)}${iosWifi(c)}${iosBattery(c)}</span></div>
        <div class="content"><slot></slot></div>
        <div class="home"></div>
      </div></div>`;
    }
  }

  // ── Android (Material 3) ─────────────────────────────────────────────────────
  class AndroidFrame extends BaseFrame {
    render() {
      const dark = this.hasAttribute('dark');
      const scale = this.getAttribute('scale') || '1';
      const c = dark ? '#e3e3e3' : '#171d1b';
      const screenBg = dark ? '#111312' : '#f4fbf8';
      this.shadowRoot.innerHTML = `<style>
        :host { display: inline-block; transform: scale(${scale}); transform-origin: top center; }
        .bezel { width: 404px; height: 884px; padding: 10px; box-sizing: border-box;
          border-radius: 42px; background: #0c0e0d;
          box-shadow: 0 0 0 1px rgba(116,119,117,.5), 0 30px 60px -20px rgba(0,0,0,.5); }
        .screen { position: relative; width: 100%; height: 100%; border-radius: 32px;
          overflow: hidden; background: ${screenBg}; display: flex; flex-direction: column; }
        .statusbar { height: 40px; flex: 0 0 auto; display: flex; align-items: center;
          justify-content: space-between; padding: 0 16px; position: relative; z-index: 20; }
        .time { font: 400 14px/20px Roboto,system-ui,sans-serif; letter-spacing: .25px; color: ${c}; }
        .punch { position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
          width: 22px; height: 22px; border-radius: 50%; background: #2e2e2e; z-index: 25; }
        .glyphs { display: flex; align-items: center; gap: 4px; }
        .content { position: relative; flex: 1 1 auto; overflow: hidden; }
        .gesture { position: absolute; bottom: 9px; left: 50%; transform: translateX(-50%);
          width: 108px; height: 4px; border-radius: 2px; z-index: 30; pointer-events: none;
          background: ${dark ? 'rgba(227,227,227,.5)' : 'rgba(23,29,27,.55)'}; }
      </style>
      <div class="bezel"><div class="screen">
        <div class="punch"></div>
        <div class="statusbar"><span class="time">9:30</span>
          <span class="glyphs">${aWifi(c)}${aCell(c)}${aBatt(c)}</span></div>
        <div class="content"><slot></slot></div>
        <div class="gesture"></div>
      </div></div>`;
    }
  }

  // ── macOS window (Tahoe) ──────────────────────────────────────────────────────
  class MacWindow extends BaseFrame {
    render() {
      const dark = this.hasAttribute('dark');
      const title = this.getAttribute('title') || '';
      const w = this.getAttribute('width') || '980';
      const h = this.getAttribute('height') || '620';
      const barBg = dark ? '#2b2b2e' : '#f6f5f7';
      const bodyBg = dark ? '#1e1e20' : '#fff';
      const tc = dark ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.85)';
      this.shadowRoot.innerHTML = `<style>
        :host { display: inline-block; }
        .win { width: ${w}px; height: ${h}px; max-width: 100%; border-radius: 12px; overflow: hidden;
          display: flex; flex-direction: column; background: ${bodyBg};
          box-shadow: 0 0 0 .5px rgba(0,0,0,.12), 0 24px 70px -16px rgba(0,0,0,.4); }
        .titlebar { height: 52px; flex: 0 0 auto; display: flex; align-items: center; gap: 9px;
          padding: 0 16px; background: ${barBg}; position: relative;
          border-bottom: .5px solid rgba(0,0,0,.1); }
        .lights { display: flex; gap: 9px; }
        .lights i { width: 14px; height: 14px; border-radius: 50%; border: .5px solid rgba(0,0,0,.1); }
        .title { position: absolute; left: 0; right: 0; text-align: center; pointer-events: none;
          font: 700 15px -apple-system,BlinkMacSystemFont,"SF Pro",sans-serif; color: ${tc}; }
        .content { position: relative; flex: 1 1 auto; overflow: auto; }
      </style>
      <div class="win">
        <div class="titlebar"><div class="lights"><i style="background:#ff736a"></i><i style="background:#febc2e"></i><i style="background:#19c332"></i></div>
          <div class="title">${title}</div></div>
        <div class="content"><slot></slot></div>
      </div>`;
    }
  }

  // ── Browser window (Chrome, dark macOS) ───────────────────────────────────────
  class BrowserWindow extends BaseFrame {
    render() {
      const url = this.getAttribute('url') || 'example.com';
      const title = this.getAttribute('title') || 'New Tab';
      const w = this.getAttribute('width') || '1100';
      const h = this.getAttribute('height') || '680';
      this.shadowRoot.innerHTML = `<style>
        :host { display: inline-block; }
        .win { width: ${w}px; height: ${h}px; max-width: 100%; border-radius: 11px; overflow: hidden;
          display: flex; flex-direction: column; background: #fff;
          box-shadow: 0 0 0 .5px rgba(0,0,0,.2), 0 24px 70px -16px rgba(0,0,0,.45);
          font-family: system-ui, sans-serif; }
        .tabbar { height: 44px; flex: 0 0 auto; display: flex; align-items: center; background: #202124; }
        .lights { display: flex; gap: 8px; padding: 0 14px; }
        .lights i { width: 12px; height: 12px; border-radius: 50%; }
        .tab { height: 34px; align-self: flex-end; padding: 0 14px; display: flex; align-items: center;
          gap: 8px; background: #35363a; border-radius: 9px 9px 0 0; min-width: 140px; max-width: 240px;
          font-size: 12px; color: #e8eaed; }
        .tab .fav { width: 14px; height: 14px; border-radius: 50%; background: #5f6368; flex: 0 0 auto; }
        .tab span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .toolbar { height: 40px; flex: 0 0 auto; background: #35363a; display: flex; align-items: center;
          gap: 4px; padding: 0 10px; }
        .navdot { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
        .navdot i { width: 16px; height: 16px; border-radius: 50%; background: #9aa0a6; opacity: .4; }
        .urlbar { flex: 1; height: 30px; border-radius: 15px; background: #282a2d; display: flex;
          align-items: center; gap: 8px; padding: 0 14px; margin: 0 6px; }
        .urlbar .lock { width: 12px; height: 12px; border-radius: 50%; background: #9aa0a6; opacity: .5; flex: 0 0 auto; }
        .urlbar span { flex: 1; color: #e8eaed; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .content { position: relative; flex: 1 1 auto; overflow: auto; background: #fff; }
      </style>
      <div class="win">
        <div class="tabbar"><div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
          <div class="tab"><span class="fav"></span><span>${title}</span></div></div>
        <div class="toolbar"><div class="navdot"><i></i></div><div class="navdot"><i></i></div><div class="navdot"><i></i></div>
          <div class="urlbar"><span class="lock"></span><span>${url}</span></div></div>
        <div class="content"><slot></slot></div>
      </div>`;
    }
  }

  define('ios-frame', IOSFrame);
  define('android-frame', AndroidFrame);
  define('macos-window', MacWindow);
  define('browser-window', BrowserWindow);
})();
