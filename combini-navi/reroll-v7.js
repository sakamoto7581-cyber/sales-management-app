// v7: same conditions, different combination
const __combiniOriginalProductOrder = products.slice();

function __restoreProductOrder(){
  products.splice(0, products.length, ...__combiniOriginalProductOrder);
}

function __shuffleProducts(){
  for(let i=products.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [products[i],products[j]]=[products[j],products[i]];
  }
}

function __resultSignature(){
  const root=document.getElementById('results');
  return root ? root.textContent.replace(/\s+/g,' ').trim() : '';
}

(function(){
  const searchBtn=document.getElementById('searchBtn');
  if(!searchBtn || document.getElementById('rerollBtn')) return;

  searchBtn.addEventListener('click',()=>{
    __restoreProductOrder();
  },true);

  document.querySelectorAll('input[name="store"]').forEach(el=>{
    el.addEventListener('change',()=>{
      __restoreProductOrder();
    },true);
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
    const before=__resultSignature();
    let after=before;
    for(let attempt=0;attempt<5 && after===before;attempt++){
      __shuffleProducts();
      run();
      after=__resultSignature();
    }
  });

  searchBtn.insertAdjacentElement('afterend',btn);
})();
