(() => {
  const form = document.querySelector('#card-form');
  const preview = document.querySelector('#live-preview');
  const productList = document.querySelector('#product-list');
  if (!form || !preview || typeof currentCard !== 'function' || typeof applyCard !== 'function') return;

  const TEMPLATE_ID = 'hasegawa-black';
  let activeTemplate = 'standard';
  let initializedRoles = new Set();

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
      <div><b>テンプレート</b><small>デザインを選んでから商品情報を入力</small></div>
    </div>
    <div class="price-template-options">
      <button type="button" class="price-template-option active" data-price-template="standard">
        <span class="template-thumb standard-thumb">Aa<br><em>¥1,296</em></span>
        <b>標準</b>
      </button>
      <button type="button" class="price-template-option" data-price-template="${TEMPLATE_ID}">
        <span class="template-thumb hasegawa-thumb"><i>函館</i><strong>商品名</strong><em>¥1,296</em></span>
        <b>長谷川商店・黒筆文字</b>
      </button>
    </div>`;
  form.parentNode.insertBefore(picker, form);

  const originalCurrentCard = currentCard;
  currentCard = function() {
    const item = originalCurrentCard();
    item.template = activeTemplate;
    return item;
  };

  const originalApplyCard = applyCard;
  applyCard = function(el, item) {
    originalApplyCard(el, item);
    clearTemplateDecorations(el);
    if (item?.template === TEMPLATE_ID) applyHasegawaTemplate(el, item);
  };

  function clearTemplateDecorations(el) {
    el.classList.remove('template-hasegawa-black');
    el.querySelector('.pc-hasegawa-logo')?.remove();
    el.querySelector('.pc-hasegawa-base')?.remove();
    const movedUnit = el.querySelector('.pc-hasegawa-unit');
    const priceRow = el.querySelector('.pc-price-row');
    if (movedUnit && priceRow) {
      movedUnit.classList.remove('pc-hasegawa-unit');
      priceRow.insertBefore(movedUnit, priceRow.firstChild);
    }
  }

  function applyHasegawaTemplate(el, item) {
    el.classList.add('template-hasegawa-black');
    el.style.background = '#050912';
    el.style.color = '#ffffff';

    const logo = document.createElement('div');
    logo.className = 'pc-hasegawa-logo';
    logo.innerHTML = '<span class="pc-hakodate">函館</span><span class="pc-hasegawa-mark">介</span><span class="pc-hasegawa-store">長谷川商店</span>';
    el.prepend(logo);

    const priceRow = el.querySelector('.pc-price-row');
    const unit = priceRow?.querySelector('.pc-unit');
    if (unit) {
      unit.classList.add('pc-hasegawa-unit');
      priceRow.parentNode.insertBefore(unit, priceRow);
    }

    const tax = priceRow?.querySelector('.pc-tax');
    if (tax) {
      tax.textContent = tax.textContent || '税込価格';
      priceRow.insertBefore(tax, priceRow.firstChild);
    }

    if (priceRow && Number(item.price) > 0) {
      const base = document.createElement('div');
      base.className = 'pc-hasegawa-base';
      const basePrice = Math.round(Number(item.price) / 1.08);
      base.textContent = `［本体価格 ${basePrice.toLocaleString('ja-JP')}円］`;
      priceRow.insertAdjacentElement('afterend', base);
    }
  }

  function setTemplate(template, { fromEdit = false } = {}) {
    activeTemplate = template === TEMPLATE_ID ? TEMPLATE_ID : 'standard';
    picker.querySelectorAll('[data-price-template]').forEach(button => {
      button.classList.toggle('active', button.dataset.priceTemplate === activeTemplate);
    });

    if (activeTemplate === TEMPLATE_ID && !fromEdit) {
      document.querySelector('#bg-color').value = '#050912';
      document.querySelector('#text-color').value = '#ffffff';
      document.querySelector('#tax-label').value = '税込価格';
      document.querySelector('#title-size').value = '50';
      document.querySelector('#title-size-value').textContent = '50';
      if (unitSelect) unitSelect.value = '1盛';
      const width = document.querySelector('#card-width-cm');
      const height = document.querySelector('#card-height-cm');
      if (width) width.value = '12.8';
      if (height) height.value = '8.5';
      initializedRoles = new Set();
    } else if (fromEdit) {
      initializedRoles = new Set(['name', 'price', 'note', 'details']);
    }

    renderPreview();
    if (activeTemplate === TEMPLATE_ID && !fromEdit) requestAnimationFrame(initTemplateLayout);
  }

  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-price-template]');
    if (!button) return;
    setTemplate(button.dataset.priceTemplate);
    if (typeof showToast === 'function') showToast(button.dataset.priceTemplate === TEMPLATE_ID ? '長谷川商店テンプレートを適用しました' : '標準テンプレートに戻しました');
  });

  function moveRole(role, xPercent, yPercent) {
    if (initializedRoles.has(role)) return;
    const element = preview.querySelector(`[data-drag-role="${role}"]`);
    const toggle = document.querySelector('#position-toggle');
    if (!element || !toggle) return;

    const wasOn = toggle.getAttribute('aria-pressed') === 'true';
    if (!wasOn) toggle.click();
    const rect = preview.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      if (!wasOn && toggle.getAttribute('aria-pressed') === 'true') toggle.click();
      return;
    }

    const clientX = rect.left + rect.width * xPercent / 100;
    const clientY = rect.top + rect.height * yPercent / 100;
    const pointerId = 91 + initializedRoles.size;
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, pointerId, clientX, clientY, pointerType:'mouse', isPrimary:true }));
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, pointerId, clientX, clientY, pointerType:'mouse', isPrimary:true }));
    initializedRoles.add(role);
    if (!wasOn && toggle.getAttribute('aria-pressed') === 'true') toggle.click();
  }

  function initTemplateLayout() {
    if (activeTemplate !== TEMPLATE_ID) return;
    moveRole('name', 52, 34);
    moveRole('price', 78, 79);
    moveRole('note', 50, 61);
    moveRole('details', 26, 82);
  }

  form.addEventListener('input', () => {
    if (activeTemplate !== TEMPLATE_ID) return;
    requestAnimationFrame(initTemplateLayout);
  });
  form.addEventListener('change', () => {
    if (activeTemplate !== TEMPLATE_ID) return;
    requestAnimationFrame(initTemplateLayout);
  });

  productList?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    if (!edit) return;
    const item = products.find(product => product.id === edit.dataset.edit);
    if (!item) return;
    setTimeout(() => setTemplate(item.template || 'standard', { fromEdit:true }), 0);
  });

  document.querySelector('#reset-form')?.addEventListener('click', () => {
    const keep = activeTemplate;
    setTimeout(() => setTemplate(keep), 0);
  });
  form.addEventListener('submit', () => {
    const keep = activeTemplate;
    setTimeout(() => setTemplate(keep), 0);
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
    .hasegawa-thumb{background:#050912;color:#fff;font-family:'Yuji Syuku',serif}.hasegawa-thumb i{position:absolute;left:4px;top:3px;font-size:5px;font-style:normal}.hasegawa-thumb strong{font-size:9px;text-shadow:1px 0 #b91c1c,-1px 0 #b91c1c}.hasegawa-thumb em{position:absolute;right:4px;bottom:3px;font-size:6px;font-style:normal}

    .template-hasegawa-black{border:1px solid rgba(255,255,255,.34)!important;font-family:'Yuji Syuku','Yu Mincho',serif!important}
    .template-hasegawa-black .pc-hasegawa-logo{position:absolute;left:4.6%;top:5%;width:12%;z-index:5;color:#fff;text-align:center;font-family:'Yuji Syuku','Yu Mincho',serif;line-height:1}
    .template-hasegawa-black .pc-hakodate{display:block;font-size:6px;letter-spacing:.22em;margin-bottom:1px}
    .template-hasegawa-black .pc-hasegawa-mark{display:block;font:400 28px/1 'Yuji Boku','Yuji Syuku',serif;transform:scaleX(1.15)}
    .template-hasegawa-black .pc-hasegawa-store{display:block;font-size:6px;font-weight:700;margin-top:2px;white-space:nowrap}
    .template-hasegawa-black .pc-name{font-family:'Yuji Boku','Yuji Syuku',serif!important;font-weight:400!important;letter-spacing:.02em!important;line-height:1.05!important;text-shadow:1px 0 #c51f2b,-1px 0 #c51f2b,0 1px #c51f2b,0 -1px #c51f2b!important;width:84%!important;white-space:nowrap;overflow:visible!important}
    .template-hasegawa-black .pc-hasegawa-unit{position:absolute;left:50%;top:56%;transform:translate(-50%,-50%);font:400 24px/1 'Yuji Boku','Yuji Syuku',serif!important;margin:0!important;z-index:3;white-space:nowrap}
    .template-hasegawa-black .pc-price-row{font-family:'Yuji Syuku','Yu Mincho',serif!important;gap:6px!important;align-items:center!important;width:auto!important;max-width:48%!important;white-space:nowrap}
    .template-hasegawa-black .pc-tax{font-family:'Yuji Boku','Yuji Syuku',serif!important;color:#e01c26!important;font-size:12px!important;font-weight:400!important;margin:0 3px 0 0!important;opacity:1!important}
    .template-hasegawa-black .pc-yen{font-family:'Yuji Syuku','Yu Mincho',serif!important;font-size:30px!important;font-weight:700!important;margin:0!important}
    .template-hasegawa-black .pc-price{font-family:'Yuji Syuku','Yu Mincho',serif!important;font-size:44px!important;font-weight:700!important;letter-spacing:.06em!important}
    .template-hasegawa-black .pc-hasegawa-base{position:absolute;right:5%;bottom:8%;font:700 8px/1.2 'Yuji Syuku','Yu Mincho',serif;letter-spacing:.05em;white-space:nowrap}
    .template-hasegawa-black .pc-details{font-family:'Yuji Syuku','Yu Mincho',serif!important;font-size:8px!important;line-height:1.45!important;font-weight:700!important;width:43%!important;text-align:left!important;white-space:normal}
    .template-hasegawa-black .pc-note{font-family:'Yuji Boku','Yuji Syuku',serif!important;font-size:11px!important;font-weight:400!important}
    @media(max-width:440px){.price-template-options{grid-template-columns:1fr}.template-hasegawa-black .pc-price{font-size:38px!important}.template-hasegawa-black .pc-yen{font-size:25px!important}.template-hasegawa-black .pc-tax{font-size:10px!important}.template-hasegawa-black .pc-hasegawa-unit{font-size:20px!important}}
    @media print{.template-hasegawa-black .pc-name{font-size:inherit}.template-hasegawa-black .pc-price{font-size:44px!important}.template-hasegawa-black .pc-yen{font-size:30px!important}.template-hasegawa-black .pc-tax{font-size:12px!important}.template-hasegawa-black .pc-details{font-size:8px!important}.template-hasegawa-black .pc-hasegawa-base{font-size:8px!important}}
  `;
  document.head.appendChild(style);
})();
