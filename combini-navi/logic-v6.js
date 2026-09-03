// 実用的な1食になるように、同一商品・同系統商品の重複を抑える。
// 選択カテゴリは必ず各1品以上。カテゴリ内の複数商品は上限内で許可。
function solve(budget, calLimit, allowedCats, prefs, store){
  const allowed = products
    .map((p,i)=>({...p, originalIndex:i}))
    .filter(p=>allowedCats.includes(p.cat) && p.store===store);

  if (!allowed.length) return [];

  const CATEGORY_CAPS = {
    "主食":2,
    "おかず":2,
    "飲料":1,
    "スープ":1,
    "デザート":1,
    "乳製品":1,
    "ホットスナック":1
  };

  // 同系統を何種類も同時に選ばないためのグループ。
  // 例: サラダチキンの味違いが4個並ぶ、プロテイン飲料が複数並ぶ等を防ぐ。
  function familyKey(p){
    const n=p.name;
    if (/サラダチキン|スモークチキン|グリルチキン|鶏むね|ローストチキン/.test(n)) return "leanChicken";
    if (/プロテイン/.test(n)) return "proteinDrink";
    if (/ゆで卵|ゆでたまご|味付けたまご|煮たまご|煮玉子|半熟煮玉子|おでん たまご/.test(n)) return "eggSide";
    if (/ヨーグルト/.test(n)) return "yogurt";
    if (/スムージー/.test(n)) return "smoothie";
    return "item:"+p.originalIndex;
  }

  const familyIds=new Map();
  for(const item of allowed){
    const k=familyKey(item);
    if(!familyIds.has(k)) familyIds.set(k,familyIds.size);
    item.familyBit=1n << BigInt(familyIds.get(k));
  }

  const catIndex=new Map(allowedCats.map((c,i)=>[c,i]));

  const byCategory = new Map();
  for (const cat of allowedCats){
    const items = allowed.filter(p=>p.cat===cat);
    if (!items.length) return [];
    byCategory.set(cat,items);
  }

  let minimumRequiredPrice = 0;
  let minimumRequiredCal = 0;
  for (const cat of allowedCats){
    const items = byCategory.get(cat);
    minimumRequiredPrice += Math.min(...items.map(p=>p.price));
    minimumRequiredCal += Math.min(...items.map(p=>p.cal));
  }
  if (minimumRequiredPrice > budget || minimumRequiredCal > calLimit) return [];

  const canAdd=(st,item)=>{
    const bit=1n << BigInt(item.originalIndex);
    if((st.usedMask & bit)!==0n) return false;
    if((st.familyMask & item.familyBit)!==0n) return false;
    const ci=catIndex.get(item.cat);
    const cap=CATEGORY_CAPS[item.cat] ?? 2;
    if((st.catCounts[ci]||0) >= cap) return false;
    return true;
  };

  const addItem=(st,item,nextCal,nextPrice)=>{
    const bit=1n << BigInt(item.originalIndex);
    const catCounts=st.catCounts.slice();
    catCounts[catIndex.get(item.cat)]++;
    const candidate={
      price:nextPrice,
      cal:nextCal,
      protein:st.protein+item.protein,
      carb:st.carb+item.carb,
      salt:st.salt+item.salt,
      veg:st.veg+item.veg,
      prev:st,
      itemIndex:item.originalIndex,
      usedMask:st.usedMask|bit,
      familyMask:st.familyMask|item.familyBit,
      catCounts
    };
    candidate.utility=nutritionUtility(candidate,prefs);
    return candidate;
  };

  const keepState = (list,candidate,maxStates)=>{
    for (const st of list){
      if (st.usedMask===candidate.usedMask &&
          st.familyMask===candidate.familyMask &&
          st.price<=candidate.price && st.utility>=candidate.utility) return;
    }
    for (let i=list.length-1;i>=0;i--){
      const st=list[i];
      if (st.usedMask===candidate.usedMask &&
          st.familyMask===candidate.familyMask &&
          candidate.price<=st.price && candidate.utility>=st.utility){
        list.splice(i,1);
      }
    }
    list.push(candidate);
    list.sort((a,b)=>{
      if (b.utility!==a.utility) return b.utility-a.utility;
      return a.price-b.price;
    });
    if (list.length>maxStates){
      let cheapest=list[0];
      for(const st of list) if(st.price<cheapest.price) cheapest=st;
      const kept=list.slice(0,maxStates);
      if(!kept.includes(cheapest)) kept[kept.length-1]=cheapest;
      list.splice(0,list.length,...kept);
    }
  };

  let seedDp=Array.from({length:calLimit+1},()=>[]);
  seedDp[0]=[{
    price:0,cal:0,protein:0,carb:0,salt:0,veg:0,utility:0,
    prev:null,itemIndex:null,usedMask:0n,familyMask:0n,
    catCounts:Array(allowedCats.length).fill(0)
  }];

  for(const cat of allowedCats){
    const nextDp=Array.from({length:calLimit+1},()=>[]);
    const items=byCategory.get(cat);
    for(let cal=0;cal<=calLimit;cal++){
      if(!seedDp[cal].length) continue;
      for(const st of seedDp[cal]){
        for(const item of items){
          if(!canAdd(st,item)) continue;
          const nextCal=cal+item.cal;
          const nextPrice=st.price+item.price;
          if(nextCal>calLimit || nextPrice>budget) continue;
          keepState(nextDp[nextCal],addItem(st,item,nextCal,nextPrice),MAX_SEED_STATES_PER_CAL);
        }
      }
    }
    seedDp=nextDp;
  }

  const dp=Array.from({length:calLimit+1},()=>[]);
  for(let cal=0;cal<=calLimit;cal++){
    for(const st of seedDp[cal]) keepState(dp[cal],st,MAX_FILL_STATES_PER_CAL);
  }

  for(const item of allowed){
    if(item.cal===0){
      const occupied=[];
      for(let cal=0;cal<=calLimit;cal++){
        if(dp[cal].length) occupied.push([cal,dp[cal].slice()]);
      }
      for(const [cal,states] of occupied){
        for(const st of states){
          if(!canAdd(st,item)) continue;
          const nextPrice=st.price+item.price;
          if(nextPrice>budget) continue;
          keepState(dp[cal],addItem(st,item,st.cal,nextPrice),MAX_FILL_STATES_PER_CAL);
        }
      }
      continue;
    }

    for(let cal=0;cal+item.cal<=calLimit;cal++){
      if(!dp[cal].length) continue;
      const states=dp[cal].slice();
      for(const st of states){
        if(!canAdd(st,item)) continue;
        const nextPrice=st.price+item.price;
        if(nextPrice>budget) continue;
        const nextCal=cal+item.cal;
        keepState(dp[nextCal],addItem(st,item,nextCal,nextPrice),MAX_FILL_STATES_PER_CAL);
      }
    }
  }

  const candidates=[];
  for(let cal=calLimit;cal>=1;cal--){
    if(dp[cal].length) candidates.push(...dp[cal]);
    if(candidates.length>=24 && cal<=calLimit-60) break;
  }
  candidates.sort((a,b)=>{
    if(b.cal!==a.cal) return b.cal-a.cal;
    if(b.utility!==a.utility) return b.utility-a.utility;
    return a.price-b.price;
  });

  const out=[];
  const seen=new Set();
  for(const st of candidates){
    const sig=compositionSignature(st);
    if(!sig || seen.has(sig)) continue;

    const countsMap=reconstructCounts(st);
    if([...countsMap.values()].some(n=>n>1)) continue;

    const presentCats=new Set();
    const familySeen=new Set();
    const catCountsCheck=new Map();
    let invalid=false;
    for(const [i,n] of countsMap){
      if(n<=0) continue;
      const p=products[i];
      presentCats.add(p.cat);
      catCountsCheck.set(p.cat,(catCountsCheck.get(p.cat)||0)+n);

      const fk=familyKey({...p,originalIndex:i});
      if(familySeen.has(fk)){ invalid=true; break; }
      familySeen.add(fk);
    }
    if(invalid) continue;
    if(!allowedCats.every(cat=>presentCats.has(cat))) continue;
    if([...catCountsCheck.entries()].some(([cat,n])=>n>(CATEGORY_CAPS[cat]??2))) continue;

    seen.add(sig);
    const counts=Array(products.length).fill(0);
    for(const [i,n] of countsMap) counts[i]=n;
    out.push({...st,counts});
    if(out.length===3) break;
  }
  return out;
}

try{ if(typeof run==="function") run(); }catch(e){ console.error(e); }
