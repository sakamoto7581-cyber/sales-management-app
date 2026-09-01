const EVENT_PURCHASE_KEY = 'uriage-note-event-purchases-v1';
const purchaseProductUnits = { 'タラコ液':'本', '明太子液':'本' };
let eventPurchaseBatches = purchaseReadJson(EVENT_PURCHASE_KEY, []);
let purchaseActiveEventId = '';

const purchaseDialog = document.createElement('dialog');
purchaseDialog.id = 'purchase-dialog';
purchaseDialog.innerHTML = `
  <div class="purchase-shell">
    <div class="purchase-header">
      <div>
        <p class="eyebrow">PURCHASE</p>
        <h2 id="purchase-title">仕入を入力</h2>
        <p id="purchase-period"></p>
      </div>
      <button type="button" class="close-button" data-purchase-close aria-label="閉じる">×</button>
    </div>
    <div class="purchase-body">
      <div class="purchase-date-row">
        <label>仕入日<input id="purchase-date" type="date" /></label>
        <p>原価マスターの「この日から適用」を使って金額を自動計算します。</p>
      </div>
      <div class="purchase-table-head"><span>商品名</span><span>原価</span><span>数量</span><span>金額</span></div>
      <div id="purchase-product-list" class="purchase-product-list"></div>
      <div class="purchase-total"><span>仕入合計</span><strong id="purchase-total-value">¥0</strong></div>
      <div class="purchase-history-section">
        <h3>仕入履歴</h3>
        <div id="purchase-history-list"></div>
      </div>
    </div>
    <div class="purchase-actions">
      <button type="button" class="secondary" data-purchase-close>閉じる</button>
      <button type="button" class="submit-button" id="purchase-save">この日の仕入を保存</button>
    </div>
  </div>`;
document.body.appendChild(purchaseDialog);

const purchaseDateInput = purchaseDialog.querySelector('#purchase-date');
const purchaseProductList = purchaseDialog.querySelector('#purchase-product-list');
const purchaseTotalValue = purchaseDialog.querySelector('#purchase-total-value');
const purchaseHistoryList = purchaseDialog.querySelector('#purchase-history-list');

purchaseDialog.querySelectorAll('[data-purchase-close]').forEach(button => button.addEventListener('click', () => purchaseDialog.close()));
purchaseDialog.addEventListener('click', event => { if (event.target === purchaseDialog) purchaseDialog.close(); });
purchaseDateInput.addEventListener('change', purchaseRenderEditor);
purchaseProductList.addEventListener('input', purchaseUpdateTotal);
purchaseDialog.querySelector('#purchase-save').addEventListener('click', purchaseSaveBatch);
purchaseHistoryList.addEventListener('click', event => {
  const edit = event.target.closest('[data-purchase-edit-date]');
  if (edit) {
    purchaseDateInput.value = edit.dataset.purchaseEditDate;
    purchaseRenderEditor();
    purchaseDialog.querySelector('.purchase-body').scrollTo({top:0, behavior:'smooth'});
    return;
  }
  const del = event.target.closest('[data-purchase-delete-id]');
  if (del) purchaseDeleteBatch(del.dataset.purchaseDeleteId);
});

function purchaseReadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function purchasePersist() {
  localStorage.setItem(EVENT_PURCHASE_KEY, JSON.stringify(eventPurchaseBatches));
}
function purchaseProducts() {
  return typeof INVENTORY_PRODUCTS !== 'undefined' ? INVENTORY_PRODUCTS : [];
}
function purchaseUnit(product) {
  return purchaseProductUnits[product] || 'kg';
}
function purchaseCost(product, date) {
  return typeof getCostAt === 'function' ? Number(getCostAt(product, date)) || 0 : 0;
}
function purchaseMoney(value) {
  return typeof yen !== 'undefined' ? yen.format(Number(value) || 0) : `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
}
function purchaseEscape(value) {
  const el = document.createElement('span');
  el.textContent = String(value ?? '');
  return el.innerHTML;
}
function purchaseBatchesForEvent(eventId) {
  return eventPurchaseBatches.filter(batch => batch.eventId === eventId);
}
function purchaseBatchForDate(eventId, date) {
  return eventPurchaseBatches.find(batch => batch.eventId === eventId && batch.date === date) || null;
}
function purchaseBatchTotal(batch) {
  return Object.entries(batch?.quantities || {}).reduce((sum, [product, qty]) => sum + (Number(qty) || 0) * purchaseCost(product, batch.date), 0);
}
function purchaseEventTotal(eventId) {
  return purchaseBatchesForEvent(eventId).reduce((sum, batch) => sum + purchaseBatchTotal(batch), 0);
}
function purchaseSyncEvent(eventId) {
  if (typeof events === 'undefined') return;
  const item = events.find(eventItem => eventItem.id === eventId);
  if (!item) return;
  const batches = purchaseBatchesForEvent(eventId);
  if (!batches.length) return;
  item.purchase = Math.round(purchaseEventTotal(eventId));
  item.updatedAt = Date.now();
}
function purchaseSyncAll() {
  if (typeof events === 'undefined') return;
  const ids = [...new Set(eventPurchaseBatches.map(batch => batch.eventId))];
  ids.forEach(purchaseSyncEvent);
  if (ids.length && typeof persistAll === 'function') persistAll();
  if (typeof render === 'function') render();
}

function openPurchaseDialog(eventId) {
  const item = typeof events !== 'undefined' ? events.find(eventItem => eventItem.id === eventId) : null;
  if (!item) return;
  purchaseActiveEventId = eventId;
  purchaseDialog.querySelector('#purchase-title').textContent = `${item.store}の仕入`;
  purchaseDialog.querySelector('#purchase-period').textContent = `${item.name || '会期'} ／ ${formatDate(item.startDate)}〜${formatDate(item.endDate)}`;
  purchaseDateInput.min = item.startDate;
  purchaseDateInput.max = item.endDate;
  const now = typeof todayKey !== 'undefined' ? todayKey : item.endDate;
  purchaseDateInput.value = now >= item.startDate && now <= item.endDate ? now : item.endDate;
  purchaseRenderEditor();
  if (!purchaseDialog.open) purchaseDialog.showModal();
}

function purchaseRenderEditor() {
  const item = typeof events !== 'undefined' ? events.find(eventItem => eventItem.id === purchaseActiveEventId) : null;
  if (!item) return;
  const date = purchaseDateInput.value || item.endDate;
  const batch = purchaseBatchForDate(purchaseActiveEventId, date);
  purchaseProductList.innerHTML = purchaseProducts().map((product, index) => {
    const cost = purchaseCost(product, date);
    const qty = batch?.quantities?.[product] ?? '';
    const amount = (Number(qty) || 0) * cost;
    const unit = purchaseUnit(product);
    return `<div class="purchase-product-row">
      <div class="purchase-product-name"><span>${index + 1}</span><b>${purchaseEscape(product)}</b></div>
      <div class="purchase-product-cost">${cost ? `${purchaseMoney(cost)}/${unit}` : '原価未設定'}</div>
      <label class="purchase-qty"><input type="number" min="0" step="0.01" inputmode="decimal" data-purchase-product="${purchaseEscape(product)}" value="${qty}" placeholder="0" /><span>${unit}</span></label>
      <strong class="purchase-line-total" data-purchase-line="${purchaseEscape(product)}">${purchaseMoney(amount)}</strong>
    </div>`;
  }).join('');
  purchaseUpdateTotal();
  purchaseRenderHistory();
}

function purchaseUpdateTotal() {
  const date = purchaseDateInput.value;
  let total = 0;
  purchaseProductList.querySelectorAll('[data-purchase-product]').forEach(input => {
    const product = input.dataset.purchaseProduct;
    const qty = Math.max(0, Number(input.value) || 0);
    const amount = qty * purchaseCost(product, date);
    total += amount;
    const line = purchaseProductList.querySelector(`[data-purchase-line="${CSS.escape(product)}"]`);
    if (line) line.textContent = purchaseMoney(amount);
  });
  purchaseTotalValue.textContent = purchaseMoney(total);
}

function purchaseSaveBatch() {
  const item = typeof events !== 'undefined' ? events.find(eventItem => eventItem.id === purchaseActiveEventId) : null;
  if (!item) return;
  const date = purchaseDateInput.value;
  if (!date || date < item.startDate || date > item.endDate) {
    alert('仕入日は会期内の日付を選んでください。');
    return;
  }
  const quantities = {};
  const missingCost = [];
  purchaseProductList.querySelectorAll('[data-purchase-product]').forEach(input => {
    const qty = Math.max(0, Number(input.value) || 0);
    if (!qty) return;
    const product = input.dataset.purchaseProduct;
    quantities[product] = qty;
    if (!purchaseCost(product, date)) missingCost.push(product);
  });
  if (missingCost.length) {
    alert(`原価が設定されていない商品があります。\n\n${missingCost.join('、')}\n\n先に「在庫 → 原価マスター」で原価を設定してください。`);
    return;
  }
  const existing = purchaseBatchForDate(purchaseActiveEventId, date);
  if (!Object.keys(quantities).length) {
    if (existing) return purchaseDeleteBatch(existing.id, true);
    alert('仕入数量を入力してください。');
    return;
  }
  if (existing) {
    existing.quantities = quantities;
    existing.updatedAt = Date.now();
  } else {
    eventPurchaseBatches.push({ id: purchaseMakeId(), eventId: purchaseActiveEventId, date, quantities, createdAt: Date.now(), updatedAt: Date.now() });
  }
  purchasePersist();
  purchaseSyncEvent(purchaseActiveEventId);
  if (typeof persistAll === 'function') persistAll();
  if (typeof render === 'function') render();
  purchaseRenderEditor();
  if (typeof inventoryToast === 'function') inventoryToast(existing ? '仕入を更新しました' : '仕入を保存しました');
  else alert(existing ? '仕入を更新しました' : '仕入を保存しました');
}

function purchaseDeleteBatch(id, skipConfirm = false) {
  const batch = eventPurchaseBatches.find(item => item.id === id);
  if (!batch) return;
  if (!skipConfirm && !confirm(`${batch.date.replaceAll('-','/')} の仕入 ${purchaseMoney(purchaseBatchTotal(batch))}\n\nこの仕入を削除しますか？`)) return;
  const eventId = batch.eventId;
  eventPurchaseBatches = eventPurchaseBatches.filter(item => item.id !== id);
  purchasePersist();
  const eventItem = typeof events !== 'undefined' ? events.find(item => item.id === eventId) : null;
  if (eventItem) {
    const remaining = purchaseBatchesForEvent(eventId);
    eventItem.purchase = remaining.length ? Math.round(purchaseEventTotal(eventId)) : 0;
    eventItem.updatedAt = Date.now();
  }
  if (typeof persistAll === 'function') persistAll();
  if (typeof render === 'function') render();
  purchaseRenderEditor();
  if (typeof inventoryToast === 'function') inventoryToast('仕入を削除しました');
}

function purchaseRenderHistory() {
  const rows = purchaseBatchesForEvent(purchaseActiveEventId).sort((a,b) => b.date.localeCompare(a.date));
  purchaseHistoryList.innerHTML = rows.length ? rows.map(batch => {
    const itemCount = Object.values(batch.quantities || {}).filter(value => Number(value) > 0).length;
    return `<div class="purchase-history-row">
      <div><b>${batch.date.replaceAll('-','/')}</b><span>${itemCount}商品 ／ ${purchaseMoney(purchaseBatchTotal(batch))}</span></div>
      <div><button type="button" data-purchase-edit-date="${batch.date}">開く</button><button type="button" class="danger" data-purchase-delete-id="${batch.id}">削除</button></div>
    </div>`;
  }).join('') : '<div class="inventory-empty">仕入はまだ登録されていません</div>';
}
function purchaseMakeId() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 会期詳細の「仕入」欄をタップできるカードにする。
if (typeof browserOpenEventDetail === 'function') {
  const originalBrowserOpenEventDetail = browserOpenEventDetail;
  browserOpenEventDetail = function(id) {
    originalBrowserOpenEventDetail(id);
    const cards = browserDetailDialog.querySelectorAll('.event-detail-summary > div');
    const purchaseCard = [...cards].find(card => card.querySelector('span')?.textContent.trim() === '仕入');
    if (purchaseCard) {
      purchaseCard.classList.add('purchase-open-card');
      purchaseCard.dataset.purchaseEventId = id;
      purchaseCard.setAttribute('role', 'button');
      purchaseCard.setAttribute('tabindex', '0');
      const label = purchaseCard.querySelector('span');
      if (label && !label.querySelector('b')) label.insertAdjacentHTML('beforeend', '<b class="purchase-card-arrow">›</b>');
    }
  };
  browserDetailDialog.addEventListener('click', event => {
    const card = event.target.closest('.purchase-open-card');
    if (!card) return;
    browserDetailDialog.close();
    openPurchaseDialog(card.dataset.purchaseEventId);
  });
  browserDetailDialog.addEventListener('keydown', event => {
    const card = event.target.closest('.purchase-open-card');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      browserDetailDialog.close();
      openPurchaseDialog(card.dataset.purchaseEventId);
    }
  });
}

// 会期編集画面の仕入合計は商品別入力から自動計算する。
if (typeof openEventDialog === 'function') {
  const originalOpenEventDialogForPurchase = openEventDialog;
  openEventDialog = function(id = '') {
    originalOpenEventDialogForPurchase(id);
    const input = eventForm?.elements?.purchase;
    if (!input) return;
    input.readOnly = true;
    input.placeholder = id ? '商品別仕入から自動計算' : '会期作成後に入力';
    const label = input.closest('label');
    if (!label) return;
    let helper = label.querySelector('.purchase-field-helper');
    if (!helper) {
      helper = document.createElement('div');
      helper.className = 'purchase-field-helper';
      label.appendChild(helper);
    }
    if (id) {
      helper.innerHTML = `<button type="button" data-event-purchase-button="${id}">商品別仕入を入力</button>`;
      helper.querySelector('button').addEventListener('click', () => {
        eventDialog.close();
        openPurchaseDialog(id);
      });
    } else {
      helper.textContent = '会期を作成した後、会期詳細の「仕入」から入力できます。';
    }
  };
}

// 原価マスター変更後は、過去の仕入日ごとの原価で仕入合計を再計算する。
if (typeof costForm !== 'undefined' && costForm) {
  costForm.addEventListener('submit', () => setTimeout(purchaseSyncAll, 0));
}
if (typeof costHistoryList !== 'undefined' && costHistoryList) {
  costHistoryList.addEventListener('click', event => {
    if (event.target.closest('[data-delete-cost-id]')) setTimeout(purchaseSyncAll, 0);
  });
}

purchaseSyncAll();
