(() => {
  const form = document.querySelector('#card-form');
  if (!form) return;

  const designGrid = form.querySelector('.design-grid');

  const details = document.createElement('div');
  details.className = 'product-detail-fields';
  details.innerHTML = `
    <div class="detail-section-title">商品表示情報 <small>すべて任意</small></div>
    <label class="full">原材料
      <textarea id="ingredients" rows="2" placeholder="例：紅鮭、食塩、調味料（アミノ酸等）"></textarea>
    </label>
    <div class="two-col">
      <label>原産地
        <input id="origin" placeholder="例：ロシア">
      </label>
      <label>加工地
        <input id="processing-place" placeholder="例：北海道">
      </label>
    </div>
    <label class="full">保存方法
      <input id="storage-method" placeholder="例：要冷蔵（10℃以下）">
    </label>`;

  if (designGrid) form.insertBefore(details, designGrid);
  else form.appendChild(details);

  const ingredientsInput = document.querySelector('#ingredients');
  const originInput = document.querySelector('#origin');
  const processingInput = document.querySelector('#processing-place');
  const storageInput = document.querySelector('#storage-method');

  const originalCurrentCard = currentCard;
  currentCard = function() {
    const item = originalCurrentCard();
    item.ingredients = ingredientsInput.value.trim();
    item.origin = originInput.value.trim();
    item.processingPlace = processingInput.value.trim();
    item.storageMethod = storageInput.value.trim();
    return item;
  };

  function detailLines(item) {
    const lines = [];
    if (item.ingredients) lines.push(`原材料：${esc(item.ingredients)}`);
    if (item.origin) lines.push(`原産地：${esc(item.origin)}`);
    if (item.processingPlace) lines.push(`加工地：${esc(item.processingPlace)}`);
    if (item.storageMethod) lines.push(`保存方法：${esc(item.storageMethod)}`);
    if (item.allergens) lines.push(`アレルギー：${esc(item.allergens)}`);
    return lines;
  }

  const originalCardHtml = cardHtml;
  cardHtml = function(item) {
    let html = originalCardHtml(item);
    const lines = detailLines(item);
    html = html.replace(/<div class="pc-allergy">[\s\S]*?<\/div>/, '');
    if (lines.length) html += `<div class="pc-details">${lines.join('<br>')}</div>`;
    return html;
  };

  const productList = document.querySelector('#product-list');
  productList?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    if (!edit) return;
    setTimeout(() => {
      const item = products.find(x => x.id === edit.dataset.edit);
      if (!item) return;
      ingredientsInput.value = item.ingredients || '';
      originInput.value = item.origin || '';
      processingInput.value = item.processingPlace || '';
      storageInput.value = item.storageMethod || '';
      renderPreview();
    }, 0);
  });

  const originalApplyOcrText = typeof applyOcrText === 'function' ? applyOcrText : null;
  if (originalApplyOcrText) {
    applyOcrText = function(text) {
      originalApplyOcrText(text);
      const raw = String(text || '').replace(/\r/g, '');
      const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
      const findValue = labels => {
        for (const line of lines) {
          for (const label of labels) {
            const match = line.match(new RegExp(`^${label}\\s*[：:]\\s*(.+)$`));
            if (match?.[1]) return match[1].trim();
          }
        }
        return '';
      };
      const ingredients = findValue(['原材料名?', '原材料']);
      const origin = findValue(['原産地']);
      const processing = findValue(['加工地', '加工場所']);
      const storage = findValue(['保存方法']);
      if (ingredients) ingredientsInput.value = ingredients;
      if (origin) originInput.value = origin;
      if (processing) processingInput.value = processing;
      if (storage) storageInput.value = storage;
      renderPreview();
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    .product-detail-fields{display:grid;gap:13px;padding-top:3px}
    .product-detail-fields textarea{width:100%;border:1px solid #ccd8d1;background:#fff;border-radius:10px;padding:11px 12px;color:var(--ink);outline:none;resize:vertical;font:inherit;line-height:1.5}
    .product-detail-fields textarea:focus{border-color:#6eaa96;box-shadow:0 0 0 3px rgba(23,108,81,.09)}
    .detail-section-title{font-size:13px;font-weight:800;color:var(--ink);padding-top:4px}
    .detail-section-title small{font-size:9px;font-weight:600;color:var(--muted);margin-left:5px}
    .pc-details{position:absolute;left:6%;right:6%;bottom:5%;font-size:7px;line-height:1.45;font-weight:650;text-align:left;opacity:.94}
    @media print{.pc-details{font-size:7px!important}}
  `;
  document.head.appendChild(style);

  renderPreview();
})();