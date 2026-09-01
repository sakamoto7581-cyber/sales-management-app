(() => {
  const FIELD_LABELS = {
    labor: '人件費',
    transport: '交通費',
    lodging: '宿泊費',
    other: 'その他経費'
  };

  let activeEventId = '';
  let activeField = '';

  const dialog = document.createElement('dialog');
  dialog.id = 'expense-dialog';
  dialog.innerHTML = `
    <form id="expense-form" method="dialog" class="expense-shell">
      <div class="expense-header">
        <div>
          <p class="eyebrow">EXPENSE</p>
          <h2 id="expense-title">経費を編集</h2>
          <p id="expense-event-label"></p>
        </div>
        <button type="button" class="close-button" data-expense-close aria-label="閉じる">×</button>
      </div>
      <div class="expense-body">
        <label id="expense-input-label">金額
          <div class="input-unit"><span>¥</span><input id="expense-value" required min="0" inputmode="numeric" type="number" placeholder="0" /></div>
        </label>
        <p class="expense-help">この会期全体の合計額を入力してください。</p>
      </div>
      <div class="expense-actions">
        <button type="button" class="secondary" data-expense-close>キャンセル</button>
        <button type="submit" class="submit-button">保存する</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);

  const form = dialog.querySelector('#expense-form');
  const title = dialog.querySelector('#expense-title');
  const eventLabel = dialog.querySelector('#expense-event-label');
  const inputLabel = dialog.querySelector('#expense-input-label');
  const valueInput = dialog.querySelector('#expense-value');

  dialog.querySelectorAll('[data-expense-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', saveExpense);

  function decorateExpenseCards() {
    const detailDialog = document.querySelector('#event-detail-dialog');
    if (!detailDialog) return;
    detailDialog.querySelectorAll('.event-detail-summary > div').forEach(card => {
      const label = card.querySelector('span')?.childNodes?.[0]?.textContent?.trim() || card.querySelector('span')?.textContent?.trim() || '';
      const field = Object.entries(FIELD_LABELS).find(([, name]) => label.startsWith(name))?.[0];
      if (!field) return;
      card.classList.add('expense-editable-card');
      card.dataset.expenseField = field;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${FIELD_LABELS[field]}を編集`);
    });
  }

  const observer = new MutationObserver(decorateExpenseCards);
  observer.observe(document.body, { childList: true, subtree: true });
  decorateExpenseCards();

  document.addEventListener('click', event => {
    const card = event.target.closest('.expense-editable-card[data-expense-field]');
    if (!card) return;
    openExpense(card.dataset.expenseField);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest?.('.expense-editable-card[data-expense-field]');
    if (!card) return;
    event.preventDefault();
    openExpense(card.dataset.expenseField);
  });

  function openExpense(field) {
    if (!FIELD_LABELS[field] || !browserActiveEventId) return;
    const item = events.find(eventItem => eventItem.id === browserActiveEventId);
    if (!item) return;
    activeEventId = item.id;
    activeField = field;
    title.textContent = `${FIELD_LABELS[field]}を編集`;
    eventLabel.textContent = `${item.store} ／ ${formatDate(item.startDate)}〜${formatDate(item.endDate)}`;
    inputLabel.childNodes[0].textContent = `${FIELD_LABELS[field]} `;
    valueInput.value = Number(item[field]) || 0;
    dialog.showModal();
    setTimeout(() => { valueInput.focus(); valueInput.select(); }, 50);
  }

  function saveExpense(event) {
    event.preventDefault();
    const item = events.find(eventItem => eventItem.id === activeEventId);
    if (!item || !FIELD_LABELS[activeField]) return;
    item[activeField] = Math.max(0, Number(valueInput.value) || 0);
    item.updatedAt = Date.now();
    persistAll();
    dialog.close();
    render();
    browserOpenEventDetail(item.id);
    if (typeof inventoryToast === 'function') inventoryToast(`${FIELD_LABELS[activeField]}を更新しました`);
    else if (typeof showToast === 'function') showToast(`${FIELD_LABELS[activeField]}を更新しました`);
  }
})();
