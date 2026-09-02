(() => {
  const form = document.querySelector('#card-form');
  const preview = document.querySelector('#live-preview');
  const productList = document.querySelector('#product-list');
  if (!form || !preview || typeof currentCard !== 'function' || typeof applyCard !== 'function') return;

  const TEMPLATE_ID = 'hasegawa-black';
  const TEMPLATE_VERSION = 4;
  const REFERENCE_IMAGE = window.__HASEGAWA_REF_IMAGE || 'hasegawa-logo-original.svg';
  const REFERENCE_POSITIONS = {
    name: { x: 50.5, y: 35.3 },
    price: { x: 82.2, y: 79.0 },
    note: { x: 50, y: 70 },
    details: { x: 46.3, y: 84.0 }
  };
  const REFERENCE_SCALES = { name: 1, price: 1, note: 1, details: 1 };
  let activeTemplate = 'standard';
  let layoutTouched = false;

  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Yuji+Boku&family=Yuji+Syuku&display=swap';
  document.head.appendChild(fontLink);

  const unitSelect = document.querySelector('#unit');
  if (unitSelect) {
    [...unitSelect.options].filter(option => option.value === '1盛').forEach(option => option.remove());
    if (![...unitSelect.options].some(option => option.value === '100g')) {
      const option = document.createElement('option');
      option.value = '100g';
      option.textContent = '100g';
      unitSelect.insertBefore(option, unitSelect.firstChild);
    }
  }

  const picker = document.createElement('div');
  picker.className = 'price-template-picker';
  picker.innerHTML = `
    <div class="price-template-heading">
      <div><b>テンプレート</b><small>長谷川商店は送ってもらった画像をそのまま原版にしています</small></div>
    </div>
    <div class="price-template-options">
      <button type="button" class="price-template-option active" data-price-template="standard">
        <span class="template-thumb standard-thumb">Aa<br><em>¥1,296</em></span>
        <b>標準</b>
      </button>
      <button type="button" class="price-template-option" data-price-template="${TEMPLATE_ID}">
        <span class="template-thumb hasegawa-thumb"><img src="${REFERENCE_IMAGE}" alt=""></span>
        <b>長谷川商店・画像原版</b>
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
    if (len <= 4) factor = 1.08;
    else if (len === 5) factor = 1.03;
    else if (len === 6) factor = 1;
    else if (len === 7) factor = .92;
    else if (len === 8) factor = .84;
    else if (len === 9) factor = .77;
    else factor = Math.max(.55, 7.0 / len);
    const slider = Math.max(.7, Math.min(1.35, (Number(titleSize) || 56) / 56));
    return (11.2 * factor * slider).toFixed(2);
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

  function appendReferenceImage(el) {
    const image = document.createElement('img');
    image.className = 'pc-hasegawa-reference';
    image.src = REFERENCE_IMAGE;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    el.prepend(image);
  }

  function applyHasegawaTemplate(el, item) {
    el.classList.add('template-hasegawa-black');
    el.style.background = '#000';
    el.style.color = '#fff';
    appendReferenceImage(el);

    // The logo, frame, 100g, tax label, yen sign and left-side labels are part of the supplied image itself.
    el.querySelector('.pc-hasegawa-logo')?.remove();

    const name = el.querySelector('.pc-name');
    if (name) {
      name.style.setProperty('--hasegawa-name-size', `${fitNameCqw(item.name, item.titleSize)}cqw`);
      positionBlock(name, 'name', item);
    }

    const priceRow = el.querySelector('.pc-price-row');
    if (priceRow) {
      priceRow.querySelector('.pc-unit')?.remove();
      priceRow.querySelector('.pc-yen')?.remove();
      priceRow.querySelector('.pc-tax')?.remove();
      const price = priceRow.querySelector('.pc-price');
      if (price) price.textContent = Number(item.price) > 0 ? money(item.price) : '';
      positionBlock(priceRow, 'price', item);
    }
    el.querySelector(':scope > .pc-tax')?.remove();

    // The reference image has 100g already. Only cover it when another unit is explicitly chosen.
    if ((item.unit || '100g') !== '100g') {
      const unit = document.createElement('div');
      unit.className = 'pc-hasegawa-unit-custom';
      unit.textContent = item.unit || '';
      el.appendChild(unit);
    }

    // The supplied image already contains these exact labels; only editable values are overlaid.
    el.querySelector('.pc-details')?.remove();
    const details = document.createElement('div');
    details.className = 'pc-details pc-hasegawa-values';
    details.innerHTML = `
      <div>${item.allergens ? esc(item.allergens) : ''}</div>
      <div>${item.origin ? esc(item.origin) : ''}</div>
      <div>${item.processingPlace ? esc(item.processingPlace) : ''}</div>`;
    el.appendChild(details);
    positionBlock(details, 'details', item);

    // This exact reference has no extra note line, so do not duplicate one over the image.
    el.querySelector('.pc-note')?.remove();

    const base = document.createElement('div');
    base.className = 'pc-hasegawa-base';
    if (Number(item.price) > 0) {
      const basePrice = Math.round(Number(item.price) / 1.08);
      base.textContent = `${basePrice.toLocaleString('ja-JP')}円］`;
    }
    el.appendChild(base);
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
      document.querySelector('#bg-color').value = '#000000';
      document.querySelector('#text-color').value = '#ffffff';
      document.querySelector('#tax-label').value = '税込価格';
      document.querySelector('#title-size').value = '56';
      document.querySelector('#title-size-value').textContent = '56';
      if (unitSelect) unitSelect.value = '100g';
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
      showToast(button.dataset.priceTemplate === TEMPLATE_ID
        ? '送ってもらった長谷川商店の画像原版を適用しました'
        : '標準テンプレートに戻しました');
    }
  });

  preview.addEventListener('pointerdown', event => {
    if (activeTemplate === TEMPLATE_ID && event.target.closest('[data-drag-role]')) layoutTouched = true;
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
    .hasegawa-thumb{background:#000}.hasegawa-thumb img{width:100%;height:100%;object-fit:fill;display:block}

    .template-hasegawa-black{
      container-type:inline-size;
      border:0!important;
      border-radius:0!important;
      background:#000!important;
      color:#fff!important;
      overflow:hidden!important;
      font-family:'Yuji Syuku','Yu Mincho',serif!important;
    }
    .template-hasegawa-black::before,.template-hasegawa-black::after{content:none!important;display:none!important}
    .template-hasegawa-black .pc-hasegawa-reference{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
      object-fit:fill!important;display:block!important;z-index:0!important;pointer-events:none!important;user-select:none!important;
    }
    .template-hasegawa-black .pc-hasegawa-logo{display:none!important}

    .template-hasegawa-black .pc-name{
      z-index:4!important;width:86.5%!important;max-width:none!important;white-space:nowrap!important;overflow:visible!important;
      text-align:center!important;font-family:'Yuji Boku','Yuji Syuku',serif!important;
      font-size:var(--hasegawa-name-size)!important;font-weight:400!important;line-height:.95!important;letter-spacing:.025em!important;
      color:#fff!important;-webkit-text-stroke:.14cqw #d71924;paint-order:stroke fill;text-shadow:none!important;
    }

    .template-hasegawa-black .pc-price-row{
      z-index:5!important;display:block!important;width:max-content!important;max-width:none!important;white-space:nowrap!important;
      font-family:'Yuji Syuku','Yu Mincho',serif!important;
    }
    .template-hasegawa-black .pc-price{
      color:#fff!important;font:500 6.15cqw/.92 'Yuji Syuku','Yu Mincho',serif!important;letter-spacing:.035em!important;
    }
    .template-hasegawa-black .pc-yen,.template-hasegawa-black .pc-tax,.template-hasegawa-black .pc-unit{display:none!important}

    .template-hasegawa-black .pc-hasegawa-unit-custom{
      position:absolute;left:49.9%;top:58.7%;transform:translate(-50%,-50%);z-index:6;
      min-width:22%;padding:.6cqw 1.2cqw;background:#000;color:#fff;text-align:center;white-space:nowrap;
      font:400 5.45cqw/.95 'Yuji Boku','Yuji Syuku',serif!important;
    }

    .template-hasegawa-black .pc-hasegawa-values{
      z-index:4!important;width:34%!important;color:#fff!important;text-align:left!important;opacity:1!important;white-space:nowrap!important;
      font:700 2.25cqw/1.55 'Yuji Syuku','Yu Mincho',serif!important;letter-spacing:.01em!important;
    }
    .template-hasegawa-black .pc-hasegawa-values>div{height:1.55em;overflow:hidden;text-overflow:ellipsis}

    .template-hasegawa-black .pc-hasegawa-base{
      position:absolute;left:77.4%;bottom:7.0%;z-index:5;width:19.5%;height:5.7%;display:flex;align-items:center;justify-content:flex-start;
      color:#fff;font:700 2.05cqw/1 'Yuji Syuku','Yu Mincho',serif;letter-spacing:.035em;white-space:nowrap;
    }
    .template-hasegawa-black .pc-note{display:none!important}

    @media(max-width:440px){.price-template-options{grid-template-columns:1fr}}
    @media print{
      .template-hasegawa-black{border-radius:0!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      .template-hasegawa-black .pc-hasegawa-reference{display:block!important}
      .template-hasegawa-black .pc-name,.template-hasegawa-black .pc-price,.template-hasegawa-black .pc-hasegawa-values,.template-hasegawa-black .pc-hasegawa-base,.template-hasegawa-black .pc-hasegawa-unit-custom{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    }
  `;
  document.head.appendChild(style);
})();
