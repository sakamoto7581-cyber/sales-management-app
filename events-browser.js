let browserSelectedYear = null;
let browserSelectedMonth = null;
let browserActiveEventId = null;

const browserDetailDialog = document.createElement('dialog');
browserDetailDialog.id = 'event-detail-dialog';
browserDetailDialog.innerHTML = `
  <div class="event-detail-shell">
    <div class="event-detail-header">
      <div>
        <p class="eyebrow">EVENT RESULT</p>
        <h2 id="event-detail-store"></h2>
        <p id="event-detail-period"></p>
      </div>
      <button type="button" class="close-button" data-browser-close aria-label="閉じる">×</button>
    </div>
    <div id="event-detail-body" class="event-detail-body"></div>
  </div>`;
document.body.appendChild(browserDetailDialog);

browserDetailDialog.querySelector('[data-browser-close]').addEventListener('click', () => browserDetailDialog.close());
browserDetailDialog.addEventListener('click', event => {
  if (event.target === browserDetailDialog) browserDetailDialog.close();
});
browserDetailDialog.addEventListener('click', event => {
  const editEventButton = event.target.closest('[data-browser-edit-event]');
  if (editEventButton) {
    browserDetailDialog.close();
    openEventDialog(editEventButton.dataset.browserEditEvent);
    return;
  }
  const addSaleButton = event.target.closest('[data-browser-add-sale]');
  if (addSaleButton) {
    browserDetailDialog.close();
    openSaleDialog(addSaleButton.dataset.browserAddSale);
    return;
  }
  const deleteEventButton = event.target.closest('[data-browser-delete-event]');
  if (deleteEventButton) {
    const id = deleteEventButton.dataset.browserDeleteEvent;
    deleteEvent(id);
    if (!events.some(item => item.id === id)) browserDetailDialog.close();
    return;
  }
  const editSaleButton = event.target.closest('[data-browser-edit-sale]');
  if (editSaleButton) {
    browserDetailDialog.close();
    openEditSale(editSaleButton.dataset.browserEditSale);
    return;
  }
  const deleteSaleButton = event.target.closest('[data-browser-delete-sale]');
  if (deleteSaleButton) {
    deleteSale(deleteSaleButton.dataset.browserDeleteSale);
    if (browserActiveEventId && events.some(item => item.id === browserActiveEventId)) browserOpenEventDetail(browserActiveEventId);
  }
});

eventList.addEventListener('click', event => {
  const yearButton = event.target.closest('[data-browser-year]');
  if (yearButton) {
    browserSelectedYear = yearButton.dataset.browserYear;
    browserSelectedMonth = null;
    browserRenderEvents();
    return;
  }
  const monthButton = event.target.closest('[data-browser-month]');
  if (monthButton) {
    browserSelectedMonth = monthButton.dataset.browserMonth;
    browserRenderEvents();
    return;
  }
  const backYears = event.target.closest('[data-browser-back-years]');
  if (backYears) {
    browserSelectedYear = null;
    browserSelectedMonth = null;
    browserRenderEvents();
    return;
  }
  const backMonths = event.target.closest('[data-browser-back-months]');
  if (backMonths) {
    browserSelectedMonth = null;
    browserRenderEvents();
    return;
  }
  const eventButton = event.target.closest('[data-browser-event]');
  if (eventButton) browserOpenEventDetail(eventButton.dataset.browserEvent);
});

function browserEventYear(item) {
  return String(item.startDate || '').slice(0, 4);
}
function browserEventMonth(item) {
  return String(item.startDate || '').slice(5, 7);
}
function browserFormatMonth(month) {
  return `${Number(month)}月`;
}
function browserCountLabel(count) {
  return `${count}会期`;
}
function browserPeriod(item) {
  return `${formatDate(item.startDate)}〜${formatDate(item.endDate)}`;
}

