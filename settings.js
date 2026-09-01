(() => {
  const THEME_KEY = 'uriage-note-theme-v1';
  const choices = ['light', 'dark', 'system'];
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function readTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    return choices.includes(saved) ? saved : 'system';
  }

  function resolvedTheme(theme) {
    return theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
  }

  function applyTheme(theme) {
    const resolved = resolvedTheme(theme);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#12181c' : '#f5f7fa');
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      const selected = button.dataset.themeChoice === theme;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const current = document.querySelector('#settings-theme-current');
    if (current) current.textContent = theme === 'dark' ? 'ダーク' : theme === 'light' ? 'ライト' : '端末に合わせる';
  }

  function saveTheme(theme) {
    if (!choices.includes(theme)) return;
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }

  applyTheme(readTheme());

  const style = document.createElement('style');
  style.textContent = `
    .settings-header-button{border:1px solid var(--line);background:var(--surface);color:var(--green);border-radius:10px;padding:12px 14px;font:700 12px inherit;cursor:pointer}
    .settings-mobile-button span{font-size:19px!important}
    #settings-dialog{border:0;padding:0;border-radius:18px;width:min(480px,calc(100% - 28px));max-height:90vh;color:var(--ink);background:var(--surface);box-shadow:0 25px 80px rgba(0,0,0,.22)}
    #settings-dialog::backdrop{background:rgba(13,25,30,.55);backdrop-filter:blur(3px)}
    .settings-shell{background:var(--surface)}
    .settings-head{padding:22px 24px 18px;border-bottom:1px solid var(--line);position:relative}
    .settings-head h2{font-size:22px;margin:0 42px 4px 0}
    .settings-head p{margin:0;color:var(--muted);font-size:12px}
    .settings-body{padding:20px 24px 24px}
    .settings-section-title{font-size:12px;font-weight:700;margin-bottom:10px}
    .settings-theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
    .settings-theme-option{border:1px solid var(--line);background:var(--surface-soft);color:var(--ink);border-radius:12px;padding:14px 8px;font:600 12px inherit;cursor:pointer;text-align:center}
    .settings-theme-option span{display:block;font-size:22px;margin-bottom:6px}
    .settings-theme-option.active{border-color:var(--green);background:var(--surface-tint);color:var(--green);box-shadow:inset 0 0 0 1px var(--green)}
    .settings-description{margin:14px 0 0;color:var(--muted);font-size:11px;line-height:1.7}
    .settings-current{margin-top:18px;padding:12px 14px;background:var(--surface-soft);border:1px solid var(--line);border-radius:10px;display:flex;justify-content:space-between;gap:12px;font-size:12px}
    .settings-current span{color:var(--muted)}
    @media(max-width:760px){.settings-header-button{display:none}.mobile-nav.settings-enabled{grid-template-columns:repeat(5,1fr)!important}.settings-head{padding:19px 20px 16px}.settings-body{padding:18px 20px 22px}.settings-theme-grid{gap:7px}.settings-theme-option{padding:12px 5px;font-size:11px}}
  `;
  document.head.appendChild(style);

  function buildSettings() {
    if (document.querySelector('#settings-dialog')) return;

    const headerActions = document.querySelector('.app-header .header-actions');
    if (headerActions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'settings-header-button';
      button.dataset.openSettings = '';
      button.textContent = '設定';
      headerActions.prepend(button);
    }

    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      mobileNav.classList.add('settings-enabled');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'settings-mobile-button';
      button.dataset.openSettings = '';
      button.innerHTML = '<span>⚙</span>設定';
      mobileNav.appendChild(button);
    }

    const dialog = document.createElement('dialog');
    dialog.id = 'settings-dialog';
    dialog.innerHTML = `
      <div class="settings-shell">
        <div class="settings-head">
          <h2>設定</h2>
          <p>表示や使い方を変更できます。</p>
          <button type="button" class="close-button" data-close-settings aria-label="閉じる">×</button>
        </div>
        <div class="settings-body">
          <div class="settings-section-title">画面テーマ</div>
          <div class="settings-theme-grid" role="group" aria-label="画面テーマ">
            <button type="button" class="settings-theme-option" data-theme-choice="light"><span>☀</span>ライト</button>
            <button type="button" class="settings-theme-option" data-theme-choice="dark"><span>●</span>ダーク</button>
            <button type="button" class="settings-theme-option" data-theme-choice="system"><span>◐</span>端末に合わせる</button>
          </div>
          <p class="settings-description">ダークモードでは背景の明るさを抑え、文字・罫線・入力欄のコントラストを保った配色に切り替えます。</p>
          <div class="settings-current"><span>現在の設定</span><strong id="settings-theme-current"></strong></div>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    document.querySelectorAll('[data-open-settings]').forEach(button => button.addEventListener('click', () => {
      applyTheme(readTheme());
      if (!dialog.open) dialog.showModal();
    }));
    dialog.querySelector('[data-close-settings]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => saveTheme(button.dataset.themeChoice)));
    applyTheme(readTheme());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildSettings);
  else buildSettings();

  media.addEventListener?.('change', () => {
    if (readTheme() === 'system') applyTheme('system');
  });
})();
