const STORAGE_KEY = 'uriage-note-records-v1';
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
const dateText = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const today = new Date();
const todayKey = localDateKey(today);
let records = loadRecords();

const dialog = document.querySelector('#sales-dialog');
const form = document.querySelector('#sales-form');
document.querySelector('#today-label').textContent = dateText.format(today).replace('曜日', '');
form.elements.date.value = todayKey;

document.querySelectorAll('[data-open-form]').forEach(button => button.addEventListener('click', () => {
  form.elements.date.value ||= todayKey;
  updatePreview();
  dialog.showModal();
}));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
form.addEventListener('input', updatePreview);
form.addEventListener('submit', saveRecord);
document.querySelector('#show-all').addEventListener('click', () => document.querySelector('#event-list').scrollIntoView({ behavior: 'smooth' }));
document.querySelector('#mobile-history').addEventListener('click', () => document.querySelector('.events-panel').scrollIntoView({ behavior: 'smooth' }));
window.addEventListener('resize', renderChart);

function localDateKey(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function numberValue(name) { return Math.max(0, Number(form.elements[name].value) || 0); }
function calculate(data) {
  const grossProfit = data.sales - data.purchase;
  const commission = Math.round(data.sales * data.commissionRate / 100);
  const expenses = data.labor + data.transport + data.lodging + data.other;
  const finalProfit = grossProfit - commission - expenses;
  const margin = data.sales ? finalProfit / data.sales * 100 : 0;
  return { grossProfit, commission, expenses, finalProfit, margin };
}
function formNumbers() {
  return { sales:numberValue('sales'), purchase:numberValue('purchase'), commissionRate:numberValue('commissionRate'), labor:numberValue('labor'), transport:numberValue('transport'), lodging:numberValue('lodging'), other:numberValue('other') };
}
function updatePreview() {
  const result = calculate(formNumbers());
  document.querySelector('#preview-gross').textContent = yen.format(result.grossProfit);
  document.querySelector('#preview-commission').textContent = yen.format(result.commission);
  document.querySelector('#preview-expenses').textContent = yen.format(result.expenses);
  document.querySelector('#preview-profit').textContent = yen.format(result.finalProfit);
  document.querySelector('#preview-margin').textContent = `利益率 ${result.margin.toFixed(1)}%`;
}
function saveRecord(event) {
  event.preventDefault();
  const numbers = formNumbers();
  const record = { id: crypto.randomUUID(), date:form.elements.date.value, store:form.elements.store.value.trim(), event:form.elements.event.value.trim(), ...numbers, ...calculate(numbers), createdAt:Date.now() };
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  form.reset(); form.elements.date.value = todayKey; form.elements.commissionRate.value = 20;
  dialog.close(); render();
  const toast = document.querySelector('#toast'); toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200);
}
function render() {
  const monthKey = todayKey.slice(0, 7);
  const todayRecords = records.filter(item => item.date === todayKey);
  const monthRecords = records.filter(item => item.date.startsWith(monthKey));
  const todaySales = sum(todayRecords, 'sales');
  const monthSales = sum(monthRecords, 'sales');
  const monthProfit = sum(monthRecords, 'finalProfit');
  document.querySelector('#today-sales').textContent = yen.format(todaySales);
  document.querySelector('#today-count').textContent = todayRecords.length ? `${todayRecords.length}件の売上を登録` : '登録はまだありません';
  document.querySelector('#month-sales').textContent = yen.format(monthSales);
  document.querySelector('#month-count').textContent = `${new Set(monthRecords.map(item => item.event)).size}件の催事`;
  document.querySelector('#month-profit').textContent = yen.format(monthProfit);
  document.querySelector('#month-margin').textContent = `利益率 ${monthSales ? (monthProfit / monthSales * 100).toFixed(1) : '0.0'}%`;
  renderEvents(); renderChart();
}
function sum(items, key) { return items.reduce((total, item) => total + (Number(item[key]) || 0), 0); }
function renderEvents() {
  const list = document.querySelector('#event-list');
  if (!records.length) { list.innerHTML = '<div class="empty-state"><b>催事の登録はまだありません</b>「売上を登録」から最初の実績を追加しましょう</div>'; return; }
  const grouped = Object.values(records.reduce((groups, item) => {
    const key = `${item.event}|${item.store}`;
    groups[key] ||= { event:item.event, store:item.store, sales:0, profit:0, latest:item.date };
    groups[key].sales += item.sales; groups[key].profit += item.finalProfit;
    if (item.date > groups[key].latest) groups[key].latest = item.date;
    return groups;
  }, {})).sort((a,b) => b.latest.localeCompare(a.latest)).slice(0, 5);
  list.innerHTML = grouped.map(item => `<div class="event-item"><div class="event-badge">${escapeHtml(item.event.charAt(0))}</div><div><h3>${escapeHtml(item.event)}</h3><p>${escapeHtml(item.store)} ・ ${item.latest.replaceAll('-', '/')}</p></div><div class="event-money"><strong>${yen.format(item.sales)}</strong><span>利益 ${yen.format(item.profit)}</span></div></div>`).join('');
}
function escapeHtml(value) { const el=document.createElement('span'); el.textContent=value; return el.innerHTML; }
function renderChart() {
  const canvas = document.querySelector('#sales-chart');
  const empty = document.querySelector('#chart-empty');
  const months = Array.from({length:6}, (_,index) => { const d=new Date(today.getFullYear(), today.getMonth()-5+index, 1); return { key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:`${d.getMonth()+1}月` }; });
  const values = months.map(month => sum(records.filter(item => item.date.startsWith(month.key)), 'sales'));
  empty.style.display = values.some(Boolean) ? 'none' : 'grid';
  const ratio = window.devicePixelRatio || 1, rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*ratio; canvas.height=rect.height*ratio;
  const ctx=canvas.getContext('2d'); ctx.scale(ratio,ratio); ctx.clearRect(0,0,rect.width,rect.height);
  if (!values.some(Boolean)) return;
  const pad={t:12,r:12,b:30,l:50}, width=rect.width-pad.l-pad.r, height=rect.height-pad.t-pad.b, max=Math.max(...values)*1.15 || 1;
  ctx.font='10px Noto Sans JP'; ctx.fillStyle='#8a9892'; ctx.textAlign='right'; ctx.strokeStyle='#e8edea'; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=pad.t+height*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(rect.width-pad.r,y);ctx.stroke();ctx.fillText(formatCompact(max*(1-i/4)),pad.l-8,y+3)}
  const points=values.map((value,i)=>({x:pad.l+width*i/(values.length-1),y:pad.t+height-(value/max*height)}));
  const gradient=ctx.createLinearGradient(0,pad.t,0,pad.t+height);gradient.addColorStop(0,'rgba(23,108,81,.20)');gradient.addColorStop(1,'rgba(23,108,81,0)');ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(points.at(-1).x,pad.t+height);ctx.lineTo(points[0].x,pad.t+height);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#176c51';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
  points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#176c51';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#78867f';ctx.textAlign='center';ctx.fillText(months[i].label,p.x,rect.height-8)});
}
function formatCompact(value) { return value >= 10000 ? `${Math.round(value/10000)}万` : Math.round(value).toLocaleString('ja-JP'); }
render();