function browserRenderEvents() {
  showAllButton.style.display = 'none';
  if (!events.length) {
    eventList.innerHTML = '<div class="empty-state"><b>会期はまだありません</b>「＋ 会期」から最初の会期を作成してください</div>';
    return;
  }

  const validEvents = [...events]
    .filter(item => item.startDate)
    .sort((a,b) => b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate));

  if (!browserSelectedYear) {
    const years = [...new Set(validEvents.map(browserEventYear))].filter(Boolean).sort((a,b) => b.localeCompare(a));
    eventList.innerHTML = `<div class="period-browser-list">${years.map(year => {
      const count = validEvents.filter(item => browserEventYear(item) === year).length;
      return `<button type="button" class="period-browser-row" data-browser-year="${year}">
        <span class="period-browser-main">${escapeHtml(year)}年</span>
        <span class="period-browser-meta">${browserCountLabel(count)} <b>›</b></span>
      </button>`;
    }).join('')}</div>`;
    return;
  }

  const eventsInYear = validEvents.filter(item => browserEventYear(item) === browserSelectedYear);
  if (!eventsInYear.length) {
    browserSelectedYear = null;
    browserSelectedMonth = null;
    return browserRenderEvents();
  }

  if (!browserSelectedMonth) {
    const months = [...new Set(eventsInYear.map(browserEventMonth))].filter(Boolean).sort((a,b) => b.localeCompare(a));
    eventList.innerHTML = `
      <button type="button" class="period-browser-back" data-browser-back-years>← 年を選ぶ</button>
      <div class="period-browser-title">${escapeHtml(browserSelectedYear)}年</div>
      <div class="period-browser-list">${months.map(month => {
        const count = eventsInYear.filter(item => browserEventMonth(item) === month).length;
        return `<button type="button" class="period-browser-row" data-browser-month="${month}">
          <span class="period-browser-main">${browserFormatMonth(month)}</span>
          <span class="period-browser-meta">${browserCountLabel(count)} <b>›</b></span>
        </button>`;
      }).join('')}</div>`;
    return;
  }

  const eventsInMonth = eventsInYear.filter(item => browserEventMonth(item) === browserSelectedMonth);
  if (!eventsInMonth.length) {
    browserSelectedMonth = null;
    return browserRenderEvents();
  }

  eventList.innerHTML = `
    <button type="button" class="period-browser-back" data-browser-back-months>← ${escapeHtml(browserSelectedYear)}年</button>
    <div class="period-browser-title">${escapeHtml(browserSelectedYear)}年 ${browserFormatMonth(browserSelectedMonth)}</div>
    <div class="period-browser-list">${eventsInMonth.map(item => `<button type="button" class="event-browser-row" data-browser-event="${item.id}">
      <span class="event-browser-store">${escapeHtml(item.store)}</span>
      <span class="event-browser-period">${browserPeriod(item)}</span>
      <b>›</b>
    </button>`).join('')}</div>`;
}

function browserOpenEventDetail(id) {
  const item = events.find(eventItem => eventItem.id === id);
  if (!item) return;
  browserActiveEventId = id;
  const totals = eventTotals(item);
  const salesRows = [...eventSales(id)].sort((a,b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  document.querySelector('#event-detail-store').textContent = item.store;
  document.querySelector('#event-detail-period').textContent = `${item.name ? `${item.name} ／ ` : ''}${browserPeriod(item)}`;
  document.querySelector('#event-detail-body').innerHTML = `
    <div class="event-detail-summary">
      <div class="event-detail-primary"><span>売上合計</span><strong>${yen.format(totals.sales)}</strong></div>
      <div><span>仕入</span><strong>${yen.format(totals.purchase)}</strong></div>
      <div><span>歩率金額</span><strong>${yen.format(totals.commission)}</strong></div>
      <div><span>人件費</span><strong>${yen.format(item.labor || 0)}</strong></div>
      <div><span>交通費</span><strong>${yen.format(item.transport || 0)}</strong></div>
      <div><span>宿泊費</span><strong>${yen.format(item.lodging || 0)}</strong></div>
      <div><span>その他経費</span><strong>${yen.format(item.other || 0)}</strong></div>
      <div class="event-detail-profit"><span>会期利益 <small>利益率 ${totals.margin.toFixed(1)}%</small></span><strong>${yen.format(totals.finalProfit)}</strong></div>
    </div>

    <div class="event-detail-actions">
      <button type="button" class="submit-button" data-browser-add-sale="${item.id}">＋ 売上を追加</button>
      <button type="button" class="secondary" data-browser-edit-event="${item.id}">会期を修正</button>
      <button type="button" class="danger-outline" data-browser-delete-event="${item.id}">会期を削除</button>
    </div>

    <div class="event-detail-daily">
      <h3>日別売上</h3>
      ${salesRows.length ? salesRows.map(sale => `<div class="event-detail-sale-row">
        <div><b>${formatDate(sale.date)}</b><strong>${yen.format(sale.sales)}</strong></div>
        <div class="event-detail-sale-actions"><button type="button" data-browser-edit-sale="${sale.id}">修正</button><button type="button" class="danger" data-browser-delete-sale="${sale.id}">削除</button></div>
      </div>`).join('') : '<div class="inventory-empty">日別売上はまだありません</div>'}
    </div>`;

  if (!browserDetailDialog.open) browserDetailDialog.showModal();
}

renderEvents = browserRenderEvents;
browserRenderEvents();
