(() => {
  function waitForDailyActivity() {
    if (typeof browserOpenEventDetail !== 'function' || typeof dailySales === 'undefined' || typeof events === 'undefined') {
      setTimeout(waitForDailyActivity, 120);
      return;
    }
    installDailyActivityView();
  }

  function installDailyActivityView() {
    if (window.__uriageDailyActivityInstalled) return;
    window.__uriageDailyActivityInstalled = true;

    const style = document.createElement('style');
    style.textContent = `
      .daily-activity-head,.daily-activity-row{display:grid;grid-template-columns:74px 1fr 1fr;gap:10px;align-items:center}
      .daily-activity-head{padding:8px 8px;color:var(--muted);font-size:10px;font-weight:700;border-bottom:1px solid var(--line)}
      .daily-activity-row{padding:11px 8px;border-bottom:1px solid var(--line)}
      .daily-activity-date{font-size:12px;font-weight:700}
      .daily-activity-value span{display:block;color:var(--muted);font-size:9px;margin-bottom:2px}
      .daily-activity-value strong{display:block;font:700 13px "DM Sans","Noto Sans JP"}
      .daily-activity-purchase{border:0;background:transparent;color:inherit;padding:0;text-align:left;font:inherit;cursor:pointer;width:100%}
      .daily-activity-purchase strong{color:var(--green)}
      .daily-activity-sale-actions{grid-column:2/-1;display:flex;gap:6px;justify-content:flex-end;margin-top:-2px}
      .daily-activity-sale-actions button{border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:6px 10px;font:600 10px inherit;color:var(--green)}
      .daily-activity-sale-actions button.danger{color:var(--danger)}
      .daily-activity-note{margin:8px 0 0;color:var(--muted);font-size:10px}
      @media(max-width:760px){.daily-activity-head,.daily-activity-row{grid-template-columns:58px 1fr 1fr;gap:7px}.daily-activity-row{padding:10px 4px}.daily-activity-value strong{font-size:12px}}
    `;
    document.head.appendChild(style);

    function money(value) {
      return typeof yen !== 'undefined'
        ? yen.format(Number(value) || 0)
        : `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
    }

    function datesBetween(startDate, endDate) {
      if (!startDate || !endDate) return [];
      const dates = [];
      const current = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      while (current <= end && dates.length < 370) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }

    function purchaseTotalForDate(eventId, date) {
      if (typeof eventPurchaseBatches === 'undefined') return 0;
      const batches = eventPurchaseBatches.filter(batch => batch.eventId === eventId && batch.date === date);
      return batches.reduce((sum, batch) => {
        if (typeof purchaseBatchTotal === 'function') return sum + purchaseBatchTotal(batch);
        return sum;
      }, 0);
    }

    function salesForDate(eventId, date) {
      return dailySales.filter(sale => sale.eventId === eventId && sale.date === date);
    }

    function renderDailyActivity(id) {
      const item = events.find(eventItem => eventItem.id === id);
      const host = document.querySelector('#event-detail-body .event-detail-daily');
      if (!item || !host) return;

      const dates = datesBetween(item.startDate, item.endDate);
      const rows = dates.map(date => {
        const sales = salesForDate(id, date);
        const salesTotal = sales.reduce((sum, sale) => sum + (Number(sale.sales) || 0), 0);
        const purchaseTotal = purchaseTotalForDate(id, date);
        const actions = sales.length ? `<div class="daily-activity-sale-actions">${sales.map((sale, index) => `
          <button type="button" data-browser-edit-sale="${sale.id}">${sales.length > 1 ? `売上${index + 1}修正` : '売上修正'}</button>
          <button type="button" class="danger" data-browser-delete-sale="${sale.id}">${sales.length > 1 ? `売上${index + 1}削除` : '売上削除'}</button>`).join('')}</div>` : '';
        return `<div class="daily-activity-row">
          <div class="daily-activity-date">${typeof formatDate === 'function' ? formatDate(date) : date}</div>
          <div class="daily-activity-value"><span>売上</span><strong>${money(salesTotal)}</strong></div>
          <button type="button" class="daily-activity-value daily-activity-purchase" data-daily-purchase-event="${id}" data-daily-purchase-date="${date}" aria-label="${date}の仕入を開く"><span>仕入</span><strong>${money(purchaseTotal)}</strong></button>
          ${actions}
        </div>`;
      }).join('');

      host.innerHTML = `
        <h3>日別 売上・仕入</h3>
        <div class="daily-activity-head"><span>日付</span><span>売上</span><span>仕入</span></div>
        ${rows || '<div class="inventory-empty">日別データはまだありません</div>'}
        <p class="daily-activity-note">仕入金額をタップすると、その日の商品別仕入を確認・修正できます。</p>`;
    }

    const originalBrowserOpenEventDetail = browserOpenEventDetail;
    browserOpenEventDetail = function(id) {
      originalBrowserOpenEventDetail(id);
      renderDailyActivity(id);
    };

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-daily-purchase-event]');
      if (!button || typeof openPurchaseDialog !== 'function') return;
      const eventId = button.dataset.dailyPurchaseEvent;
      const date = button.dataset.dailyPurchaseDate;
      document.querySelector('#event-detail-dialog')?.close();
      openPurchaseDialog(eventId);
      setTimeout(() => {
        const input = document.querySelector('#purchase-date');
        if (!input) return;
        input.value = date;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, 0);
    });
  }

  waitForDailyActivity();
})();
