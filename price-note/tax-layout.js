(() => {
  if (typeof applyCard !== 'function') return;

  const originalApplyCard = applyCard;
  applyCard = function(el, item) {
    originalApplyCard(el, item);
    const tax = el.querySelector('.pc-tax');
    const priceRow = el.querySelector('.pc-price-row');
    if (tax && priceRow) priceRow.appendChild(tax);
  };

  const style = document.createElement('style');
  style.textContent = `
    .price-card .pc-price-row{display:flex;align-items:flex-end;justify-content:center;gap:5px;margin-top:8px}
    .price-card .pc-tax{font-size:9px;font-weight:800;margin:0 0 5px 1px;line-height:1;white-space:nowrap;opacity:.95}
    @media(max-width:440px){.price-card .pc-tax{font-size:8px;margin-bottom:4px}}
    @media print{.price-card .pc-tax{font-size:9px!important;margin-bottom:5px!important}}
  `;
  document.head.appendChild(style);

  if (typeof renderPreview === 'function') renderPreview();
})();
