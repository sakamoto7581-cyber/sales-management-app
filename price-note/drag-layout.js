(() => {
  const form = document.querySelector('#card-form');
  const preview = document.querySelector('#live-preview');
  const productList = document.querySelector('#product-list');
  if (!form || !preview || typeof applyCard !== 'function' || typeof currentCard !== 'function') return;

  const DEFAULT_POSITIONS = {
    name: { x: 50, y: 27 },
    price: { x: 50, y: 55 },
    note: { x: 50, y: 70 },
    details: { x: 50, y: 87 }
  };

  let draftPositions = clonePositions(DEFAULT_POSITIONS);
  let adjustMode = false;
  let activeDrag = null;

  function clonePositions(source) {
    const result = {};
    for (const [key, fallback] of Object.entries(DEFAULT_POSITIONS)) {
      const item = source?.[key] || fallback;
      result[key] = {
        x: clamp(Number(item.x), fallback.x),
        y: clamp(Number(item.y), fallback.y)
      };
    }
    return result;
  }

  function clamp(value, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(3, Math.min(97, Math.round(value * 10) / 10));
  }

  const originalCurrentCard = currentCard;
  currentCard = function() {
    const item = originalCurrentCard();
    item.positions = clonePositions(draftPositions);
    return item;
  };

  const originalApplyCard = applyCard;
  applyCard = function(el, item) {
    originalApplyCard(el, item);
    applyFreeLayout(el, item?.positions || DEFAULT_POSITIONS);
    if (el === preview) updateAdjustState();
  };

  function applyFreeLayout(card, positions) {
    const pos = clonePositions(positions);
    const blocks = [
      ['name', card.querySelector('.pc-name')],
      ['price', card.querySelector('.pc-price-row')],
      ['note', card.querySelector('.pc-note')],
      ['details', card.querySelector('.pc-details')]
    ];

    card.classList.add('free-layout-card');
    blocks.forEach(([role, element]) => {
      if (!element) return;
      element.dataset.dragRole = role;
      element.style.left = `${pos[role].x}%`;
      element.style.top = `${pos[role].y}%`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.margin = '0';
      element.style.transform = 'translate(-50%, -50%)';
    });
  }

  const previewWrap = preview.closest('.preview-wrap');
  const controls = document.createElement('div');
  controls.className = 'position-editor';
  controls.innerHTML = `
    <div class="position-editor-head">
      <div><b>文字位置</b><small>ONにして、プレビューの文字を指で動かせます</small></div>
      <button id="position-toggle" type="button" aria-pressed="false">文字位置を動かす</button>
    </div>
    <button id="position-reset" class="position-reset" type="button">位置を初期に戻す</button>`;
  previewWrap?.insertBefore(controls, previewWrap.querySelector('#live-preview'));

  const toggleButton = controls.querySelector('#position-toggle');
  const resetButton = controls.querySelector('#position-reset');

  toggleButton.addEventListener('click', () => {
    adjustMode = !adjustMode;
    toggleButton.setAttribute('aria-pressed', String(adjustMode));
    toggleButton.textContent = adjustMode ? '位置調整 ON' : '文字位置を動かす';
    updateAdjustState();
  });

  resetButton.addEventListener('click', () => {
    draftPositions = clonePositions(DEFAULT_POSITIONS);
    renderPreview();
    if (typeof showToast === 'function') showToast('文字位置を初期に戻しました');
  });

  function updateAdjustState() {
    preview.classList.toggle('position-adjusting', adjustMode);
    preview.querySelectorAll('[data-drag-role]').forEach(element => {
      element.classList.toggle('position-draggable', adjustMode);
    });
  }

  preview.addEventListener('pointerdown', event => {
    if (!adjustMode) return;
    const target = event.target.closest('[data-drag-role]');
    if (!target || !preview.contains(target)) return;
    event.preventDefault();
    const role = target.dataset.dragRole;
    if (!draftPositions[role]) return;
    activeDrag = { role, pointerId: event.pointerId, target };
    target.setPointerCapture?.(event.pointerId);
    target.classList.add('dragging');
    moveToPointer(event, role);
  });

  preview.addEventListener('pointermove', event => {
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    moveToPointer(event, activeDrag.role);
  });

  function finishDrag(event) {
    if (!activeDrag || (event.pointerId != null && activeDrag.pointerId !== event.pointerId)) return;
    activeDrag.target?.classList.remove('dragging');
    activeDrag = null;
  }
  preview.addEventListener('pointerup', finishDrag);
  preview.addEventListener('pointercancel', finishDrag);

  function moveToPointer(event, role) {
    const rect = preview.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, DEFAULT_POSITIONS[role].x);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, DEFAULT_POSITIONS[role].y);
    draftPositions[role] = { x, y };
    const element = preview.querySelector(`[data-drag-role="${role}"]`);
    if (element) {
      element.style.left = `${x}%`;
      element.style.top = `${y}%`;
    }
  }

  productList?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    if (!edit) return;
    setTimeout(() => {
      const item = products.find(product => product.id === edit.dataset.edit);
      if (!item) return;
      draftPositions = clonePositions(item.positions || DEFAULT_POSITIONS);
      renderPreview();
    }, 0);
  });

  document.querySelector('#reset-form')?.addEventListener('click', () => {
    setTimeout(() => {
      draftPositions = clonePositions(DEFAULT_POSITIONS);
      adjustMode = false;
      toggleButton.setAttribute('aria-pressed', 'false');
      toggleButton.textContent = '文字位置を動かす';
      renderPreview();
    }, 0);
  });

  form.addEventListener('submit', () => {
    setTimeout(() => {
      draftPositions = clonePositions(DEFAULT_POSITIONS);
      adjustMode = false;
      toggleButton.setAttribute('aria-pressed', 'false');
      toggleButton.textContent = '文字位置を動かす';
      renderPreview();
    }, 0);
  });

  const style = document.createElement('style');
  style.textContent = `
    .position-editor{display:grid;gap:8px;margin:0 0 12px;padding:10px 11px;border:1px solid var(--line);border-radius:11px;background:#f8faf9}
    .position-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .position-editor-head>div{display:grid;gap:2px}
    .position-editor-head b{font-size:11px}
    .position-editor-head small{font-size:8px;color:var(--muted);line-height:1.4}
    #position-toggle{border:1px solid #b9ccc3;background:#fff;color:var(--green);border-radius:9px;padding:8px 10px;font-size:9px;font-weight:800;white-space:nowrap}
    #position-toggle[aria-pressed="true"]{background:var(--green);color:#fff;border-color:var(--green)}
    .position-reset{justify-self:start;border:0;background:transparent;color:var(--muted);padding:1px 0;font-size:9px;font-weight:700;text-decoration:underline}
    .free-layout-card{display:block!important;padding:0!important}
    .free-layout-card .pc-name,.free-layout-card .pc-price-row,.free-layout-card .pc-note,.free-layout-card .pc-details{position:absolute!important;z-index:2}
    .free-layout-card .pc-name{width:88%;text-align:center}
    .free-layout-card .pc-price-row{width:max-content;max-width:92%;display:flex!important}
    .free-layout-card .pc-note{width:88%;text-align:center}
    .free-layout-card .pc-details{width:88%;text-align:left}
    .position-adjusting [data-drag-role]{outline:1px dashed rgba(255,255,255,.75);outline-offset:4px;cursor:move;touch-action:none;user-select:none;-webkit-user-select:none}
    .position-adjusting [data-drag-role]::after{content:'↕';position:absolute;right:-13px;top:-12px;font-size:9px;background:rgba(0,0,0,.55);color:#fff;border-radius:999px;width:16px;height:16px;display:grid;place-items:center;font-family:sans-serif}
    .position-adjusting [data-drag-role].dragging{outline-style:solid;opacity:.92}
    @media print{.position-adjusting [data-drag-role]{outline:0!important}.position-adjusting [data-drag-role]::after{display:none!important}}
  `;
  document.head.appendChild(style);

  renderPreview();
})();
