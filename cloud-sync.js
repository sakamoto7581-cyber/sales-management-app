import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ienyngrowcavvmdpnbbf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9ZHH3OQf34UrBTTZHhjTzw_9g7JUPCW';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
window.supabaseClient = supabase;

const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;
const deepCopy = value => JSON.parse(JSON.stringify(value));
const TRACKED_KEYS = new Set([
  'uriage-note-events-v2',
  'uriage-note-daily-sales-v2',
  'uriage-note-event-purchases-v1',
  'uriage-note-stock-snapshots-v1',
  'uriage-note-cost-history-v1'
]);

let cloudReady = false;
let applyingRemote = false;
let syncInFlight = 0;
let pollTimer = null;
const lastSnapshots = new Map();
const syncChains = new Map();

const DATASETS = [
  {
    key: 'uriage-note-events-v2', table: 'events', empty: [],
    toRows: value => (Array.isArray(value) ? value : []).map(item => ({
      id: item.id, store: item.store || '', name: item.name || '', start_date: item.startDate,
      end_date: item.endDate, purchase: Number(item.purchase) || 0,
      commission_rate: Number(item.commissionRate) || 0, labor: Number(item.labor) || 0,
      transport: Number(item.transport) || 0, lodging: Number(item.lodging) || 0,
      other: Number(item.other) || 0, created_at: Number(item.createdAt) || 0,
      updated_at: Number(item.updatedAt) || Number(item.createdAt) || 0
    })),
    fromRows: rows => rows.map(row => ({
      id: row.id, store: row.store, name: row.name, startDate: row.start_date, endDate: row.end_date,
      purchase: Number(row.purchase) || 0, commissionRate: Number(row.commission_rate) || 0,
      labor: Number(row.labor) || 0, transport: Number(row.transport) || 0,
      lodging: Number(row.lodging) || 0, other: Number(row.other) || 0,
      createdAt: Number(row.created_at) || 0, updatedAt: Number(row.updated_at) || 0
    }))
  },
  {
    key: 'uriage-note-daily-sales-v2', table: 'daily_sales', empty: [],
    toRows: value => (Array.isArray(value) ? value : []).map(item => ({
      id: item.id, event_id: item.eventId, sale_date: item.date,
      sales: Number(item.sales) || 0, created_at: Number(item.createdAt) || 0,
      updated_at: Number(item.updatedAt) || Number(item.createdAt) || 0
    })),
    fromRows: rows => rows.map(row => ({
      id: row.id, eventId: row.event_id, date: row.sale_date, sales: Number(row.sales) || 0,
      createdAt: Number(row.created_at) || 0, updatedAt: Number(row.updated_at) || 0
    }))
  },
  {
    key: 'uriage-note-event-purchases-v1', table: 'purchase_batches', empty: [],
    toRows: value => (Array.isArray(value) ? value : []).map(item => ({
      id: item.id, event_id: item.eventId, purchase_date: item.date,
      quantities: item.quantities || {}, total: 0, created_at: Number(item.createdAt) || 0,
      updated_at: Number(item.updatedAt) || Number(item.createdAt) || 0
    })),
    fromRows: rows => rows.map(row => ({
      id: row.id, eventId: row.event_id, date: row.purchase_date,
      quantities: row.quantities || {}, createdAt: Number(row.created_at) || 0,
      updatedAt: Number(row.updated_at) || 0
    }))
  },
  {
    key: 'uriage-note-stock-snapshots-v1', table: 'stock_snapshots', empty: [],
    toRows: value => (Array.isArray(value) ? value : []).map(item => ({
      id: item.id, stock_date: item.date, quantities: item.quantities || {},
      created_at: Number(item.createdAt) || 0,
      updated_at: Number(item.updatedAt) || Number(item.createdAt) || 0
    })),
    fromRows: rows => rows.map(row => ({
      id: row.id, date: row.stock_date, quantities: row.quantities || {},
      createdAt: Number(row.created_at) || 0, updatedAt: Number(row.updated_at) || 0
    }))
  },
  {
    key: 'uriage-note-cost-history-v1', table: 'cost_history', empty: {},
    toRows: value => Object.entries(value && typeof value === 'object' ? value : {}).flatMap(([product, entries]) =>
      (Array.isArray(entries) ? entries : []).map((item, index) => ({
        id: item.id || `${product}-${item.effectiveDate || 'date'}-${index}`,
        product, effective_date: item.effectiveDate, cost: Number(item.cost) || 0,
        source: item.source || null, created_at: Number(item.createdAt) || 0,
        updated_at: Number(item.updatedAt) || Number(item.createdAt) || 0
      }))
    ),
    fromRows: rows => rows.reduce((result, row) => {
      if (!result[row.product]) result[row.product] = [];
      result[row.product].push({
        id: row.id, effectiveDate: row.effective_date, cost: Number(row.cost) || 0,
        source: row.source || undefined, createdAt: Number(row.created_at) || 0,
        updatedAt: Number(row.updated_at) || 0
      });
      return result;
    }, {})
  }
];
const DATASET_BY_KEY = Object.fromEntries(DATASETS.map(def => [def.key, def]));

function parseLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? deepCopy(fallback) : JSON.parse(raw);
  } catch {
    return deepCopy(fallback);
  }
}
function setLocalSilently(key, value) {
  applyingRemote = true;
  nativeSetItem.call(localStorage, key, JSON.stringify(value));
  applyingRemote = false;
}
function stable(value) {
  if (Array.isArray(value)) return JSON.stringify([...value].sort((a,b) => String(a?.id || '').localeCompare(String(b?.id || ''))));
  return JSON.stringify(value || {});
}
function sameRecord(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function rowsById(rows) { return new Map((rows || []).filter(row => row?.id).map(row => [row.id, row])); }

function setStatus(text, state = '') {
  const el = document.querySelector('#cloud-status');
  if (!el) return;
  el.textContent = text;
  el.className = `cloud-status ${state}`.trim();
}

function createAuthOverlay(message = '') {
  let overlay = document.querySelector('#cloud-auth-overlay');
  if (overlay) {
    const msg = overlay.querySelector('#cloud-auth-message');
    if (message && msg) msg.textContent = message;
    return overlay;
  }
  overlay = document.createElement('div');
  overlay.id = 'cloud-auth-overlay';
  overlay.className = 'cloud-auth-overlay';
  overlay.innerHTML = `
    <div class="cloud-auth-card">
      <div class="cloud-auth-brand"><span class="cloud-auth-mark">¥</span><span>うりあげノート</span></div>
      <h1>クラウドにログイン</h1>
      <p>同じアカウントでログインすれば、別のスマホやPCでも同じ数字を確認・編集できます。</p>
      <form id="cloud-auth-form" class="cloud-auth-form">
        <label>メールアドレス<input required type="email" name="email" autocomplete="email" /></label>
        <label>パスワード<input required minlength="6" type="password" name="password" autocomplete="current-password" /></label>
        <div class="cloud-auth-actions">
          <button class="cloud-auth-primary" type="submit">ログイン</button>
          <button class="cloud-auth-secondary" type="button" id="cloud-signup">初回アカウント作成</button>
        </div>
      </form>
      <p id="cloud-auth-message" class="cloud-auth-message">${message}</p>
      <p class="cloud-auth-note">最初に登録したアカウントが管理者になります。以後、許可されていないアカウントからデータは見られません。</p>
    </div>`;
  document.body.appendChild(overlay);
  const form = overlay.querySelector('#cloud-auth-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    await login(form.elements.email.value.trim(), form.elements.password.value);
  });
  overlay.querySelector('#cloud-signup').addEventListener('click', async () => {
    await signup(form.elements.email.value.trim(), form.elements.password.value);
  });
  return overlay;
}
function authMessage(text, error = false) {
  const el = document.querySelector('#cloud-auth-message');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', error);
}
async function login(email, password) {
  if (!email || !password) return authMessage('メールアドレスとパスワードを入力してください。', true);
  authMessage('ログインしています…');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return authMessage(error.message, true);
  await continueAfterAuth(data.user);
}
async function signup(email, password) {
  if (!email || password.length < 6) return authMessage('メールアドレスと6文字以上のパスワードを入力してください。', true);
  authMessage('アカウントを作成しています…');
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${location.origin}${location.pathname}` }
  });
  if (error) return authMessage(error.message, true);
  if (!data.session) {
    authMessage('確認メールを送りました。メール内のリンクを開いてから、この画面でログインしてください。');
    return;
  }
  await continueAfterAuth(data.user);
}
async function ensureMembership(user) {
  if (!user) return false;
  const { data: current } = await supabase.from('app_members').select('user_id,role').eq('user_id', user.id).maybeSingle();
  if (current) return true;
  const { error } = await supabase.from('app_members').insert({ user_id: user.id, role: 'admin' });
  if (!error) return true;
  const { data: retry } = await supabase.from('app_members').select('user_id').eq('user_id', user.id).maybeSingle();
  return Boolean(retry);
}
async function continueAfterAuth(user) {
  const allowed = await ensureMembership(user);
  if (!allowed) {
    await supabase.auth.signOut();
    createAuthOverlay('このアカウントには利用権限がありません。');
    authMessage('このアカウントには利用権限がありません。', true);
    return;
  }
  document.querySelector('#cloud-auth-overlay')?.remove();
  await bootApplication(user);
}

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`${src} を読み込めませんでした`));
    document.body.appendChild(script);
  });
}

async function fetchRemote(def) {
  const { data, error } = await supabase.from(def.table).select('*');
  if (error) throw error;
  return def.fromRows(data || []);
}
async function upsertRows(def, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(def.table).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}
async function deleteRows(def, ids) {
  if (!ids.length) return;
  const { error } = await supabase.from(def.table).delete().in('id', ids);
  if (error) throw error;
}
async function uploadCompleteDataset(def, value) {
  const rows = def.toRows(value);
  if (rows.length) await upsertRows(def, rows);
}

async function initialCloudLoad() {
  if (!localStorage.getItem('uriage-note-cost-history-v1')) {
    await loadScript('initial-costs.js?v=20260901-2');
  }
  const { data: marker, error: markerError } = await supabase.from('app_data').select('value').eq('data_key', 'cloud_initialized').maybeSingle();
  if (markerError) throw markerError;

  if (!marker) {
    for (const def of DATASETS) {
      const remote = await fetchRemote(def);
      const local = parseLocal(def.key, def.empty);
      const remoteRows = def.toRows(remote);
      if (remoteRows.length) {
        setLocalSilently(def.key, remote);
        lastSnapshots.set(def.key, deepCopy(remote));
      } else {
        await uploadCompleteDataset(def, local);
        lastSnapshots.set(def.key, deepCopy(local));
      }
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('app_data').upsert({
      data_key: 'cloud_initialized', value: { initializedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(), updated_by: userData?.user?.id || null
    }, { onConflict: 'data_key' });
    if (error) throw error;
  } else {
    for (const def of DATASETS) {
      const remote = await fetchRemote(def);
      setLocalSilently(def.key, remote);
      lastSnapshots.set(def.key, deepCopy(remote));
    }
  }
}

async function syncDataset(def, newValue) {
  const previousValue = lastSnapshots.has(def.key) ? lastSnapshots.get(def.key) : deepCopy(def.empty);
  const oldRows = rowsById(def.toRows(previousValue));
  const newRows = rowsById(def.toRows(newValue));
  const upserts = [];
  const deletes = [];
  newRows.forEach((row, id) => {
    const old = oldRows.get(id);
    if (!old || !sameRecord(old, row)) upserts.push(row);
  });
  oldRows.forEach((_, id) => { if (!newRows.has(id)) deletes.push(id); });
  if (!upserts.length && !deletes.length) {
    lastSnapshots.set(def.key, deepCopy(newValue));
    return;
  }
  syncInFlight += 1;
  setStatus('保存中…', 'syncing');
  try {
    await upsertRows(def, upserts);
    await deleteRows(def, deletes);
    lastSnapshots.set(def.key, deepCopy(newValue));
    setStatus('クラウド保存済み');
  } catch (error) {
    console.error('Cloud sync failed', error);
    setStatus('保存エラー', 'error');
  } finally {
    syncInFlight -= 1;
  }
}
function queueSync(key, rawValue) {
  const def = DATASET_BY_KEY[key];
  if (!def) return;
  let parsed;
  try { parsed = JSON.parse(rawValue); } catch { return; }
  const previousChain = syncChains.get(key) || Promise.resolve();
  const next = previousChain.then(() => syncDataset(def, parsed));
  syncChains.set(key, next.catch(() => {}));
}
function installStorageBridge() {
  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage && cloudReady && !applyingRemote && TRACKED_KEYS.has(key)) queueSync(key, value);
  };
  Storage.prototype.removeItem = function(key) {
    nativeRemoveItem.call(this, key);
    if (this === localStorage && cloudReady && !applyingRemote && TRACKED_KEYS.has(key)) {
      const def = DATASET_BY_KEY[key];
      queueSync(key, JSON.stringify(def.empty));
    }
  };
}

function addCloudControls() {
  if (document.querySelector('.cloud-user-tools')) return;
  const tools = document.createElement('div');
  tools.className = 'cloud-user-tools';
  tools.innerHTML = '<button id="cloud-status" type="button" class="cloud-status">クラウド保存済み</button><button id="cloud-logout" type="button" class="cloud-logout">ログアウト</button>';
  const host = document.querySelector('.app-header .header-actions') || document.querySelector('.app-header');
  host?.prepend(tools);
  tools.querySelector('#cloud-logout').addEventListener('click', async () => {
    if (!confirm('この端末からログアウトしますか？\nクラウド上のデータは消えません。')) return;
    await supabase.auth.signOut();
    location.reload();
  });
  tools.querySelector('#cloud-status').addEventListener('click', event => {
    if (event.currentTarget.classList.contains('remote')) location.reload();
  });
}

async function readAllRemote() {
  const result = {};
  for (const def of DATASETS) result[def.key] = await fetchRemote(def);
  return result;
}
async function pollRemoteChanges() {
  if (!cloudReady || syncInFlight) return;
  try {
    const remote = await readAllRemote();
    const changed = DATASETS.some(def => stable(remote[def.key]) !== stable(lastSnapshots.get(def.key) ?? def.empty));
    if (!changed) return;
    if (document.querySelector('dialog[open]')) {
      setStatus('他端末で更新あり', 'remote');
      return;
    }
    applyingRemote = true;
    for (const def of DATASETS) {
      nativeSetItem.call(localStorage, def.key, JSON.stringify(remote[def.key]));
      lastSnapshots.set(def.key, deepCopy(remote[def.key]));
    }
    applyingRemote = false;
    location.reload();
  } catch (error) {
    console.warn('Remote refresh failed', error);
  }
}

async function loadLegacyApplication() {
  await loadScript('app.js?v=20260901-4');
  await loadScript('inventory.js?v=20260901-5');
  await loadScript('events-browser.js?v=20260901-1');
  await loadScript('purchase.js?v=20260901-1');
  await loadScript('expense-editor.js?v=20260901-1');
}

async function bootApplication() {
  setStatus('クラウド読込中…', 'syncing');
  try {
    await initialCloudLoad();
    installStorageBridge();
    cloudReady = true;
    await loadLegacyApplication();
    addCloudControls();
    const footer = document.querySelector('footer');
    if (footer) footer.textContent = 'データはクラウドに保存されます';
    setStatus('クラウド保存済み');
    clearInterval(pollTimer);
    pollTimer = setInterval(pollRemoteChanges, 10000);
    window.addEventListener('focus', pollRemoteChanges);
  } catch (error) {
    console.error(error);
    setStatus('接続エラー', 'error');
    createAuthOverlay('クラウドへの接続に失敗しました。ページを開き直してください。');
  }
}

const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session?.user) {
  const allowed = await ensureMembership(sessionData.session.user);
  if (allowed) await bootApplication(sessionData.session.user);
  else {
    await supabase.auth.signOut();
    createAuthOverlay('このアカウントには利用権限がありません。');
  }
} else {
  createAuthOverlay();
}
