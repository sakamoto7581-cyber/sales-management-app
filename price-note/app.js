const STORAGE_KEY='price-note-products-v1';
const form=document.querySelector('#card-form');
const nameInput=document.querySelector('#product-name');
const priceInput=document.querySelector('#price');
const unitInput=document.querySelector('#unit');
const taxInput=document.querySelector('#tax-label');
const sizeInput=document.querySelector('#card-size');
const allergyInput=document.querySelector('#allergens');
const noteInput=document.querySelector('#note');
const bgInput=document.querySelector('#bg-color');
const fgInput=document.querySelector('#text-color');
const titleSizeInput=document.querySelector('#title-size');
const titleSizeValue=document.querySelector('#title-size-value');
const editingId=document.querySelector('#editing-id');
const preview=document.querySelector('#live-preview');
const list=document.querySelector('#product-list');
const count=document.querySelector('#product-count');
const toast=document.querySelector('#toast');
const photoInput=document.querySelector('#photo-input');
const photoBox=document.querySelector('#photo-box');
const photoPreview=document.querySelector('#photo-preview');
const photoStatus=document.querySelector('#photo-status');
const ocrProgress=document.querySelector('#ocr-progress');
const printDialog=document.querySelector('#print-dialog');
const printSelectList=document.querySelector('#print-select-list');
const printSheet=document.querySelector('#print-sheet');
let products=readProducts();

function id(){return crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function readProducts(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return[]}}
function saveProducts(){localStorage.setItem(STORAGE_KEY,JSON.stringify(products))}
function money(v){return Number(v||0).toLocaleString('ja-JP')}
function esc(v){const s=document.createElement('span');s.textContent=v??'';return s.innerHTML}
function currentCard(){return{id:editingId.value||id(),name:nameInput.value.trim(),price:Number(priceInput.value)||0,unit:unitInput.value,tax:taxInput.value,size:sizeInput.value,allergens:allergyInput.value.trim(),note:noteInput.value.trim(),bg:bgInput.value,fg:fgInput.value,titleSize:Number(titleSizeInput.value)||38}}
function cardHtml(item){return `<div class="pc-name" style="font-size:${item.titleSize||38}px">${esc(item.name||'商品名')}</div><div class="pc-price-row">${item.unit?`<span class="pc-unit">${esc(item.unit)}</span>`:''}<span class="pc-yen">¥</span><span class="pc-price">${money(item.price)}</span></div>${item.tax?`<div class="pc-tax">${esc(item.tax)}</div>`:''}${item.note?`<div class="pc-note">${esc(item.note)}</div>`:''}${item.allergens?`<div class="pc-allergy">アレルギー：${esc(item.allergens)}</div>`:''}`}
function applyCard(el,item){el.className=`price-card size-${item.size||'100x80'}`;el.style.background=item.bg||'#101c32';el.style.color=item.fg||'#ffffff';el.innerHTML=cardHtml(item)}
function renderPreview(){titleSizeValue.textContent=titleSizeInput.value;applyCard(preview,currentCard())}
['input','change'].forEach(type=>form.addEventListener(type,renderPreview));
renderPreview();

form.addEventListener('submit',e=>{e.preventDefault();const item=currentCard();if(!item.name){showToast('商品名を入力してください');return}const idx=products.findIndex(x=>x.id===item.id);if(idx>=0)products[idx]=item;else products.unshift(item);saveProducts();renderList();resetForm();showToast(idx>=0?'商品を更新しました':'商品を保存しました')});

document.querySelector('#reset-form').addEventListener('click',resetForm);
function resetForm(){form.reset();editingId.value='';unitInput.value='100g';taxInput.value='税込';sizeInput.value='100x80';bgInput.value='#101c32';fgInput.value='#ffffff';titleSizeInput.value='38';document.querySelector('#save-card').textContent='商品マスターに保存';document.querySelectorAll('[data-allergen]').forEach(b=>b.classList.remove('active'));renderPreview()}

