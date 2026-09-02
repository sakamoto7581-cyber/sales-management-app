(() => {
  const TEMPLATE_ID = 'hasegawa-black';
  const LOGO_SRC = 'hasegawa-logo-original.svg?v=20260902-3';
  const unitSelect = document.querySelector('#unit');

  function replaceLogo(root = document) {
    root.querySelectorAll?.('.pc-hasegawa-logo').forEach(img => {
      if (img.getAttribute('src') !== LOGO_SRC) img.setAttribute('src', LOGO_SRC);
      img.setAttribute('alt', '函館 長谷川商店 ロゴ');
    });
    const thumb = document.querySelector('.hasegawa-thumb img');
    if (thumb && thumb.getAttribute('src') !== LOGO_SRC) thumb.setAttribute('src', LOGO_SRC);
  }

  function normalizeAllergenLabel(root = document) {
    root.querySelectorAll?.('.template-hasegawa-black .pc-hasegawa-details .h-row b').forEach(label => {
      if (label.textContent.trim() === '特定原材料等(28品目)') {
        label.textContent = '特定原材料等';
      }
    });
  }

  function normalizeUnitOptions() {
    if (!unitSelect) return;
    [...unitSelect.options]
      .filter(option => option.value === '1盛')
      .forEach(option => option.remove());

    if (![...unitSelect.options].some(option => option.value === '100g')) {
      const option = document.createElement('option');
      option.value = '100g';
      option.textContent = '100g';
      unitSelect.insertBefore(option, unitSelect.firstChild);
    }
  }

  function use100gForNewHasegawaTemplate() {
    normalizeUnitOptions();
    if (!unitSelect) return;
    unitSelect.value = '100g';
    if (typeof renderPreview === 'function') renderPreview();
  }

  if (typeof applyCard === 'function') {
    const originalApplyCard = applyCard;
    applyCard = function(el, item) {
      originalApplyCard(el, item);
      if (item?.template === TEMPLATE_ID) {
        replaceLogo(el);
        normalizeAllergenLabel(el);
      }
    };
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.(`[data-price-template="${TEMPLATE_ID}"]`);
    if (!button) return;
    setTimeout(use100gForNewHasegawaTemplate, 0);
  });

  const style = document.createElement('style');
  style.textContent = `
    .template-hasegawa-black::before{
      content:'';
      position:absolute;
      left:3.35%;
      top:3.35%;
      width:12.2%;
      height:19.2%;
      background:#05060a;
      z-index:7;
      pointer-events:none;
    }
    .template-hasegawa-black .pc-hasegawa-logo{
      left:4.30%!important;
      top:4.49%!important;
      width:10.09%!important;
      height:auto!important;
      z-index:8!important;
      object-fit:contain!important;
    }
    .template-hasegawa-black .pc-name{
      font-family:system-ui,-apple-system,'Segoe UI','Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif!important;
      font-weight:800!important;
      line-height:1!important;
      letter-spacing:.015em!important;
    }
    .template-hasegawa-black .pc-hasegawa-unit{
      font-family:system-ui,-apple-system,'Segoe UI','Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif!important;
      font-weight:800!important;
      line-height:1!important;
      letter-spacing:.02em!important;
    }
  `;
  document.head.appendChild(style);

  normalizeUnitOptions();
  replaceLogo();
  normalizeAllergenLabel();
  if (typeof renderPreview === 'function') renderPreview();
})();
