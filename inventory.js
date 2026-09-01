const INVENTORY_PRODUCTS = [
  'いくら醤油漬け','甘塩たらこ','辛子明太子','とびっ子','塩筋子','紅鮭親子ルイベ','子持ち昆布切り落とし','数の子松前漬','松前漬','切干松前漬','白造り松前','小いかトビラン','たこ足わさび','真いか塩辛','つぶわさび','菜の花にしん漬','のりくらげ','漁火真いか塩辛','ほたてわさび漬','えんがわジャン辛','浜造り塩辛','いかキムチ','紅鮭しぐれ','にしん甘酢漬','紋甲明太','粒うにいか','磯紋甲（柚子）','タラコ液','明太子液','明太ペースト'
];
const STOCK_KEY = 'uriage-note-stock-snapshots-v1';
const COST_KEY = 'uriage-note-cost-history-v1';
let stockSnapshots = readInventoryJson(STOCK_KEY, []);
let costHistory = readInventoryJson(COST_KEY, {});
let activeCostProduct = '';

const inventoryPage = document.querySelector('#inventory-page');
const dashboardPage = document.querySelector('#dashboard');
const stockDateInput = document.querySelector('#stock-date');
const stockList = document.querySelector('#stock-list');
const costList = document.querySelector('#cost-list');
const stockValue = document.querySelector('#stock-value');
const stockHistoryList = document.querySelector('#stock-history-list');
const costDialog = document.querySelector('#cost-dialog');
const costForm = document.querySelector('#cost-form');
const costDialogProduct = document.querySelector('#cost-dialog-product');
const costHistoryList = document.querySelector('#cost-history-list');

stockDateInput.value = inventoryLocalDateKey(new Date());