document.querySelectorAll('[data-bg]').forEach(btn=>btn.addEventListener('click',()=>{bgInput.value=btn.dataset.bg;fgInput.value=btn.dataset.fg;renderPreview()}));
document.querySelectorAll('[data-allergen]').forEach(btn=>btn.addEventListener('click',()=>{const parts=allergyInput.value.split(/[、,]/).map(s=>s.trim()).filter(Boolean);const a=btn.dataset.allergen;const exists=parts.includes(a);const next=exists?parts.filter(x=>x!==a):[...parts,a];allergyInput.value=next.join('、');btn.classList.toggle('active',!exists);renderPreview()}));

function renderList(){count.textContent=`${products.length}商品`;if(!products.length){list.innerHTML='<div class="product-empty">商品はまだありません<br>上のフォームから保存してください</div>';return}list.innerHTML=products.map(item=>`<div class="product-row"><div><h3>${esc(item.name)}</h3><p>${item.unit?esc(item.unit)+' ':''}¥${money(item.price)} ${item.tax?`／ ${esc(item.tax)}`:''}</p></div><div class="product-row-actions"><button type="button" data-edit="${item.id}">編集</button><button type="button" data-edit="${item.id}" data-duplicate="true">複製</button><button type="button" class="danger" data-delete="${item.id}">削除</button></div></div>`).join('')}
list.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]');if(edit){const item=products.find(x=>x.id===edit.dataset.edit);if(!item)return;const duplicate=Boolean(edit.dataset.duplicate);editingId.value=duplicate?'':item.id;nameInput.value=item.name;priceInput.value=item.price;unitInput.value=item.unit;taxInput.value=item.tax;sizeInput.value=item.size;allergyInput.value=item.allergens||'';noteInput.value=item.note||'';bgInput.value=item.bg||'#101c32';fgInput.value=item.fg||'#ffffff';titleSizeInput.value=item.titleSize||38;document.querySelector('#save-card').textContent=duplicate?'複製して新規保存':'更新する';document.querySelectorAll('[data-allergen]').forEach(b=>b.classList.toggle('active',(item.allergens||'').split(/[、,]/).map(s=>s.trim()).includes(b.dataset.allergen)));renderPreview();if(duplicate)showToast('複製を編集して新規保存できます');window.scrollTo({top:0,behavior:'smooth'});return}const del=e.target.closest('[data-delete]');if(del){const item=products.find(x=>x.id===del.dataset.delete);if(item&&confirm(`${item.name} を削除しますか？`)){products=products.filter(x=>x.id!==item.id);saveProducts();renderList();showToast('削除しました')}}});
document.querySelector('#clear-all').addEventListener('click',()=>{if(!products.length)return;if(confirm('商品マスターをすべて削除しますか？')){products=[];saveProducts();renderList();showToast('すべて削除しました')}});
renderList();

function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1800)}

document.querySelector('#pick-photo').addEventListener('click',()=>photoInput.click());
photoInput.addEventListener('change',async()=>{const file=photoInput.files?.[0];if(!file)return;photoBox.hidden=false;photoPreview.src=URL.createObjectURL(file);photoStatus.textContent='写真を解析しています…';ocrProgress.value=2;try{const bg=await sampleBackground(file);bgInput.value=bg;fgInput.value=isDark(bg)?'#ffffff':'#111827';renderPreview();if(!window.Tesseract)throw new Error('文字認識機能を読み込めませんでした');const result=await Tesseract.recognize(file,'jpn+eng',{logger:m=>{if(m.status==='recognizing text'){ocrProgress.value=Math.round((m.progress||0)*100);photoStatus.textContent=`文字を読み取り中… ${ocrProgress.value}%`}}});const text=result?.data?.text||'';applyOcrText(text);ocrProgress.value=100;photoStatus.textContent='読み取り完了。内容を確認してください。';showToast('写真から取り込みました')}catch(err){console.error(err);photoStatus.textContent='文字の自動読取に失敗しました。背景色は反映済みです。';showToast('文字は手入力してください')}});

