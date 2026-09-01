(() => {
  const DEFAULT_WIDTH_CM = 12.8;
  const DEFAULT_HEIGHT_CM = 8.5;

  const csLegacySize = document.querySelector('#card-size');
  const csForm = document.querySelector('#card-form');
  if (!csLegacySize || !csForm) return;

  const csSizeLabel = csLegacySize.closest('label');
  if (csSizeLabel) {
    const firstText = [...csSizeLabel.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
    if (firstText) firstText.textContent = 'カードサイズ（cm）\n            ';

    const csSizeRow = document.createElement('div');
    csSizeRow.className = 'custom-size-row';
    csSizeRow.innerHTML = `
      <label class="custom-size-field">横
        <input id="card-width-cm" type="number" min="1" max="30" step="0.1" inputmode="decimal" value="${DEFAULT_WIDTH_CM}">
      </label>
      <span class="custom-size-times">×</span>
      <label class="custom-size-field">縦
        <input id="card-height-cm" type="number" min="1" max="30" step="0.1" inputmode="decimal" value="${DEFAULT_HEIGHT_CM}">
      </label>`;
    csSizeLabel.insertBefore(csSizeRow, csLegacySize);
    csLegacySize.hidden = true;
  }

  const csWidthInput = document.querySelector('#card-width-cm');
  const csHeightInput = document.querySelector('#card-height-cm');
  if (!csWidthInput || !csHeightInput) return;

  function csClampDimension(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(30, Math.max(1, Math.round(n * 10) / 10));
  }

  function csLegacyDimensions(item) {
    if (Number(item?.widthCm) > 0 && Number(item?.heightCm) > 0) {
      return {
        width: csClampDimension(item.widthCm, DEFAULT_WIDTH_CM),
        height: csClampDimension(item.heightCm, DEFAULT_HEIGHT_CM)
      };
    }
    if (item?.size === '90x60') return { width: 9, height: 6 };
    if (item?.size === '105x148') return { width: 10.5, height: 14.8 };
    if (item?.size === '100x80') return { width: 10, height: 8 };
    return { width: DEFAULT_WIDTH_CM, height: DEFAULT_HEIGHT_CM };
  }

  function csCurrentDimensions() {
    return {
      width: csClampDimension(csWidthInput.value, DEFAULT_WIDTH_CM),
      height: csClampDimension(csHeightInput.value, DEFAULT_HEIGHT_CM)
    };
  }

  const csOriginalCurrentCard = currentCard;
  currentCard = function() {
    const item = csOriginalCurrentCard();
    const dims = csCurrentDimensions();
    item.widthCm = dims.width;
    item.heightCm = dims.height;
    item.size = 'custom';
    return item;
  };

  const csOriginalApplyCard = applyCard;
  applyCard = function(el, item) {
    csOriginalApplyCard(el, item);
    const dims = csLegacyDimensions(item);
    el.classList.add('custom-size-card');
    el.style.aspectRatio = `${dims.width} / ${dims.height}`;
    el.style.width = '100%';
    el.style.maxWidth = '540px';
    el.dataset.widthCm = dims.width;
    el.dataset.heightCm = dims.height;
  };

  function csRefreshPreview() {
    csWidthInput.value = csClampDimension(csWidthInput.value, DEFAULT_WIDTH_CM);
    csHeightInput.value = csClampDimension(csHeightInput.value, DEFAULT_HEIGHT_CM);
    renderPreview();
  }

  csWidthInput.addEventListener('input', renderPreview);
  csHeightInput.addEventListener('input', renderPreview);
  csWidthInput.addEventListener('change', csRefreshPreview);
  csHeightInput.addEventListener('change', csRefreshPreview);

  const csResetButton = document.querySelector('#reset-form');
  csResetButton?.addEventListener('click', () => {
    setTimeout(() => {
      csWidthInput.value = String(DEFAULT_WIDTH_CM);
      csHeightInput.value = String(DEFAULT_HEIGHT_CM);
      renderPreview();
    }, 0);
  });

  csForm.addEventListener('submit', () => {
    setTimeout(() => {
      csWidthInput.value = String(DEFAULT_WIDTH_CM);
      csHeightInput.value = String(DEFAULT_HEIGHT_CM);
      renderPreview();
    }, 0);
  });

  const csProductList = document.querySelector('#product-list');
  csProductList?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    if (!edit) return;
    setTimeout(() => {
      const item = products.find(x => x.id === edit.dataset.edit);
      if (!item) return;
      const dims = csLegacyDimensions(item);
      csWidthInput.value = String(dims.width);
      csHeightInput.value = String(dims.height);
      renderPreview();
    }, 0);
  });

  function csDimensionLabel(item) {
    const dims = csLegacyDimensions(item);
    return `${dims.width} × ${dims.height}cm`;
  }

  const csOpenPrintButton = document.querySelector('#open-print');
  csOpenPrintButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!products.length) {
      showToast('先に商品を保存してください');
      return;
    }
    const targetList = document.querySelector('#print-select-list');
    targetList.innerHTML = products.map((p, i) => `
      <label class="print-select-row">
        <input type="checkbox" value="${p.id}" ${i < 6 ? 'checked' : ''}>
        <div><b>${esc(p.name)}</b><span>${p.unit ? esc(p.unit) + ' ' : ''}¥${money(p.price)} ／ ${csDimensionLabel(p)}</span></div>
      </label>`).join('');
    document.querySelector('#print-dialog').showModal();
  }, true);

  function csSameDimensions(items) {
    if (!items.length) return true;
    const first = csLegacyDimensions(items[0]);
    return items.every(item => {
      const dims = csLegacyDimensions(item);
      return dims.width === first.width && dims.height === first.height;
    });
  }

  function csChooseA4Layout(widthMm, heightMm) {
    const margin = 5;
    const options = [
      { orientation: 'portrait', pageWidth: 210, pageHeight: 297 },
      { orientation: 'landscape', pageWidth: 297, pageHeight: 210 }
    ].map(option => {
      const usableWidth = option.pageWidth - margin * 2;
      const usableHeight = option.pageHeight - margin * 2;
      const cols = Math.floor(usableWidth / widthMm);
      const rows = Math.floor(usableHeight / heightMm);
      return { ...option, margin, cols, rows, perPage: Math.max(0, cols * rows) };
    });
    options.sort((a, b) => b.perPage - a.perPage || (a.orientation === 'portrait' ? -1 : 1));
    return options[0];
  }

  const csPrintNow = document.querySelector('#print-now');
  csPrintNow?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const selectedIds = [...document.querySelectorAll('#print-select-list input:checked')].map(input => input.value);
    const selected = selectedIds.map(productId => products.find(p => p.id === productId)).filter(Boolean);
    if (!selected.length) {
      showToast('印刷する商品を選んでください');
      return;
    }
    if (!csSameDimensions(selected)) {
      showToast('同じカードサイズの商品だけ選択してください');
      return;
    }

    const dims = csLegacyDimensions(selected[0]);
    const widthMm = dims.width * 10;
    const heightMm = dims.height * 10;
    const layout = csChooseA4Layout(widthMm, heightMm);
    if (!layout.perPage) {
      showToast('A4に収まるサイズにしてください');
      return;
    }

    let pageStyle = document.querySelector('#custom-size-page-style');
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = 'custom-size-page-style';
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `
      @page{size:A4 ${layout.orientation};margin:0}
      @media print{
        .print-sheet.custom-size-print{display:block!important;width:auto!important;min-height:0!important;padding:0!important;margin:0!important}
        .print-page-custom{width:${layout.pageWidth}mm;height:${layout.pageHeight}mm;padding:${layout.margin}mm;box-sizing:border-box;display:grid;grid-template-columns:repeat(${layout.cols},${widthMm}mm);grid-auto-rows:${heightMm}mm;justify-content:center;align-content:center;gap:0;break-after:page;page-break-after:always}
        .print-page-custom:last-child{break-after:auto;page-break-after:auto}
        .print-page-custom .price-card{width:${widthMm}mm!important;height:${heightMm}mm!important;max-width:none!important;aspect-ratio:auto!important;border-radius:0!important;box-shadow:none!important;margin:0!important;break-inside:avoid;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      }`;

    const sheet = document.querySelector('#print-sheet');
    sheet.className = 'print-sheet custom-size-print';
    sheet.innerHTML = '';

    for (let i = 0; i < selected.length; i += layout.perPage) {
      const page = document.createElement('div');
      page.className = 'print-page-custom';
      selected.slice(i, i + layout.perPage).forEach(item => {
        const card = document.createElement('div');
        applyCard(card, item);
        card.style.width = `${widthMm}mm`;
        card.style.height = `${heightMm}mm`;
        card.style.maxWidth = 'none';
        page.appendChild(card);
      });
      sheet.appendChild(page);
    }

    document.querySelector('#print-dialog').close();
    setTimeout(() => window.print(), 120);
  }, true);

  const csStyle = document.createElement('style');
  csStyle.textContent = `
    .custom-size-row{display:grid;grid-template-columns:1fr auto 1fr;gap:7px;align-items:end}
    .custom-size-field{display:grid;gap:4px;font-size:9px;font-weight:700;color:var(--muted)}
    .custom-size-field input{padding:10px 9px;text-align:center}
    .custom-size-times{padding-bottom:11px;color:var(--muted);font-weight:800}
    .preview-wrap .custom-size-card{width:100%;max-width:540px}
  `;
  document.head.appendChild(csStyle);

  csWidthInput.value = String(DEFAULT_WIDTH_CM);
  csHeightInput.value = String(DEFAULT_HEIGHT_CM);
  renderPreview();
})();
