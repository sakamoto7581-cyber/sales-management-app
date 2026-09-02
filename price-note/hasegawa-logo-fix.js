(() => {
  const TEMPLATE_ID = 'hasegawa-black';
  if (typeof applyCard !== 'function') return;

  const brushFont = document.createElement('link');
  brushFont.rel = 'stylesheet';
  brushFont.href = 'https://fonts.googleapis.com/css2?family=Yuji+Mai&display=swap';
  document.head.appendChild(brushFont);

  // Keep the supplied artwork intact, but hide only the two brackets around the base-price line.
  const originalApplyCard = applyCard;
  applyCard = function(el, item) {
    originalApplyCard(el, item);
    if (item?.template !== TEMPLATE_ID) return;

    const base = el.querySelector('.pc-hasegawa-base');
    if (base) base.textContent = base.textContent.replace(/[］〕\]]+$/u, '');
  };

  const style = document.createElement('style');
  style.textContent = `
    .template-hasegawa-black{
      background:#101c32!important;
      isolation:isolate!important;
    }
    .template-hasegawa-black .pc-hasegawa-reference{
      mix-blend-mode:screen!important;
    }
    .template-hasegawa-black .pc-name{
      font-family:'Yuji Mai','Yuji Boku','Yuji Syuku',serif!important;
    }
    .template-hasegawa-black::before,
    .template-hasegawa-black::after{
      content:''!important;
      display:block!important;
      position:absolute!important;
      background:#101c32!important;
      z-index:3!important;
      pointer-events:none!important;
    }
    .template-hasegawa-black::before{
      left:58.9%!important;
      top:84.8%!important;
      width:1.45%!important;
      height:5.1%!important;
    }
    .template-hasegawa-black::after{
      left:93.1%!important;
      top:84.8%!important;
      width:1.45%!important;
      height:5.1%!important;
    }
  `;
  document.head.appendChild(style);

  if (typeof renderPreview === 'function') renderPreview();
})();