async function sampleBackground(file){return new Promise(resolve=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');const w=120,h=Math.max(80,Math.round(img.height/img.width*120));c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,w,h);const points=[[3,3],[w-4,3],[3,h-4],[w-4,h-4],[w/2,4],[w/2,h-5]];let r=0,g=0,b=0,n=0;for(const [px,py] of points){const d=x.getImageData(Math.round(px),Math.round(py),1,1).data;r+=d[0];g+=d[1];b+=d[2];n++}resolve('#'+[r/n,g/n,b/n].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''))};img.onerror=()=>resolve('#101c32');img.src=URL.createObjectURL(file)})}
function isDark(hex){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (r*299+g*587+b*114)/1000<145}
function applyOcrText(text){const raw=text.replace(/\r/g,'');const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);const digitMatches=[...raw.matchAll(/(?:¥|￥)?\s*([0-9]{2,6}(?:[,，][0-9]{3})*)\s*円?/g)].map(m=>Number(m[1].replace(/[,，]/g,''))).filter(n=>n>=10&&n<=999999);if(digitMatches.length)priceInput.value=Math.max(...digitMatches);const unitMatch=raw.match(/(?:100\s*[gｇＧ]|1\s*(?:個|パック|本|袋))/i);if(unitMatch){const u=unitMatch[0].replace(/\s/g,'').replace(/[ｇＧ]/g,'g');if([...unitInput.options].some(o=>o.value===u))unitInput.value=u}if(/税込価格/.test(raw))taxInput.value='税込価格';else if(/税込/.test(raw))taxInput.value='税込';const allergyNames=['小麦','大豆','乳成分','乳','卵','えび','かに','くるみ','そば','落花生','ピーナッツ'];const found=[...new Set(allergyNames.filter(a=>raw.includes(a)).map(a=>a==='乳'?'乳成分':a==='ピーナッツ'?'落花生':a))];if(found.length)allergyInput.value=found.join('、');const candidate=lines.filter(line=>!/[0-9]{2,}/.test(line)&&!/税込|税抜|アレルギ|100\s*[gｇＧ]|円/.test(line)&&line.length>=2).sort((a,b)=>b.length-a.length)[0];if(candidate)nameInput.value=candidate.replace(/[|｜]/g,'').trim();document.querySelectorAll('[data-allergen]').forEach(b=>b.classList.toggle('active',found.includes(b.dataset.allergen)));renderPreview()}

function openPrint(){if(!products.length){showToast('先に商品を保存してください');return}printSelectList.innerHTML=products.map((p,i)=>`<label class="print-select-row"><input type="checkbox" value="${p.id}" ${i<6?'checked':''}><div><b>${esc(p.name)}</b><span>${p.unit?esc(p.unit)+' ':''}¥${money(p.price)} ／ ${sizeLabel(p.size)}</span></div></label>`).join('');printDialog.showModal()}
document.querySelector('#open-print').addEventListener('click',openPrint);
document.querySelector('#close-print').addEventListener('click',()=>printDialog.close());document.querySelector('#select-all').addEventListener('click',()=>{printSelectList.querySelectorAll('input').forEach(i=>i.checked=true)});
document.querySelector('#print-now').addEventListener('click',()=>{const ids=[...printSelectList.querySelectorAll('input:checked')].map(i=>i.value);const selected=ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);if(!selected.length){showToast('印刷する商品を選んでください');return}const sizes=[...new Set(selected.map(p=>p.size||'100x80'))];if(sizes.length>1){showToast('同じカードサイズの商品だけ選択してください');return}const size=sizes[0];const perPage=size==='100x80'?6:size==='90x60'?8:4;printSheet.className=`print-sheet size-${size}`;const pages=[];for(let i=0;i<selected.length;i+=perPage)pages.push(selected.slice(i,i+perPage));printSheet.innerHTML=pages.map((page,pi)=>`<div class="print-page ${pi?'page-break':''}">${page.map(item=>{const c=document.createElement('div');applyCard(c,item);return c.outerHTML}).join('')}</div>`).join('');printSheet.querySelectorAll('.print-page').forEach(page=>{page.style.display='contents'});printDialog.close();setTimeout(()=>window.print(),120)});
function sizeLabel(size){return size==='90x60'?'9×6cm':size==='105x148'?'A6':'10×8cm'}
