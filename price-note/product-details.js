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

  function detailRows(item) {
    return [
      { key: 'ingredients', label: '原材料', value: item.ingredients || '', lines: 2 },
      { key: 'origin', label: '原産地', value: item.origin || '', lines: 1 },
      { key: 'processing', label: '加工地', value: item.processingPlace || '', lines: 1 },
      { key: 'storage', label: '保存方法', value: item.storageMethod || '', lines: 1 },
      { key: 'allergens', label: 'アレルギー', value: item.allergens || '', lines: 1 }
    ];
  }

  const originalCardHtml = cardHtml;
  cardHtml = function(item) {
    let html = originalCardHtml(item);
    const rows = detailRows(item);
    const hasDetails = rows.some(row => row.value);
    html = html.replace(/<div class="pc-allergy">[\s\S]*?<\/div>/, '');
    if (hasDetails) {
      const rowHtml = rows.map(row => {
        const emptyClass = row.value ? '' : ' is-empty';
        const value = row.value ? `${row.label}：${esc(row.value)}` : '&nbsp;';
        return `<div class="pc-detail-row pc-detail-${row.key}${emptyClass}" style="--detail-lines:${row.lines}">${value}</div>`;
      }).join('');
      html += `<div class="pc-details pc-details-fixed">${rowHtml}</div>`;
    }
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
    .pc-details-fixed{display:grid;grid-template-rows:repeat(6,1.45em);align-content:start}
    .pc-details-fixed .pc-detail-row{min-height:calc(var(--detail-lines,1) * 1.45em);line-height:1.45;overflow:hidden}
    .pc-details-fixed .pc-detail-ingredients{grid-row:span 2;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;white-space:normal}
    .pc-details-fixed .pc-detail-row:not(.pc-detail-ingredients){white-space:nowrap;text-overflow:ellipsis}
    .pc-details-fixed .pc-detail-row.is-empty{visibility:hidden}
    @media print{.pc-details{font-size:7px!important}}
  `;
  document.head.appendChild(style);

  renderPreview();
})();
