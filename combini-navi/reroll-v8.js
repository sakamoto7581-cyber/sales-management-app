// v8: same conditions, guaranteed product replacement for the first pattern
const __combiniV8OriginalProducts = products.slice();

function __combiniV8RestoreProducts(){
  products.splice(0, products.length, ...__combiniV8OriginalProducts);
}

function __combiniV8ProductKey(p){
  return `${p.store}\u0001${p.cat}\u0001${p.name}`;
}

function __combiniV8FirstReceipt(){
  return document.querySelector('#results .receipt');
}

function __combiniV8FirstPatternProducts(){
  const receipt = __combiniV8FirstReceipt();
  if(!receipt) return [];
  const text = receipt.textContent || '';
  const store = (typeof getSelectedStore === 'function') ? getSelectedStore() : '';
  const seen = new Set();
  const out = [];
  for(const p of __combiniV8OriginalProducts){
    if(store && p.store !== store) continue;
    const key = __combiniV8ProductKey(p);
    if(seen.has(key)) continue;
    if(text.includes(p.name)){
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function __combiniV8FirstPatternSignature(){
  const items = __combiniV8FirstPatternProducts();
  return items.map(__combiniV8ProductKey).sort().join('|');
}

function __combiniV8Shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

(function(){
  const oldBtn=document.getElementById('rerollBtn');
  if(oldBtn) oldBtn.remove();

  const searchBtn=document.getElementById('searchBtn');
  if(!searchBtn) return;

  searchBtn.addEventListener('click', __combiniV8RestoreProducts, true);
  document.querySelectorAll('input[name="store"]').forEach(el=>{
    el.addEventListener('change', __combiniV8RestoreProducts, true);
  });

  const btn=document.createElement('button');
  btn.id='rerollBtn';
  btn.type='button';
  btn.textContent='別パターンで組み直す';
  btn.style.marginTop='8px';
  btn.style.background='#fff';
  btn.style.color='#111';
  btn.style.border='1px solid #777';

  btn.addEventListener('click',()=>{
    const root=document.getElementById('results');
    if(!root) return;

    __combiniV8RestoreProducts();
    const beforeSig=__combiniV8FirstPatternSignature();
    const beforeHtml=root.innerHTML;
    let currentItems=__combiniV8FirstPatternProducts();

    if(!beforeSig || !currentItems.length){
      run();
      return;
    }

    currentItems=__combiniV8Shuffle(currentItems);

    for(const excluded of currentItems){
      const excludedKey=__combiniV8ProductKey(excluded);
      const reduced=__combiniV8OriginalProducts.filter(p=>__combiniV8ProductKey(p)!==excludedKey);
      products.splice(0, products.length, ...reduced);

      try{
        run();
      }catch(e){
        console.error(e);
      }

      __combiniV8RestoreProducts();
      const afterSig=__combiniV8FirstPatternSignature();
      const hasReceipt=!!__combiniV8FirstReceipt();
      const actuallyChanged=hasReceipt && afterSig && afterSig!==beforeSig && !afterSig.split('|').includes(excludedKey);

      if(actuallyChanged){
        return;
      }

      root.innerHTML=beforeHtml;
    }

    __combiniV8RestoreProducts();
    root.innerHTML=beforeHtml;

    let note=document.getElementById('rerollNotice');
    if(!note){
      note=document.createElement('div');
      note.id='rerollNotice';
      note.style.marginTop='8px';
      note.style.fontSize='11px';
      note.style.color='#6b6b63';
      btn.insertAdjacentElement('afterend',note);
    }
    note.textContent='この条件では、別の商品に入れ替えた候補を作れませんでした。';
  });

  searchBtn.insertAdjacentElement('afterend',btn);
})();
