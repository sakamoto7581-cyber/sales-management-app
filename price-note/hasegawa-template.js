(() => {
  const form = document.querySelector('#card-form');
  const preview = document.querySelector('#live-preview');
  const productList = document.querySelector('#product-list');
  if (!form || !preview || typeof currentCard !== 'function' || typeof applyCard !== 'function') return;

  const TEMPLATE_ID = 'hasegawa-black';
  const TEMPLATE_VERSION = 3;
  const REFERENCE_POSITIONS = {
    name: { x: 50.5, y: 35.3 },
    price: { x: 74.3, y: 79.0 },
    note: { x: 17.3, y: 90.5 },
    details: { x: 25.4, y: 81.6 }
  };
  const REFERENCE_SCALES = { name: 1, price: 1, note: 1, details: 1 };
  let activeTemplate = 'standard';
  let layoutTouched = false;

  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Yuji+Boku&family=Yuji+Syuku&display=swap';
  document.head.appendChild(fontLink);

  const unitSelect = document.querySelector('#unit');
  if (unitSelect && ![...unitSelect.options].some(option => option.value === '1盛')) {
    const option = document.createElement('option');
    option.value = '1盛';
    option.textContent = '1盛';
    unitSelect.insertBefore(option, unitSelect.firstChild);
  }

  const picker = document.createElement('div');
  picker.className = 'price-template-picker';
  picker.innerHTML = `
    <div class="price-template-heading">
      <div><b>テンプレート</b><small>元画像の比率と配置を基準にしています</small></div>
    </div>
    <div class="price-template-options">
      <button type="button" class="price-template-option active" data-price-template="standard">
        <span class="template-thumb standard-thumb">Aa<br><em>¥1,296</em></span>
        <b>標準</b>
      </button>
      <button type="button" class="price-template-option" data-price-template="${TEMPLATE_ID}">
        <span class="template-thumb hasegawa-thumb"><img src="hasegawa-logo.svg" alt=""><strong>商品名</strong><em>¥1,296</em></span>
        <b>長谷川商店・原版</b>
      </button>
    </div>`;
  form.parentNode.insertBefore(picker, form);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isDefaultLayout(item) {
    const pos = item?.positions || {};
    const checks = [
      ['name', 50, 27],
      ['price', 50, 55],
      ['note', 50, 70],
      ['details', 50, 87]
    ];
    return checks.every(([role, x, y]) =>
      Math.abs(Number(pos?.[role]?.x ?? x) - x) < .2 &&
      Math.abs(Number(pos?.[role]?.y ?? y) - y) < .2
    );
  }

  const originalCurrentCard = currentCard;
  currentCard = function() {
    const item = originalCurrentCard();
    item.template = activeTemplate;
    if (activeTemplate === TEMPLATE_ID) {
      item.templateVersion = TEMPLATE_VERSION;
      if (!layoutTouched && isDefaultLayout(item)) {
        item.positions = clone(REFERENCE_POSITIONS);
        item.fontScales = clone(REFERENCE_SCALES);
      }
    }
    return item;
  };

  const originalApplyCard = applyCard;
  applyCard = function(el, item) {
    originalApplyCard(el, item);
    if (item?.template === TEMPLATE_ID) applyHasegawaTemplate(el, item);
  };

  function fitNameCqw(name, titleSize) {
    const len = Math.max(1, Array.from(String(name || '')).length);
    let factor = 1;
    if (len <= 4) factor = 1.1;
    else if (len === 5) factor = 1.05;
    else if (len === 6) factor = 1;
    else if (len === 7) factor = .92;
    else if (len === 8) factor = .84;
    else if (len === 9) factor = .77;
    else factor = Math.max(.58, 7.1 / len);
    const slider = Math.max(.7, Math.min(1.35, (Number(titleSize) || 56) / 56));
    return (14.8 * factor * slider).toFixed(2);
  }

  function positionBlock(element, role, item) {
    if (!element) return;
    const pos = item?.positions?.[role] || REFERENCE_POSITIONS[role];
    const scale = Number(item?.fontScales?.[role]) || 1;
    element.dataset.dragRole = role;
    element.style.left = `${pos.x}%`;
    element.style.top = `${pos.y}%`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.margin = '0';
    element.style.setProperty('--text-scale', scale);
    element.style.transform = 'translate(-50%, -50%) scale(var(--text-scale))';
  }

  function applyHasegawaTemplate(el, item) {
    el.classList.add('template-hasegawa-black');
    el.style.background = '';
    el.style.color = '#fff';

    const logo = document.createElement('img');
    logo.className = 'pc-hasegawa-logo';
    logo.src = 'hasegawa-logo.svg';
    logo.alt = '函館 介 長谷川商店';
    el.prepend(logo);

    const name = el.querySelector('.pc-name');
    if (name) {
      name.style.setProperty('--hasegawa-name-size', `${fitNameCqw(item.name, item.titleSize)}cqw`);
      positionBlock(name, 'name', item);
    }

    const priceRow = el.querySelector('.pc-price-row');
    const unit = priceRow?.querySelector('.pc-unit');
    if (unit) {
      unit.classList.add('pc-hasegawa-unit');
      priceRow.parentNode.insertBefore(unit, priceRow);
    }

    const tax = priceRow?.querySelector('.pc-tax');
    if (tax) {
      tax.textContent = '税込価格';
      priceRow.insertBefore(tax, priceRow.firstChild);
    }
    positionBlock(priceRow, 'price', item);

    el.querySelector('.pc-details')?.remove();
    const details = document.createElement('div');
    details.className = 'pc-details pc-hasegawa-details';
    details.innerHTML = `
      <div class="h-row"><b>特定原材料等(28品目)</b><span>${item.allergens ? esc(item.allergens) : ''}</span></div>
      <div class="h-row"><b>原料原産地</b><span>${item.origin ? esc(item.origin) : ''}</span></div>
      <div class="h-row"><b>加工地</b><span>${item.processingPlace ? esc(item.processingPlace) : ''}</span></div>`;
    el.appendChild(details);
    positionBlock(details, 'details', item);

    let note = el.querySelector('.pc-note');
    if (item.note) {
      if (!note) {
        note = document.createElement('div');
        note.className = 'pc-note';
        el.appendChild(note);
      }
      note.textContent = `（${item.note}）`;
      positionBlock(note, 'note', item);
    } else {
      note?.remove();
    }

    el.querySelector('.pc-hasegawa-base')?.remove();
    if (Number(item.price) > 0) {
      const base = document.createElement('div');
      base.className = 'pc-hasegawa-base';
      const basePrice = Math.round(Number(item.price) / 1.08);
      base.textContent = `［本体価格　${basePrice.toLocaleString('ja-JP')}円］`;
      el.appendChild(base);
    }
  }

  function updatePicker() {
    picker.querySelectorAll('[data-price-template]').forEach(button => {
      button.classList.toggle('active', button.dataset.priceTemplate === activeTemplate);
    });
  }

  function setTemplate(template, { fromEdit = false, item = null } = {}) {
    activeTemplate = template === TEMPLATE_ID ? TEMPLATE_ID : 'standard';
    layoutTouched = Boolean(fromEdit && item?.templateVersion === TEMPLATE_VERSION);
    updatePicker();

    if (activeTemplate === TEMPLATE_ID && !fromEdit) {
      document.querySelector('#bg-color').value = '#05060a';
      document.querySelector('#text-color').value = '#ffffff';
      document.querySelector('#tax-label').value = '税込価格';
      document.querySelector('#title-size').value = '56';
      document.querySelector('#title-size-value').textContent = '56';
      if (unitSelect) unitSelect.value = '1盛';
      const width = document.querySelector('#card-width-cm');
      const height = document.querySelector('#card-height-cm');
      if (width) width.value = '12.8';
      if (height) height.value = '8.5';
    }

    renderPreview();
  }

  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-price-template]');
    if (!button) return;
    setTemplate(button.dataset.priceTemplate);
    if (typeof showToast === 'function') {
      showToast(button.dataset.priceTemplate === TEMPLATE_ID ? '長谷川商店の原版テンプレートを適用しました' : '標準テンプレートに戻しました');
    }
  });

  preview.addEventListener('pointerdown', event => {
    if (activeTemplate === TEMPLATE_ID && event.target.closest('[data-drag-role]')) {
      layoutTouched = true;
    }
  }, true);

  productList?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    if (!edit) return;
    const item = products.find(product => product.id === edit.dataset.edit);
    if (!item) return;
    setTimeout(() => setTemplate(item.template || 'standard', { fromEdit: true, item }), 0);
  });

  document.querySelector('#reset-form')?.addEventListener('click', () => {
    const keep = activeTemplate;
    setTimeout(() => {
      layoutTouched = false;
      setTemplate(keep);
    }, 0);
  });

  form.addEventListener('submit', () => {
    const keep = activeTemplate;
    setTimeout(() => {
      layoutTouched = false;
      setTemplate(keep);
    }, 0);
  });

  const style = document.createElement('style');
  style.textContent = `
    .price-template-picker{display:grid;gap:9px;margin:0 0 14px;padding:11px;border:1px solid var(--line);border-radius:12px;background:#f8faf9}
    .price-template-heading b{display:block;font-size:12px}.price-template-heading small{display:block;color:var(--muted);font-size:9px;margin-top:2px}
    .price-template-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .price-template-option{display:grid;grid-template-columns:58px 1fr;align-items:center;gap:8px;text-align:left;border:1px solid #ccd8d1;background:#fff;border-radius:10px;padding:7px;color:var(--ink)}
    .price-template-option.active{border-color:var(--green);box-shadow:inset 0 0 0 1px var(--green);background:#f2f8f5}
    .price-template-option>b{font-size:10px;line-height:1.35}
    .template-thumb{height:42px;border-radius:6px;overflow:hidden;display:grid;place-items:center;font-size:10px;font-weight:900;line-height:1.05;position:relative}
    .standard-thumb{background:#101c32;color:#fff}.standard-thumb em{font-size:8px;font-style:normal}
    .hasegawa-thumb{background:#05060a;color:#fff;font-family:'Yuji Boku',serif}
    .hasegawa-thumb img{position:absolute;left:3px;top:3px;width:11px;height:auto}
    .hasegawa-thumb strong{font-size:9px;font-weight:400;text-shadow:.5px 0 #d71924,-.5px 0 #d71924}
    .hasegawa-thumb em{position:absolute;right:4px;bottom:3px;font:normal 6px sans-serif}

    .template-hasegawa-black{
      container-type:inline-size;
      border:0!important;
      border-radius:0!important;
      background:
        radial-gradient(circle at 52% 28%,rgba(18,20,28,.42),transparent 48%),
        linear-gradient(135deg,#07080d 0%,#05060a 58%,#08090e 100%)!important;
      color:#fff!important;
      font-family:'Yuji Syuku','Yu Mincho',serif!important;
    }
    .template-hasegawa-black::after{
      content:'';
      position:absolute;
      inset:1.05%;
      border:1px solid rgba(255,255,255,.48);
      pointer-events:none;
      z-index:20;
    }
    .template-hasegawa-black .pc-hasegawa-logo{
      position:absolute;
      left:4.2%;
      top:4.0%;
      width:12.45%;
      height:auto;
      z-index:8;
      display:block;
    }

    .template-hasegawa-black .pc-name{
      width:86.5%!important;
      max-width:none!important;
      white-space:nowrap!important;
      overflow:visible!important;
      text-align:center!important;
      font-family:'Yuji Boku','Yuji Syuku',serif!important;
      font-size:var(--hasegawa-name-size)!important;
      font-weight:400!important;
      line-height:.95!important;
      letter-spacing:.035em!important;
      color:#fff!important;
      -webkit-text-stroke:.18cqw #d71924;
      paint-order:stroke fill;
      text-shadow:none!important;
    }

    .template-hasegawa-black .pc-hasegawa-unit{
      position:absolute!important;
      left:50.7%!important;
      top:58.7%!important;
      transform:translate(-50%,-50%)!important;
      margin:0!important;
      z-index:6;
      white-space:nowrap;
      font:400 6.25cqw/.95 'Yuji Boku','Yuji Syuku',serif!important;
      color:#fff!important;
    }

    .template-hasegawa-black .pc-price-row{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:1.35cqw!important;
      width:max-content!important;
      max-width:51%!important;
      white-space:nowrap!important;
      font-family:'Yuji Syuku','Yu Mincho',serif!important;
    }
    .template-hasegawa-black .pc-tax{
      color:#df101d!important;
      font:400 2.85cqw/1 'Yuji Boku','Yuji Syuku',serif!important;
      margin:0 .4cqw 0 0!important;
      opacity:1!important;
      white-space:nowrap!important;
    }
    .template-hasegawa-black .pc-yen{
      color:#fff!important;
      font:500 7.15cqw/.9 'Yuji Syuku','Yu Mincho',serif!important;
      margin:0!important;
    }
    .template-hasegawa-black .pc-price{
      color:#fff!important;
      font:500 10.65cqw/.9 'Yuji Syuku','Yu Mincho',serif!important;
      letter-spacing:.055em!important;
    }
    .template-hasegawa-black .pc-hasegawa-base{
      position:absolute;
      right:4.75%;
      bottom:7.15%;
      color:#fff;
      font:700 2.05cqw/1.2 'Yuji Syuku','Yu Mincho',serif;
      letter-spacing:.035em;
      white-space:nowrap;
      z-index:6;
    }

    .template-hasegawa-black .pc-hasegawa-details{
      width:45.5%!important;
      color:#fff!important;
      font-family:'Yuji Syuku','Yu Mincho',serif!important;
      font-size:2.35cqw!important;
      font-weight:700!important;
      line-height:1.48!important;
      text-align:left!important;
      opacity:1!important;
      white-space:normal!important;
    }
    .template-hasegawa-black .pc-hasegawa-details .h-row{
      display:grid;
      grid-template-columns:43% 57%;
      align-items:baseline;
      white-space:nowrap;
    }
    .template-hasegawa-black .pc-hasegawa-details b{font-weight:700}
    .template-hasegawa-black .pc-note{
      width:38%!important;
      color:#fff!important;
      text-align:left!important;
      white-space:nowrap!important;
      font:700 2.35cqw/1.2 'Yuji Syuku','Yu Mincho',serif!important;
      opacity:1!important;
    }

    @media(max-width:440px){.price-template-options{grid-template-columns:1fr}}
    @media print{
      .template-hasegawa-black{border-radius:0!important}
      .template-hasegawa-black::after{border-width:.25mm}
      .template-hasegawa-black .pc-name,
      .template-hasegawa-black .pc-hasegawa-unit,
      .template-hasegawa-black .pc-tax,
      .template-hasegawa-black .pc-yen,
      .template-hasegawa-black .pc-price,
      .template-hasegawa-black .pc-hasegawa-base,
      .template-hasegawa-black .pc-hasegawa-details,
      .template-hasegawa-black .pc-note{
        -webkit-print-color-adjust:exact!important;
        print-color-adjust:exact!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
