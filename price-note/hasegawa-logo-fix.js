(() => {
  const LOGO_SRC = 'hasegawa-logo-original.svg';

  function replaceLogo(root = document) {
    root.querySelectorAll?.('.pc-hasegawa-logo').forEach(img => {
      if (img.getAttribute('src') !== LOGO_SRC) img.setAttribute('src', LOGO_SRC);
      img.setAttribute('alt', '函館 長谷川商店 ロゴ');
    });
    const thumb = document.querySelector('.hasegawa-thumb img');
    if (thumb && thumb.getAttribute('src') !== LOGO_SRC) thumb.setAttribute('src', LOGO_SRC);
  }

  if (typeof applyCard === 'function') {
    const originalApplyCard = applyCard;
    applyCard = function(el, item) {
      originalApplyCard(el, item);
      if (item?.template === 'hasegawa-black') replaceLogo(el);
    };
  }

  replaceLogo();
  if (typeof renderPreview === 'function') renderPreview();
})();
