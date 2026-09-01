(() => {
  function waitForApp() {
    if (typeof openEditSale !== 'function' || typeof deleteSale !== 'function' || typeof dailySales === 'undefined' || typeof events === 'undefined') {
      setTimeout(waitForApp, 120);
      return;
    }
    initSalesHistory();
  }

  function initSalesHistory() {
    if (document.querySelector('#sales-history-dialog')) return;

    const style = document.createElement('style');
    style.textContent = `
      .sales-history-launch{width:100%;margin:14px 0 22px;border:1px solid #cfdcd6;background:#fff;color:#176c51;border-radius:14px;padding:13px 16px;font:700 14px "Noto Sans JP",sans-serif;box-shadow:0 8px 22px rgba(25,72,55,.06);cursor:pointer}
      .summary-card.sales-history-tappable{cursor:pointer}.summary-card.sales-history-tappable:active{transform:translateY(1px)}
      #sales-history-dialog{border:0;padding:0;border-radius:18px;width:min(680px,calc(100% - 24px));max-height:92vh;color:#16352a;box-shadow:0 25px 80px rgba(18,48,37,.25)}
      #sales-history-dialog::backdrop{background:rgba(13,36,28,.52);backdrop-filter:blur(3px)}
      .sales-history-shell{background:#fff}.sales-history-head{padding:20px 22px 16px;border-bottom:1px solid #e3ebe7;position:relative}.sales-history-head h2{margin:0 44px 4px 0;font-size:21px}.sales-history-head p{margin:0;color:#7a8a83;font-size:12px}
      .sales-history-body{padding:16px 20px;overflow:auto;max-height:calc(92vh - 90px)}.sales-history-top{display:flex;justify-content:flex-end;margin-bottom:10px}.sales-history-add{border:0;background:#176c51;color:#fff;border-radius:10px;padding:10px 14px;font:700 12px inherit}
      .sales-history-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:13px 0;border-bottom:1px solid #e3ebe7}.sales-history-main b{display:block;font-size:13px}.sales-history-main span{display:block;margin-top:3px;color:#7a8a83;font-size:11px}.sales-history-main strong{display:block;margin-top:6px;font-size:17px}
      .sales-history-actions{display:flex;gap:6px;align-items:center}.sales-history-actions button{border:1px solid #cad9d2;background:#fff;border-radius:8px;padding:7px 10px;font:700 11px inherit;color:#176c51}.sales-history-actions .danger{color:#b44343;border-color:#e7c5c5}.sales-history-empty{text-align:center;color:#7a8a83;padding:28px 8px;font-size:13px}
      @media(max-width:760px){.sales-history-launch{margin-top:10px}.sales-history-body{padding:14px 16px}.sales-history-row{grid-template-columns:1fr}.sales-history-actions{justify-content:flex-end}.sales-history-actions button{padding:8px 14px}}
    `;
    document.head.appendChild(style);

    const launch = document.createElement('button');
    launch.type = 'button';
    launch.className = 'sales-history-launch';
    launch.textContent = '売上履歴・修正';
    const dashboardGrid = document.querySelector('.dashboard-grid');
    dashboardGrid?.parentNode?.insertBefore(launch, dashboardGrid);

    const dialog = document.createElement('dialog');
    dialog.id = 'sales-history-dialog';
    dialog.innerHTML = `
      <div class="sales-history-shell">
        <div class="sales-history-head">
          <h2>売上履歴・修正</h2>
          <p>登録済みの日別売上を修正・削除できます。</p>
          <button type="button" class="close-button" data-sales-history-close aria-label="閉じる">×</button>
        </div>
        <div class="sales-history-body">
          <div class="sales-history-top"><button type="button" class="sales-history-add" data-sales-history-add>＋ 売上を追加</button></div>
          <div id="sales-history-list"></div>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    function eventForSale(sale) {
      return events.find(item => item.id === sale.eventId);
    }
    function money(value) {
      return typeof yen !== 'undefined' ? yen.format(Number(value) || 0) : `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
    }
    function renderHistory() {
      const host = dialog.querySelector('#sales-history-list');
      const rows = [...dailySales].sort((a,b) => String(b.date).localeCompare(String(a.date)) || (Number(b.updatedAt || b.createdAt) - Number(a.updatedAt || a.createdAt)));
      host.innerHTML = rows.length ? rows.map(sale => {
        const item = eventForSale(sale);
        const store = item?.store || '会期不明';
        const name = item?.name || '';
        return `<div class="sales-history-row">
          <div class="sales-history-main">
            <b>${typeof formatDate === 'function' ? formatDate(sale.date) : sale.date}</b>
            <span>${escapeSalesText(store)}${name ? ` ／ ${escapeSalesText(name)}` : ''}</span>
            <strong>${money(sale.sales)}</strong>
          </div>
          <div class="sales-history-actions">
            <button type="button" data-sales-history-edit="${sale.id}">修正</button>
            <button type="button" class="danger" data-sales-history-delete="${sale.id}">削除</button>
          </div>
        </div>`;
      }).join('') : '<div class="sales-history-empty">登録済みの売上はありません</div>';
    }
    function escapeSalesText(value) {
      const el = document.createElement('span');
      el.textContent = String(value ?? '');
      return el.innerHTML;
    }
    function openHistory() {
      renderHistory();
      if (!dialog.open) dialog.showModal();
    }

    launch.addEventListener('click', openHistory);
    document.querySelectorAll('.summary-card').forEach((card, index) => {
      if (index > 1) return;
      card.classList.add('sales-history-tappable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', index === 0 ? '今日の売上履歴を開く' : '今月の売上履歴を開く');
      card.addEventListener('click', openHistory);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openHistory(); }
      });
    });

    dialog.querySelector('[data-sales-history-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector('[data-sales-history-add]').addEventListener('click', () => {
      dialog.close();
      openSaleDialog();
    });
    dialog.addEventListener('click', event => {
      const edit = event.target.closest('[data-sales-history-edit]');
      if (edit) {
        const id = edit.dataset.salesHistoryEdit;
        dialog.close();
        openEditSale(id);
        return;
      }
      const del = event.target.closest('[data-sales-history-delete]');
      if (del) {
        deleteSale(del.dataset.salesHistoryDelete);
        renderHistory();
      }
    });
  }

  waitForApp();
})();
