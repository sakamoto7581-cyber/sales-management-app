const EVENTS_KEY = 'uriage-note-events-v2';
const SALES_KEY = 'uriage-note-daily-sales-v2';
const LEGACY_KEY = 'uriage-note-records-v1';
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
const dateText = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const today = new Date();
const todayKey = localDateKey(today);

let events = [];
let dailySales = [];
let editingSaleId = null;
let editingEventId = null;
let showAllEvents = false;

const saleDialog = document.querySelector('#sale-dialog');
const saleForm = document.querySelector('#sale-form');
const saleFormTitle = document.querySelector('#sale-form-title');
const saleSubmit = document.querySelector('#sale-submit');
const saleEventSelect = document.querySelector('#sale-event-select');
const eventDialog = document.querySelector('#event-dialog');
const eventForm = document.querySelector('#event-form');
const eventFormTitle = document.querySelector('#event-form-title');
const eventSubmit = document.querySelector('#event-submit');
const eventList = document.querySelector('#event-list');
const showAllButton = document.querySelector('#show-all');

document.querySelector('#today-label').textContent = dateText.format(today).replace('曜日', '');
loadData();
resetSaleForm();
resetEventForm();
render();

document.querySelectorAll('[data-open-sale]').forEach(button => button.addEventListener('click', () => openSaleDialog()));
document.querySelectorAll('[data-open-event]').forEach(button => button.addEventListener('click', () => openEventDialog()));
document.querySelectorAll('[data-close-sale]').forEach(button => button.addEventListener('click', closeSaleDialog));
document.querySelectorAll('[data-close-event]').forEach(button => button.addEventListener('click', closeEventDialog));
saleDialog.addEventListener('click', event => { if (event.target === saleDialog) closeSaleDialog(); });
eventDialog.addEventListener('click', event => { if (event.target === eventDialog) closeEventDialog(); });
saleForm.addEventListener('submit', saveSale);
saleEventSelect.addEventListener('change', updateSaleDateBounds);
eventForm.addEventListener('input', updateEventPreview);
eventForm.addEventListener('submit', saveEvent);
showAllButton.addEventListener('click', () => { showAllEvents = !showAllEvents; renderEvents(); });
document.querySelector('#mobile-events').addEventListener('click', () => document.querySelector('#events-section').scrollIntoView({ behavior: 'smooth' }));
eventList.addEventListener('click', handleEventListClick);
window.addEventListener('resize', renderChart);

