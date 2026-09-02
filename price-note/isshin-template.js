(() => {
  const form = document.querySelector('#card-form');
  const preview = document.querySelector('#live-preview');
  const productList = document.querySelector('#product-list');
  const picker = document.querySelector('.price-template-picker');
  const options = picker?.querySelector('.price-template-options');
  if (!form || !preview || !picker || !options || typeof currentCard !== 'function' || typeof applyCard !== 'function') return;

  const TEMPLATE_ID = 'isshin-premium';
  const TEMPLATE_VERSION = 1;
  const DEFAULT_POSITIONS = {
    name: { x: 52, y: 34 },
    price: { x: 64, y: 68 },
    note: { x: 21, y: 62 },
    details: { x: 19, y: 79 }
  };
  const DEFAULT_SCALES = { name: 1, price: 1, note: 1, details: 1 };
  let isshinActive = false;
  let isshinPositions = clone(DEFAULT_POSITIONS);
  let isshinScales = clone(DEFAULT_SCALES);

  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&family=Yuji+Syuku&family=Zen+Kaku+Gothic+New:wght@400;500;600;700;900&display=swap';
  document.head.appendChild(fontLink);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'price-template-option isshin-template-option';
  button.dataset.priceTemplate = TEMPLATE_ID;
  button.innerHTML = `
    <span class="template-thumb isshin-thumb" aria-hidden="true">
      <span class="isshin-thumb-logo">一新</span><span class="isshin-thumb-name">商品名</span><span class="isshin-thumb-price">648円</span>
    </span>
    <b>一新フーズ・百貨店</b>`;
  options.appendChild(button);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(3, Math.min(97, Math.round(n * 10) / 10)) : fallback;
  }

  function normalizePositions(source) {
    const out = {};
    for (const [role, fallback] of Object.entries(DEFAULT_POSITIONS)) {
      out[role] = {
        x: clamp(source?.[role]?.x, fallback.x),
        y: clamp(source?.[role]?.y, fallback.y)
      };
    }
    return out;
  }

  function normalizeScales(source) {
    const out = {};
    for (const [role, fallback] of Object.entries(DEFAULT_SCALES)) {
      const value = Number(source?.[role]);
      out[role] = Number.isFinite(value) ? Math.max(.5, Math.min(2, Math.round(value * 100) / 100)) : fallback;
    }
    return out;
  }

  const originalCurrentCard = currentCard;
  currentCard = function() {
    const item = originalCurrentCard();
    if (isshinActive) {
      item.template = TEMPLATE_ID;
      item.templateVersion = TEMPLATE_VERSION;
      item.positions = normalizePositions(isshinPositions);
      item.fontScales = normalizeScales(isshinScales);
    }
    return item;
  };

  const originalApplyCard = applyCard;
  applyCard = function(el, item) {
    originalApplyCard(el, item);
    if (item?.template === TEMPLATE_ID) applyIsshinTemplate(el, item);
  };

  function logoSvg() {
    return `<svg class="pc-isshin-logo" viewBox="0 0 295 265" aria-hidden="true">
      <polygon points="284,138 166,256 47,140 165,22" fill="#01347d"/>
      <circle cx="54" cy="199" r="39" fill="#ba0a0f"/>
      <path fill="#fff" d="M137,148 142,152 138,156 139,159 146,157 149,158 143,164 119,171 137,172 131,180 134,182 143,181 145,183 144,189 139,192 146,203 149,199 149,184 150,183 157,188 161,185 166,185 169,181 170,173 177,169 180,172 181,205 179,210 184,208 188,199 189,182 187,172 183,169 185,167 201,167 202,165 199,162 193,162 178,166 172,170 167,154 187,141 186,138 183,136 176,136 169,149 164,154 164,173 159,185 149,180 156,174 150,168 156,162 155,159 158,154 156,152 152,152 152,148 150,146 141,149Z"/>
      <path fill="#fff" d="M194,93 191,88 185,85 170,88 125,91 135,98 143,98 154,93 165,92 191,95Z"/>
      <path fill="#fff" d="M143,136 143,138 149,142 154,140 151,136Z"/>
      <path fill="#fff" d="M139,187 133,190 124,191 131,194Z"/>
    </svg>`;
  }

  function decorSvg() {
    return `<svg class="pc-isshin-decor" viewBox="0 0 1536 1152" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="#c69a3a" stroke-linecap="round">
        <path d="M45 470 C245 605 470 592 650 520 C825 450 1015 522 1175 500 C1340 478 1455 390 1520 250" stroke-width="18" opacity=".56"/>
        <path d="M20 500 C230 620 455 622 690 520 C860 446 1060 548 1230 506 C1395 466 1485 340 1530 210" stroke-width="4" opacity=".8"/>
        <path d="M70 445 C250 545 455 565 625 510 C820 448 990 500 1160 485 C1340 470 1440 395 1515 300" stroke-width="3" opacity=".65"/>
        <path d="M1415 45 C1510 120 1528 210 1500 320" stroke-width="3" opacity=".55"/>
        <path d="M1445 38 C1530 145 1535 230 1490 355" stroke-width="2" opacity=".52"/>
        <path d="M150 705 L470 705" stroke-width="2" opacity=".7"/>
      </g>
      <g fill="#c69a3a" opacity=".68">
        <circle cx="75" cy="400" r="3"/><circle cx="105" cy="430" r="5"/><circle cx="145" cy="395" r="2"/><circle cx="185" cy="445" r="4"/>
        <circle cx="1270" cy="645" r="3"/><circle cx="1310" cy="670" r="5"/><circle cx="1370" cy="630" r="2"/><circle cx="1415" cy="610" r="4"/>
        <circle cx="1380" cy="85" r="3"/><circle cx="1430" cy="105" r="5"/><circle cx="1475" cy="75" r="2"/>
      </g>
    </svg>`;
  }

  function waveSvg(side) {
    return `<svg class="pc-isshin-waves ${side}" viewBox="0 0 250 110" aria-hidden="true">
      <g fill="none" stroke="#c69a3a" stroke-width="3" opacity=".82">
        <path d="M0 92 Q28 62 56 92 T112 92 T168 92 T224 92"/>
        <path d="M0 70 Q28 40 56 70 T112 70 T168 70 T224 70"/>
        <path d="M0 48 Q28 18 56 48 T112 48 T168 48 T224 48"/>
      </g>
    </svg>`;
  }

  function referenceMarkup() {
    return `<div class="pc-isshin-paper"></div>
      ${decorSvg()}
      ${logoSvg()}
      <div class="pc-isshin-header"><span></span><b>北海道の海の幸</b><span></span></div>
      <div class="pc-isshin-footer">${waveSvg('left')}<div>株式会社 北海道一新フーズ</div>${waveSvg('right')}</div>
      <div class="pc-isshin-frame"></div>`;
  }

  function fitName(name, slider) {
    const len = Math.max(1, Array.from(String(name || '')).length);
    let size = 12.2;
    if (len <= 4) size = 14.2;
    else if (len === 5) size = 13.2;
    else if (len === 6) size = 12.2;
    else if (len === 7) size = 10.9;
    else if (len === 8) size = 9.8;
    else if (len === 9) size = 8.8;
    else size = Math.max(6.4, 76 / len);
    const sliderScale = Math.max(.72, Math.min(1.18, (Number(slider) || 56) / 56));
    return (size * sliderScale).toFixed(2);
  }

  function fitPrice(value) {
    const len = money(value).length;
    if (len <= 3) return 15.2;
    if (len <= 5) return 14.2;
    if (len <= 6) return 13.2;
    return 12.2;
  }

  function formatPriceHtml(value) {
    return money(value).split('').map(char => char === ',' ? '<span class="pc-isshin-comma">,</span>' : char).join('');
  }

  function formatAllergens(value) {
    return String(value || '').split(/[、,]/).map(v => v.trim()).filter(Boolean).join('　');
  }

  function positionBlock(element, role, item) {
    if (!element) return;
    const pos = normalizePositions(item?.positions || DEFAULT_POSITIONS)[role];
    const scale = normalizeScales(item?.fontScales || DEFAULT_SCALES)[role];
    element.dataset.dragRole = role;
    element.style.left = `${pos.x}%`;
    element.style.top = `${pos.y}%`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.margin = '0';
    element.style.setProperty('--text-scale', scale);
    element.style.transform = 'translate(-50%, -50%) scale(var(--text-scale))';
  }

  function applyIsshinTemplate(el, item) {
    el.classList.add('template-isshin-premium', 'free-layout-card');
    el.style.background = '#f4efe3';
    el.style.color = '#111';

    const price = Number(item.price) || 0;
    const basePrice = price > 0 ? Math.round(price / 1.08) : 0;
    const unit = item.unit ? `${esc(item.unit)}あたり` : '';
    const allergens = formatAllergens(item.allergens);

    el.innerHTML = `${referenceMarkup()}
      <div class="pc-name pc-isshin-name">${esc(item.name || '')}</div>
      <div class="pc-note pc-isshin-unit">${unit}</div>
      <div class="pc-price-row pc-isshin-price-group">
        <div class="pc-isshin-price-line"><span class="pc-isshin-price-number">${price > 0 ? formatPriceHtml(price) : ''}</span><span class="pc-isshin-yen">${price > 0 ? '円' : ''}</span></div>
        <div class="pc-isshin-base">${basePrice > 0 ? `（本体価格） ￥${money(basePrice)}` : ''}</div>
      </div>
      <div class="pc-details pc-isshin-allergen">${allergens ? `特定原材料：${esc(allergens)}` : ''}</div>`;

    const name = el.querySelector('.pc-isshin-name');
    if (name) name.style.setProperty('--isshin-name-size', `${fitName(item.name, item.titleSize)}cqw`);
    const priceNumber = el.querySelector('.pc-isshin-price-number');
    if (priceNumber) priceNumber.style.setProperty('--isshin-price-size', `${fitPrice(price)}cqw`);
    positionBlock(name, 'name', item);
    positionBlock(el.querySelector('.pc-isshin-price-group'), 'price', item);
    positionBlock(el.querySelector('.pc-isshin-unit'), 'note', item);
    positionBlock(el.querySelector('.pc-isshin-allergen'), 'details', item);
  }

  function updatePicker() {
    options.querySelectorAll('[data-price-template]').forEach(option => {
      option.classList.toggle('active', isshinActive && option.dataset.priceTemplate === TEMPLATE_ID);
    });
  }

  function applyTemplateDefaults() {
    document.querySelector('#bg-color').value = '#f4efe3';
    document.querySelector('#text-color').value = '#071c42';
    document.querySelector('#title-size').value = '56';
    document.querySelector('#title-size-value').textContent = '56';
    const unit = document.querySelector('#unit');
    if (unit) unit.value = '100g';
    const width = document.querySelector('#card-width-cm');
    const height = document.querySelector('#card-height-cm');
    if (width) width.value = '12.8';
    if (height) height.value = '8.5';
  }

  function activateIsshin({ fromEdit = false, item = null } = {}) {
    isshinActive = true;
    if (fromEdit && item) {
      isshinPositions = normalizePositions(item.positions || DEFAULT_POSITIONS);
      isshinScales = normalizeScales(item.fontScales || DEFAULT_SCALES);
    } else {
      isshinPositions = clone(DEFAULT_POSITIONS);
      isshinScales = clone(DEFAULT_SCALES);
      applyTemplateDefaults();
    }
    updatePicker();
    renderPreview();
  }

  picker.addEventListener('click', event => {
    const target = event.target.closest('[data-price-template]');
    if (!target) return;
    if (target.dataset.priceTemplate === TEMPLATE_ID) {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateIsshin();
      if (typeof showToast === 'function') showToast('一新フーズ・百貨店テンプレートを適用しました');
      return;
    }
    isshinActive = false;
    button.classList.remove('active');
  }, true);

  function captureLayout() {
    if (!isshinActive || !preview.classList.contains('template-isshin-premium')) return;
    const roleSelectors = {
      name: '.pc-isshin-name',
      price: '.pc-isshin-price-group',
      note: '.pc-isshin-unit',
      details: '.pc-isshin-allergen'
    };
    for (const [role, selector] of Object.entries(roleSelectors)) {
      const element = preview.querySelector(selector);
      if (!element) continue;
      const x = parseFloat(element.style.left);
      const y = parseFloat(element.style.top);
      const scale = parseFloat(element.style.getPropertyValue('--text-scale'));
      if (Number.isFinite(x) && Number.isFinite(y)) isshinPositions[role] = { x: clamp(x, DEFAULT_POSITIONS[role].x), y: clamp(y, DEFAULT_POSITIONS[role].y) };
      if (Number.isFinite(scale)) isshinScales[role] = Math.max(.5, Math.min(2, Math.round(scale * 100) / 100));
    }
  }

  preview.addEventListener('pointerup', () => setTimeout(captureLayout, 0));
  preview.addEventListener('pointercancel', () => setTimeout(captureLayout, 0));

  productList?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    if (!edit) return;
    const item = products.find(product => product.id === edit.dataset.edit);
    if (!item) return;
    setTimeout(() => {
      if (item.template === TEMPLATE_ID) activateIsshin({ fromEdit: true, item });
      else {
        isshinActive = false;
        button.classList.remove('active');
      }
    }, 0);
  });

  document.querySelector('#reset-form')?.addEventListener('click', () => {
    const keep = isshinActive;
    setTimeout(() => {
      if (!keep) return;
      isshinPositions = clone(DEFAULT_POSITIONS);
      isshinScales = clone(DEFAULT_SCALES);
      applyTemplateDefaults();
      updatePicker();
      renderPreview();
    }, 0);
  });

  form.addEventListener('submit', () => {
    const keep = isshinActive;
    setTimeout(() => {
      if (!keep) return;
      isshinPositions = clone(DEFAULT_POSITIONS);
      isshinScales = clone(DEFAULT_SCALES);
      applyTemplateDefaults();
      updatePicker();
      renderPreview();
    }, 0);
  });

  const style = document.createElement('style');
  style.textContent = `
    .isshin-template-option .isshin-thumb{background:#f3eee2;border:1px solid #c8a35b;color:#0b2144;display:block;position:relative;overflow:hidden}
    .isshin-thumb::after{content:'';position:absolute;left:0;right:0;bottom:0;height:12px;background:#071c42}
    .isshin-thumb-logo{position:absolute;left:5px;top:4px;width:16px;height:16px;display:grid;place-items:center;transform:rotate(45deg);background:#01347d;color:#fff;font:700 6px/1 sans-serif}
    .isshin-thumb-logo::first-letter{transform:rotate(-45deg)}
    .isshin-thumb-name{position:absolute;left:9px;right:5px;top:16px;text-align:center;color:#111;font:700 7px/1 serif}
    .isshin-thumb-price{position:absolute;right:5px;bottom:13px;color:#071c42;font:800 7px/1 sans-serif}

    .template-isshin-premium{container-type:inline-size;border:0!important;border-radius:0!important;overflow:hidden!important;isolation:isolate;background:#f4efe3!important;color:#111!important;font-family:'Zen Kaku Gothic New',sans-serif!important}
    .template-isshin-premium::before,.template-isshin-premium::after{content:none!important;display:none!important}
    .pc-isshin-paper{position:absolute;inset:0;z-index:0;background-color:#f4efe3;background-image:radial-gradient(circle at 15% 30%,rgba(120,95,45,.04) 0 .55px,transparent .8px),radial-gradient(circle at 70% 65%,rgba(255,255,255,.55) 0 .65px,transparent .9px),linear-gradient(105deg,rgba(255,255,255,.22),rgba(232,221,196,.13) 48%,rgba(255,255,255,.18));background-size:7px 7px,11px 11px,100% 100%}
    .pc-isshin-frame{position:absolute;inset:.45%;z-index:2;border:.12cqw solid #9d7a31;pointer-events:none;box-shadow:inset 0 0 0 .12cqw rgba(157,122,49,.45)}
    .pc-isshin-decor{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
    .pc-isshin-logo{position:absolute;left:2.1%;top:1.7%;width:19.2%;height:auto;z-index:4;display:block;overflow:visible}
    .pc-isshin-header{position:absolute;left:27%;right:25%;top:6.9%;z-index:4;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1.5cqw;color:#071c42;white-space:nowrap}
    .pc-isshin-header span{height:.12cqw;background:#b18834}
    .pc-isshin-header b{font:600 3.15cqw/1 'Shippori Mincho','Yu Mincho',serif;letter-spacing:.16em}
    .pc-isshin-footer{position:absolute;left:0;right:0;bottom:0;height:16.5%;z-index:3;background:#071c42;border-top:.18cqw solid #b18834;display:flex;align-items:center;justify-content:center;color:#fff;font:500 3.45cqw/1 'Shippori Mincho','Yu Mincho',serif;letter-spacing:.055em;white-space:nowrap}
    .pc-isshin-footer::after{content:'';position:absolute;left:.5%;right:.5%;bottom:1.1%;height:.12cqw;background:#b18834}
    .pc-isshin-waves{position:absolute;bottom:7%;width:18%;height:70%;opacity:.9}.pc-isshin-waves.left{left:.5%}.pc-isshin-waves.right{right:.5%;transform:scaleX(-1)}

    .template-isshin-premium .pc-isshin-name{z-index:6!important;width:88%!important;max-width:none!important;white-space:nowrap!important;overflow:visible!important;text-align:center!important;color:#050505!important;font:400 var(--isshin-name-size)/.92 'Yuji Syuku','Yu Mincho',serif!important;letter-spacing:.015em!important;text-shadow:none!important}
    .template-isshin-premium .pc-isshin-unit{z-index:6!important;width:max-content!important;white-space:nowrap!important;color:#111!important;font:600 2.8cqw/1 'Zen Kaku Gothic New',sans-serif!important;letter-spacing:.01em!important;text-align:center!important}
    .template-isshin-premium .pc-isshin-price-group{z-index:6!important;width:max-content!important;max-width:none!important;display:grid!important;justify-items:center!important;gap:.2cqw!important;white-space:nowrap!important}
    .pc-isshin-price-line{display:flex;align-items:flex-end;gap:.65cqw;color:#071c42}
    .pc-isshin-price-number{font:500 var(--isshin-price-size,15.2cqw)/.78 'Zen Kaku Gothic New',sans-serif;letter-spacing:-.045em}
    .pc-isshin-comma{display:inline-block;font-size:.52em;line-height:1;position:relative;top:-.18em;margin:0 -.04em;letter-spacing:0}
    .pc-isshin-yen{font:500 5.2cqw/.9 'Zen Kaku Gothic New',sans-serif;padding-bottom:.65cqw}
    .pc-isshin-base{color:#111;font:500 2.55cqw/1 'Zen Kaku Gothic New',sans-serif;letter-spacing:.01em;margin-top:.35cqw}
    .template-isshin-premium .pc-isshin-allergen{z-index:6!important;width:max-content!important;max-width:42%!important;white-space:nowrap!important;color:#111!important;opacity:1!important;font:600 2.35cqw/1 'Zen Kaku Gothic New',sans-serif!important;letter-spacing:.015em!important;text-align:left!important}
    .template-isshin-premium.position-adjusting [data-drag-role]{outline-color:rgba(7,28,66,.72)!important}

    @media print{
      .template-isshin-premium,.template-isshin-premium *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    }
  `;
  document.head.appendChild(style);
})();
