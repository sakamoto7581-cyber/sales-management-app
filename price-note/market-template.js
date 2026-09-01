(() => {
  const form = document.querySelector('#card-form');
  if (!form) return;

  const controls = document.createElement('div');
  controls.className = 'market-template-controls';
  controls.innerHTML = `
    <div class="two-col">
      <label>デザインテンプレート
        <select id="template-style">
          <option value="standard">標準</option>
          <option value="market-brush">物産展・筆文字（写真風）</option>
        </select>
      </label>
      <label>左上ロゴ文字（任意）
        <input id="brand-mark" placeholder="例：北海道">
      </label>
    </div>
    <label class="full">原材料・保存方法など（任意）
      <textarea id="legal-text" rows="3" placeholder="例：原材料名：紅鮭、食塩…&#10;保存方法：要冷蔵（10℃以下）"></textarea>
    </label>`;

  const designGrid = form.querySelector('.design-grid');
  form.insertBefore(controls, designGrid);

  const templateInput = document.querySelector('#template-style');
  const brandInput = document.querySelector('#brand-mark');
  const legalInput = document.querySelector('#legal-text');
  const bgInput = document.querySelector('#bg-color');
  const fgInput = document.querySelector('#text-color');
  const titleSizeInput = document.querySelector('#title-size');
  const taxInput = document.querySelector('#tax-label');
  const sizeInput = document.querySelector('#card-size');

  const originalCurrentCard = currentCard;
  currentCard = function() {
    const item = originalCurrentCard();
    item.template = templateInput.value;
    item.brand = brandInput.value.trim();
    item.legal = legalInput.value.trim();
    return item;
  };

  const originalCardHtml = cardHtml;
  cardHtml = function(item) {
    if ((item.template || 'standard') !== 'market-brush') return originalCardHtml(item);

    const price = Number(item.price) || 0;
    const basePrice = Math.round(price / 1.08);
    const unit = item.unit ? `${esc(item.unit)}あたり` : '';
    const taxLabel = item.tax || '税込価格';
    const legalLines = [];
    if (item.legal) legalLines.push(esc(item.legal).replace(/\n/g, '<br>'));
    if (item.allergens) legalLines.push(`アレルギー：${esc(item.allergens)}`);

    return `
      <div class="market-card-inner">
        ${item.brand ? `<div class="market-brand">${esc(item.brand)}</div>` : ''}
        <div class="market-name" style="font-size:${Math.max(30, Number(item.titleSize) || 44)}px">${esc(item.name || '商品名')}</div>
        ${unit ? `<div class="market-unit">${unit}</div>` : ''}
        ${item.note ? `<div class="market-note">${esc(item.note)}</div>` : ''}
        <div class="market-bottom">
          <div class="market-legal">${legalLines.join('<br>')}</div>
          <div class="market-price-block">
            <div class="market-price-line">
              ${taxLabel ? `<span class="market-tax-label">${esc(taxLabel)}</span>` : ''}
              <span class="market-yen">¥</span>
              <span class="market-price">${money(price)}</span>
            </div>
            ${taxLabel ? `<div class="market-base-price">（本体価格 ${money(basePrice)}円）</div>` : ''}
          </div>
        </div>
      </div>`;
  };

  templateInput.addEventListener('change', () => {
    if (templateInput.value === 'market-brush') {
      bgInput.value = '#10182d';
      fgInput.value = '#fff8f2';
      titleSizeInput.value = '46';
      taxInput.value = '税込価格';
      sizeInput.value = '100x80';
    }
    renderPreview();
  });

  function resetExtraFields() {
    templateInput.value = 'standard';
    brandInput.value = '';
    legalInput.value = '';
    renderPreview();
  }

  document.querySelector('#reset-form')?.addEventListener('click', () => setTimeout(resetExtraFields, 0));
  form.addEventListener('submit', () => setTimeout(resetExtraFields, 0));

  const list = document.querySelector('#product-list');
  list?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    if (!edit) return;
    setTimeout(() => {
      const item = products.find(x => x.id === edit.dataset.edit);
      if (!item) return;
      templateInput.value = item.template || 'standard';
      brandInput.value = item.brand || '';
      legalInput.value = item.legal || '';
      renderPreview();
    }, 0);
  });

  const style = document.createElement('style');
  style.textContent = `
    .market-template-controls{display:grid;gap:13px}
    .market-template-controls textarea{width:100%;border:1px solid #ccd8d1;background:#fff;border-radius:10px;padding:11px 12px;color:var(--ink);outline:none;resize:vertical;font:inherit;line-height:1.5}
    .market-template-controls textarea:focus{border-color:#6eaa96;box-shadow:0 0 0 3px rgba(23,108,81,.09)}
    .market-card-inner{position:absolute;inset:0;padding:7.5% 7% 6.5%;display:flex;flex-direction:column;align-items:center;text-align:center;font-family:"Yu Mincho","Hiragino Mincho ProN",serif}
    .market-brand{position:absolute;left:5.5%;top:5%;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif;font-size:10px;font-weight:800;line-height:1;border:1px solid currentColor;padding:5px 6px;transform:rotate(-2deg);opacity:.92}
    .market-name{margin-top:5%;font-family:"Yuji Syuku","Yu Mincho","Hiragino Mincho ProN",serif;font-weight:700;line-height:1.05;letter-spacing:.055em;text-shadow:0 1px 0 rgba(255,255,255,.08);max-width:92%;overflow-wrap:anywhere}
    .market-unit{margin-top:4%;font-family:"Yuji Syuku","Yu Mincho",serif;font-size:15px;font-weight:700;letter-spacing:.08em}
    .market-note{margin-top:2.5%;font-size:9px;font-weight:700;letter-spacing:.04em;opacity:.9}
    .market-bottom{margin-top:auto;width:100%;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(120px,.85fr);gap:8px;align-items:end;text-align:left}
    .market-legal{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif;font-size:7px;line-height:1.45;font-weight:650;opacity:.95;min-height:18px;overflow:hidden}
    .market-price-block{text-align:right;white-space:nowrap}
    .market-price-line{display:flex;align-items:flex-end;justify-content:flex-end;gap:4px}
    .market-tax-label{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif;color:#ff5d62;font-size:8px;font-weight:900;margin-bottom:5px}
    .market-yen{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif;font-size:21px;font-weight:700;line-height:1;margin-bottom:3px}
    .market-price{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,sans-serif;font-size:34px;font-weight:700;line-height:.9;letter-spacing:.05em}
    .market-base-price{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif;font-size:7px;font-weight:700;margin-top:4px;opacity:.95}
    @media(max-width:440px){.market-name{font-size:38px!important}.market-price{font-size:29px}.market-yen{font-size:18px}.market-unit{font-size:13px}.market-legal{font-size:6px}}
    @media print{.market-name{font-size:46px!important}.market-price{font-size:34px!important}.market-yen{font-size:21px!important}.market-unit{font-size:15px!important}.market-legal{font-size:7px!important}}
  `;
  document.head.appendChild(style);

  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&display=swap';
  document.head.appendChild(font);

  renderPreview();
})();