document.querySelectorAll('[data-open-inventory]').forEach(button => button.addEventListener('click', openInventory));
document.querySelectorAll('[data-close-inventory]').forEach(button => button.addEventListener('click', closeInventory));
document.querySelectorAll('[data-inventory-tab]').forEach(button => button.addEventListener('click', () => switchInventoryTab(button.dataset.inventoryTab)));
document.querySelector('#save-stock').addEventListener('click', saveStockSnapshot);
stockDateInput.addEventListener('change', renderStock);
stockList.addEventListener('input', updateStockValue);
costList.addEventListener('click', event => {
  const button = event.target.closest('[data-cost-product]');
  if (button) openCostDialog(button.dataset.costProduct);
});
stockHistoryList.addEventListener('click', event => {
  const openButton = event.target.closest('[data-open-stock-date]');
  if (openButton) {
    stockDateInput.value = openButton.dataset.openStockDate;
    renderStock();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const deleteButton = event.target.closest('[data-delete-stock-id]');
  if (deleteButton) deleteStockSnapshot(deleteButton.dataset.deleteStockId);
});
document.querySelectorAll('[data-close-cost]').forEach(button => button.addEventListener('click', () => costDialog.close()));
costDialog.addEventListener('click', event => { if (event.target === costDialog) costDialog.close(); });
costForm.addEventListener('submit', saveCostChange);
costHistoryList.addEventListener('click', event => {
  const button = event.target.closest('[data-delete-cost-id]');
  if (button) deleteCostChange(button.dataset.deleteCostId);
});

function readInventoryJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function persistInventory() {
  localStorage.setItem(STOCK_KEY, JSON.stringify(stockSnapshots));
  localStorage.setItem(COST_KEY, JSON.stringify(costHistory));
}
function inventoryLocalDateKey(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function inventoryMoney(value) {
  return new Intl.NumberFormat('ja-JP', { style:'currency', currency:'JPY', maximumFractionDigits:0 }).format(Number(value) || 0);
}
function inventoryNumber(value) { return Math.max(0, Number(value) || 0); }
function invId() { return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function esc(value) { const el=document.createElement('span'); el.textContent=String(value ?? ''); return el.innerHTML; }

function openInventory() {
  dashboardPage.hidden = true;
  inventoryPage.hidden = false;
  document.body.classList.add('inventory-open');
  document.querySelectorAll('.mobile-nav > *').forEach(item => item.classList.remove('active'));
  document.querySelector('[data-open-inventory].mobile-inventory')?.classList.add('active');
  switchInventoryTab('stock');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function closeInventory() {
  inventoryPage.hidden = true;
  dashboardPage.hidden = false;
  document.body.classList.remove('inventory-open');
  document.querySelectorAll('.mobile-nav > *').forEach(item => item.classList.remove('active'));
  document.querySelector('.mobile-nav a[href="#dashboard"]')?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function switchInventoryTab(tab) {
  document.querySelectorAll('[data-inventory-tab]').forEach(button => button.classList.toggle('active', button.dataset.inventoryTab === tab));
  document.querySelectorAll('[data-inventory-panel]').forEach(panel => panel.hidden = panel.dataset.inventoryPanel !== tab);
  if (tab === 'stock') renderStock();
  else renderCosts();
}

function getCostEntries(product) {
  return Array.isArray(costHistory[product]) ? [...costHistory[product]].sort((a,b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.createdAt - b.createdAt) : [];
}
function getCostAt(product, date) {
  const eligible = getCostEntries(product).filter(item => item.effectiveDate <= date);
  return eligible.length ? inventoryNumber(eligible.at(-1).cost) : 0;
}
function getLatestCost(product) {
  const entries = getCostEntries(product);
  return entries.length ? entries.at(-1) : null;
}
function snapshotForDate(date) {
  return stockSnapshots.find(item => item.date === date) || null;
}
function previousSnapshot(date) {
  return [...stockSnapshots].filter(item => item.date < date).sort((a,b) => b.date.localeCompare(a.date))[0] || null;
}

function renderStock() {
  const date = stockDateInput.value || inventoryLocalDateKey(new Date());
  const current = snapshotForDate(date);
  const previous = previousSnapshot(date);
  stockList.innerHTML = INVENTORY_PRODUCTS.map((product, index) => {
    const qty = current?.quantities?.[product] ?? '';
    const prev = previous?.quantities?.[product];
    const cost = getCostAt(product, date);
    return `<div class="stock-row">
      <div class="stock-name"><span>${index + 1}</span><b>${esc(product)}</b></div>
      <div class="stock-prev">${prev === undefined ? '—' : Number(prev).toLocaleString('ja-JP')}</div>
      <label class="stock-input-wrap"><input type="number" min="0" step="0.01" inputmode="decimal" data-stock-product="${esc(product)}" value="${qty}" placeholder="0" aria-label="${esc(product)} 数量" /></label>
      <div class="stock-cost">${cost ? inventoryMoney(cost) : '未設定'}</div>
    </div>`;
  }).join('');
  document.querySelector('#stock-previous-date').textContent = previous ? `前回 ${previous.date.replaceAll('-','/')}` : '前回なし';
  document.querySelector('#stock-save-label').textContent = current ? 'この日の在庫を更新' : '在庫チェックを保存';
  updateStockValue();
  renderStockHistory();
}
function updateStockValue() {
  const date = stockDateInput.value;
  let total = 0;
  stockList.querySelectorAll('[data-stock-product]').forEach(input => {
    total += inventoryNumber(input.value) * getCostAt(input.dataset.stockProduct, date);
  });
  stockValue.textContent = inventoryMoney(total);
}
function saveStockSnapshot() {
  const date = stockDateInput.value;
  if (!date) return;
  const quantities = {};
  stockList.querySelectorAll('[data-stock-product]').forEach(input => quantities[input.dataset.stockProduct] = inventoryNumber(input.value));
  const existing = snapshotForDate(date);
  if (existing) {
    existing.quantities = quantities;
    existing.updatedAt = Date.now();
  } else {
    stockSnapshots.push({ id: invId(), date, quantities, createdAt: Date.now(), updatedAt: Date.now() });
  }
  stockSnapshots.sort((a,b) => b.date.localeCompare(a.date));
  persistInventory();
  renderStock();
  inventoryToast(existing ? '在庫チェックを更新しました' : '在庫チェックを保存しました');
}
function renderStockHistory() {
  const sorted = [...stockSnapshots].sort((a,b) => b.date.localeCompare(a.date));
  if (!sorted.length) {
    stockHistoryList.innerHTML = '<div class="inventory-empty">保存した在庫チェックはまだありません</div>';
    return;
  }
  stockHistoryList.innerHTML = sorted.slice(0, 12).map(item => {
    const totalQty = INVENTORY_PRODUCTS.reduce((sum,p) => sum + inventoryNumber(item.quantities?.[p]), 0);
    const value = INVENTORY_PRODUCTS.reduce((sum,p) => sum + inventoryNumber(item.quantities?.[p]) * getCostAt(p, item.date), 0);
    return `<div class="stock-history-row"><div><b>${item.date.replaceAll('-','/')}</b><span>合計数量 ${totalQty.toLocaleString('ja-JP')} ／ 評価額 ${inventoryMoney(value)}</span></div><div class="inventory-row-actions"><button type="button" data-open-stock-date="${item.date}">開く</button><button class="danger" type="button" data-delete-stock-id="${item.id}">削除</button></div></div>`;
  }).join('');
}
function deleteStockSnapshot(id) {
  const item = stockSnapshots.find(snapshot => snapshot.id === id);
  if (!item || !confirm(`${item.date.replaceAll('-','/')} の在庫チェックを削除しますか？`)) return;
  stockSnapshots = stockSnapshots.filter(snapshot => snapshot.id !== id);
  persistInventory();
  renderStock();
  inventoryToast('在庫チェックを削除しました');
}

function renderCosts() {
  costList.innerHTML = INVENTORY_PRODUCTS.map((product,index) => {
    const latest = getLatestCost(product);
    return `<div class="cost-row"><div class="cost-product"><span>${index + 1}</span><b>${esc(product)}</b></div><div class="cost-current"><small>現在原価</small><strong>${latest ? inventoryMoney(latest.cost) : '未設定'}</strong>${latest ? `<em>${latest.effectiveDate.replaceAll('-','/')}〜</em>` : ''}</div><button type="button" data-cost-product="${esc(product)}">変更・履歴</button></div>`;
  }).join('');
}
function openCostDialog(product) {
  activeCostProduct = product;
  costDialogProduct.textContent = product;
  costForm.reset();
  costForm.elements.effectiveDate.value = inventoryLocalDateKey(new Date());
  renderCostHistory(product);
  costDialog.showModal();
}
function renderCostHistory(product) {
  const entries = getCostEntries(product).sort((a,b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt - a.createdAt);
  costHistoryList.innerHTML = entries.length ? entries.map(item => `<div class="cost-history-row"><div><b>${inventoryMoney(item.cost)}</b><span>${item.effectiveDate.replaceAll('-','/')} から適用</span></div><button class="danger" type="button" data-delete-cost-id="${item.id}">削除</button></div>`).join('') : '<div class="inventory-empty">原価履歴はまだありません</div>';
}
function saveCostChange(event) {
  event.preventDefault();
  if (!activeCostProduct) return;
  const effectiveDate = costForm.elements.effectiveDate.value;
  const cost = inventoryNumber(costForm.elements.cost.value);
  if (!effectiveDate) return;
  const entries = getCostEntries(activeCostProduct);
  const sameDate = entries.find(item => item.effectiveDate === effectiveDate);
  if (sameDate) {
    sameDate.cost = cost;
    sameDate.updatedAt = Date.now();
    costHistory[activeCostProduct] = entries;
  } else {
    costHistory[activeCostProduct] = [...entries, { id:invId(), effectiveDate, cost, createdAt:Date.now(), updatedAt:Date.now() }];
  }
  persistInventory();
  renderCostHistory(activeCostProduct);
  renderCosts();
  renderStock();
  costForm.elements.cost.value = '';
  inventoryToast('原価を保存しました');
}
function deleteCostChange(id) {
  if (!activeCostProduct) return;
  const entries = getCostEntries(activeCostProduct);
  const target = entries.find(item => item.id === id);
  if (!target || !confirm(`${activeCostProduct}\n${target.effectiveDate.replaceAll('-','/')}〜 ${inventoryMoney(target.cost)}\n\nこの原価履歴を削除しますか？`)) return;
  costHistory[activeCostProduct] = entries.filter(item => item.id !== id);
  persistInventory();
  renderCostHistory(activeCostProduct);
  renderCosts();
  renderStock();
  inventoryToast('原価履歴を削除しました');
}
function inventoryToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}