function localDateKey(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function makeId() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function readJson(key, fallback = null) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function loadData() {
  const savedEvents = readJson(EVENTS_KEY);
  const savedSales = readJson(SALES_KEY);
  if (Array.isArray(savedEvents) && Array.isArray(savedSales)) {
    events = savedEvents;
    dailySales = savedSales;
    return;
  }
  migrateLegacyData();
}
function migrateLegacyData() {
  const legacy = readJson(LEGACY_KEY, []);
  if (!Array.isArray(legacy) || !legacy.length) {
    events = [];
    dailySales = [];
    persistAll();
    return;
  }

  const groups = new Map();
  legacy.forEach(record => {
    const key = `${record.store || ''}|||${record.event || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });

  events = [];
  dailySales = [];
  groups.forEach(group => {
    const id = makeId();
    const dates = group.map(item => item.date).filter(Boolean).sort();
    const totalSales = group.reduce((sum, item) => sum + num(item.sales), 0);
    const totalCommission = group.reduce((sum, item) => sum + (Number.isFinite(Number(item.commission)) ? num(item.commission) : Math.round(num(item.sales) * num(item.commissionRate) / 100)), 0);
    const weightedRate = totalSales ? totalCommission / totalSales * 100 : num(group[0]?.commissionRate);
    events.push({
      id,
      store: group[0]?.store || '',
      name: group[0]?.event || '催事',
      startDate: dates[0] || todayKey,
      endDate: dates.at(-1) || todayKey,
      purchase: group.reduce((sum, item) => sum + num(item.purchase), 0),
      commissionRate: Number(weightedRate.toFixed(2)),
      labor: group.reduce((sum, item) => sum + num(item.labor), 0),
      transport: group.reduce((sum, item) => sum + num(item.transport), 0),
      lodging: group.reduce((sum, item) => sum + num(item.lodging), 0),
      other: group.reduce((sum, item) => sum + num(item.other), 0),
      createdAt: Math.min(...group.map(item => num(item.createdAt) || Date.now()))
    });
    group.forEach(item => dailySales.push({
      id: item.id || makeId(),
      eventId: id,
      date: item.date || todayKey,
      sales: num(item.sales),
      createdAt: num(item.createdAt) || Date.now(),
      updatedAt: num(item.updatedAt) || num(item.createdAt) || Date.now()
    }));
  });
  persistAll();
}
function persistAll() {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  localStorage.setItem(SALES_KEY, JSON.stringify(dailySales));
}
function num(value) { return Math.max(0, Number(value) || 0); }
function eventSales(eventId) { return dailySales.filter(item => item.eventId === eventId); }
function eventTotals(eventItem) {
  const sales = eventSales(eventItem.id).reduce((sum, item) => sum + num(item.sales), 0);
  const purchase = num(eventItem.purchase);
  const commission = Math.round(sales * num(eventItem.commissionRate) / 100);
  const expenses = num(eventItem.labor) + num(eventItem.transport) + num(eventItem.lodging) + num(eventItem.other);
  const grossProfit = sales - purchase;
  const finalProfit = grossProfit - commission - expenses;
  const margin = sales ? finalProfit / sales * 100 : 0;
  return { sales, purchase, commission, expenses, grossProfit, finalProfit, margin };
}
function isActiveEvent(eventItem) {
  return eventItem.startDate <= todayKey && eventItem.endDate >= todayKey;
}
function eventLabel(eventItem) {
  return `${eventItem.store}｜${eventItem.name}`;
}

function populateEventSelect(selectedId = '') {
  const sorted = [...events].sort((a, b) => b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate));
  if (!sorted.length) {
    saleEventSelect.innerHTML = '<option value="">会期を先に作成してください</option>';
    return;
  }
  saleEventSelect.innerHTML = sorted.map(item => `<option value="${item.id}">${escapeHtml(eventLabel(item))}（${formatDate(item.startDate)}〜${formatDate(item.endDate)}）</option>`).join('');
  if (selectedId && sorted.some(item => item.id === selectedId)) saleEventSelect.value = selectedId;
  else {
    const active = sorted.find(isActiveEvent);
    saleEventSelect.value = active?.id || sorted[0].id;
  }
}
function resetSaleForm() {
  editingSaleId = null;
  saleForm.reset();
  populateEventSelect();
  saleForm.elements.date.value = todayKey;
  saleFormTitle.textContent = '売上を登録';
  saleSubmit.textContent = '保存する';
  updateSaleDateBounds();
}
function openSaleDialog(eventId = '') {
  if (!events.length) {
    showToast('最初に会期を作成してください');
    openEventDialog();
    return;
  }
  resetSaleForm();
  populateEventSelect(eventId);
  updateSaleDateBounds();
  saleDialog.showModal();
}
function openEditSale(id) {
  const sale = dailySales.find(item => item.id === id);
  if (!sale) return;
  editingSaleId = id;
  populateEventSelect(sale.eventId);
  saleForm.elements.eventId.value = sale.eventId;
  saleForm.elements.date.value = sale.date;
  saleForm.elements.sales.value = sale.sales;
  saleFormTitle.textContent = '売上を修正';
  saleSubmit.textContent = '更新する';
  updateSaleDateBounds();
  saleDialog.showModal();
}
function closeSaleDialog() {
  saleDialog.close();
  resetSaleForm();
}
function updateSaleDateBounds() {
  const eventItem = events.find(item => item.id === saleForm.elements.eventId.value);
  if (!eventItem) return;
  saleForm.elements.date.min = eventItem.startDate;
  saleForm.elements.date.max = eventItem.endDate;
  const current = saleForm.elements.date.value;
  if (!current || current < eventItem.startDate || current > eventItem.endDate) {
    saleForm.elements.date.value = todayKey >= eventItem.startDate && todayKey <= eventItem.endDate ? todayKey : eventItem.startDate;
  }
}
function saveSale(event) {
  event.preventDefault();
  const eventId = saleForm.elements.eventId.value;
  const eventItem = events.find(item => item.id === eventId);
  if (!eventItem) return;
  const date = saleForm.elements.date.value;
  if (date < eventItem.startDate || date > eventItem.endDate) {
    alert('売上日は会期内の日付を選んでください。');
    return;
  }
  const existing = editingSaleId ? dailySales.find(item => item.id === editingSaleId) : null;
  const record = {
    id: editingSaleId || makeId(),
    eventId,
    date,
    sales: num(saleForm.elements.sales.value),
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  if (editingSaleId) {
    const index = dailySales.findIndex(item => item.id === editingSaleId);
    if (index !== -1) dailySales[index] = record;
  } else {
    dailySales.push(record);
  }
  persistAll();
  const edited = Boolean(editingSaleId);
  saleDialog.close();
  resetSaleForm();
  render();
  showToast(edited ? '売上を更新しました' : '売上を保存しました');
}
function deleteSale(id) {
  const sale = dailySales.find(item => item.id === id);
  if (!sale) return;
  const eventItem = events.find(item => item.id === sale.eventId);
  if (!confirm(`${formatDate(sale.date)} ${eventItem?.name || ''} ${yen.format(sale.sales)}\n\nこの日の売上を削除しますか？`)) return;
  dailySales = dailySales.filter(item => item.id !== id);
  persistAll();
  render();
  showToast('売上を削除しました');
}

function eventFormNumber(name) { return num(eventForm.elements[name].value); }
function resetEventForm() {
  editingEventId = null;
  eventForm.reset();
  eventForm.elements.startDate.value = todayKey;
  eventForm.elements.endDate.value = todayKey;
  eventForm.elements.commissionRate.value = 20;
  eventFormTitle.textContent = '会期を作成';
  eventSubmit.textContent = '保存する';
  updateEventPreview();
}
function openEventDialog(id = '') {
  resetEventForm();
  if (id) {
    const item = events.find(eventItem => eventItem.id === id);
    if (!item) return;
    editingEventId = id;
    eventForm.elements.store.value = item.store;
    eventForm.elements.name.value = item.name;
    eventForm.elements.startDate.value = item.startDate;
    eventForm.elements.endDate.value = item.endDate;
    ['purchase','commissionRate','labor','transport','lodging','other'].forEach(name => eventForm.elements[name].value = item[name] ?? 0);
    eventFormTitle.textContent = '会期を修正';
    eventSubmit.textContent = '更新する';
    updateEventPreview();
  }
  eventDialog.showModal();
}
function closeEventDialog() {
  eventDialog.close();
  resetEventForm();
}
function updateEventPreview() {
  const sales = editingEventId ? eventSales(editingEventId).reduce((sum, item) => sum + num(item.sales), 0) : 0;
  const purchase = eventFormNumber('purchase');
  const commission = Math.round(sales * eventFormNumber('commissionRate') / 100);
  const expenses = eventFormNumber('labor') + eventFormNumber('transport') + eventFormNumber('lodging') + eventFormNumber('other');
  const profit = sales - purchase - commission - expenses;
  const margin = sales ? profit / sales * 100 : 0;
  document.querySelector('#event-preview-sales').textContent = yen.format(sales);
  document.querySelector('#event-preview-commission').textContent = yen.format(commission);
  document.querySelector('#event-preview-expenses').textContent = yen.format(expenses);
  document.querySelector('#event-preview-profit').textContent = yen.format(profit);
  document.querySelector('#event-preview-margin').textContent = `利益率 ${margin.toFixed(1)}%`;
}
function saveEvent(event) {
  event.preventDefault();
  const startDate = eventForm.elements.startDate.value;
  const endDate = eventForm.elements.endDate.value;
  if (endDate < startDate) {
    alert('会期終了日は開始日以降にしてください。');
    return;
  }
  const existing = editingEventId ? events.find(item => item.id === editingEventId) : null;
  const item = {
    id: editingEventId || makeId(),
    store: eventForm.elements.store.value.trim(),
    name: eventForm.elements.name.value.trim(),
    startDate,
    endDate,
    purchase: eventFormNumber('purchase'),
    commissionRate: eventFormNumber('commissionRate'),
    labor: eventFormNumber('labor'),
    transport: eventFormNumber('transport'),
    lodging: eventFormNumber('lodging'),
    other: eventFormNumber('other'),
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  if (editingEventId) {
    const index = events.findIndex(eventItem => eventItem.id === editingEventId);
    if (index !== -1) events[index] = item;
  } else {
    events.push(item);
  }
  persistAll();
  const edited = Boolean(editingEventId);
  eventDialog.close();
  resetEventForm();
  render();
  showToast(edited ? '会期を更新しました' : '会期を作成しました');
}
function deleteEvent(id) {
  const item = events.find(eventItem => eventItem.id === id);
  if (!item) return;
  const count = eventSales(id).length;
  if (!confirm(`${eventLabel(item)}\n${formatDate(item.startDate)}〜${formatDate(item.endDate)}\n\n会期を削除すると、登録済みの${count}日分の売上も削除されます。削除しますか？`)) return;
  events = events.filter(eventItem => eventItem.id !== id);
  dailySales = dailySales.filter(sale => sale.eventId !== id);
  persistAll();
  render();
  showToast('会期を削除しました');
}

function handleEventListClick(event) {
  const addSale = event.target.closest('[data-add-sale-event]');
  if (addSale) return openSaleDialog(addSale.dataset.addSaleEvent);
  const editEvent = event.target.closest('[data-edit-event]');
  if (editEvent) return openEventDialog(editEvent.dataset.editEvent);
  const deleteEventButton = event.target.closest('[data-delete-event]');
  if (deleteEventButton) return deleteEvent(deleteEventButton.dataset.deleteEvent);
  const editSaleButton = event.target.closest('[data-edit-sale]');
  if (editSaleButton) return openEditSale(editSaleButton.dataset.editSale);
  const deleteSaleButton = event.target.closest('[data-delete-sale]');
  if (deleteSaleButton) return deleteSale(deleteSaleButton.dataset.deleteSale);
}

function render() {
  const todayItems = dailySales.filter(item => item.date === todayKey);
  const monthKey = todayKey.slice(0, 7);
  const monthItems = dailySales.filter(item => item.date.startsWith(monthKey));
  const activeEvents = events.filter(isActiveEvent);
  const todaySales = sumSales(todayItems);
  const monthSales = sumSales(monthItems);
  const activeProfit = activeEvents.reduce((sum, item) => sum + eventTotals(item).finalProfit, 0);

  document.querySelector('#today-sales').textContent = yen.format(todaySales);
  document.querySelector('#today-count').textContent = todayItems.length ? `${todayItems.length}件の売上を登録` : '登録はまだありません';
  document.querySelector('#month-sales').textContent = yen.format(monthSales);
  document.querySelector('#month-count').textContent = `${monthItems.length}件の売上`;
  document.querySelector('#active-profit').textContent = yen.format(activeProfit);
  document.querySelector('#active-count').textContent = activeEvents.length ? `進行中 ${activeEvents.length}会期` : '進行中の会期なし';

  populateEventSelect(saleForm.elements.eventId.value);
  renderEvents();
  renderChart();
}
function sumSales(items) { return items.reduce((sum, item) => sum + num(item.sales), 0); }
function renderEvents() {
  if (!events.length) {
    eventList.innerHTML = '<div class="empty-state"><b>会期がまだありません</b>まず「＋ 会期」から店舗・期間・会期全体の経費を登録してください。</div>';
    showAllButton.style.display = 'none';
    return;
  }

  const sorted = [...events].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt - a.createdAt);
  const visible = showAllEvents ? sorted : sorted.slice(0, 5);
  showAllButton.style.display = sorted.length > 5 ? 'block' : 'none';
  showAllButton.textContent = showAllEvents ? '5会期だけ表示' : `すべて見る（${sorted.length}会期）`;

  eventList.innerHTML = visible.map(item => {
    const totals = eventTotals(item);
    const salesRows = eventSales(item.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    const status = isActiveEvent(item) ? '<span class="event-status active">開催中</span>' : (item.endDate < todayKey ? '<span class="event-status done">終了</span>' : '<span class="event-status upcoming">予定</span>');
    return `<article class="event-card">
      <div class="event-card-head">
        <div>
          <div class="event-title-line"><h3>${escapeHtml(item.name)}</h3>${status}</div>
          <p>${escapeHtml(item.store)} ・ ${formatDate(item.startDate)}〜${formatDate(item.endDate)}</p>
        </div>
        <div class="event-card-actions">
          <button type="button" data-edit-event="${item.id}">会期修正</button>
          <button type="button" class="danger-text" data-delete-event="${item.id}">会期削除</button>
        </div>
      </div>

      <div class="event-kpis">
        <div class="big"><span>売上合計</span><strong>${yen.format(totals.sales)}</strong></div>
        <div class="big profit-value"><span>会期利益</span><strong>${yen.format(totals.finalProfit)}</strong><small>利益率 ${totals.margin.toFixed(1)}%</small></div>
        <div><span>仕入</span><strong>${yen.format(totals.purchase)}</strong></div>
        <div><span>歩率 ${num(item.commissionRate)}%</span><strong>${yen.format(totals.commission)}</strong></div>
        <div><span>人件費</span><strong>${yen.format(item.labor)}</strong></div>
        <div><span>交通費</span><strong>${yen.format(item.transport)}</strong></div>
        <div><span>宿泊費</span><strong>${yen.format(item.lodging)}</strong></div>
        <div><span>その他</span><strong>${yen.format(item.other)}</strong></div>
      </div>

      <div class="daily-sales-head"><strong>日別売上</strong><button type="button" class="add-daily-button" data-add-sale-event="${item.id}">＋ 売上を追加</button></div>
      <div class="daily-sales-list">
        ${salesRows.length ? salesRows.map(sale => `<div class="daily-sale-row">
          <span>${formatDate(sale.date)}</span>
          <strong>${yen.format(sale.sales)}</strong>
          <div><button type="button" data-edit-sale="${sale.id}">修正</button><button type="button" class="danger-text" data-delete-sale="${sale.id}">削除</button></div>
        </div>`).join('') : '<div class="daily-empty">この会期の売上はまだありません</div>'}
      </div>
    </article>`;
  }).join('');
}
function formatDate(value) {
  if (!value) return '';
  const [, month, day] = value.split('-');
  return `${Number(month)}/${Number(day)}`;
}
function escapeHtml(value) {
  const el = document.createElement('span');
  el.textContent = value ?? '';
  return el.innerHTML;
}
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function renderChart() {
  const canvas = document.querySelector('#sales-chart');
  const empty = document.querySelector('#chart-empty');
  const months = Array.from({length: 6}, (_, index) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.getMonth() + 1}月` };
  });
  const values = months.map(month => sumSales(dailySales.filter(item => item.date.startsWith(month.key))));
  empty.style.display = values.some(Boolean) ? 'none' : 'grid';
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (!values.some(Boolean)) return;

  const pad = { t: 12, r: 12, b: 30, l: 50 };
  const width = rect.width - pad.l - pad.r;
  const height = rect.height - pad.t - pad.b;
  const max = Math.max(...values) * 1.15 || 1;
  ctx.font = '10px Noto Sans JP';
  ctx.fillStyle = '#8a9892';
  ctx.textAlign = 'right';
  ctx.strokeStyle = '#e8edea';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + height * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(rect.width - pad.r, y); ctx.stroke();
    ctx.fillText(formatCompact(max * (1 - i / 4)), pad.l - 8, y + 3);
  }
  const points = values.map((value, i) => ({ x: pad.l + width * i / (values.length - 1), y: pad.t + height - (value / max * height) }));
  const gradient = ctx.createLinearGradient(0, pad.t, 0, pad.t + height);
  gradient.addColorStop(0, 'rgba(23,108,81,.20)'); gradient.addColorStop(1, 'rgba(23,108,81,0)');
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.lineTo(points.at(-1).x, pad.t + height); ctx.lineTo(points[0].x, pad.t + height); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.strokeStyle = '#176c51'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  points.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#176c51'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#78867f'; ctx.textAlign = 'center'; ctx.fillText(months[i].label, p.x, rect.height - 8); });
}
function formatCompact(value) { return value >= 10000 ? `${Math.round(value / 10000)}万` : Math.round(value).toLocaleString('ja-JP'); }
