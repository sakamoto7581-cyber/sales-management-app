(() => {
  const COST_KEY = 'uriage-note-cost-history-v1';
  const EFFECTIVE_DATE = '2026-09-01';
  const initialCosts = {
    'いくら醤油漬け': 25000,
    '甘塩たらこ': 4000,
    '辛子明太子': 4000,
    'とびっ子': 5200,
    '塩筋子': 6000,
    '紅鮭親子ルイベ': 5340,
    '子持ち昆布切り落とし': 7500,
    '数の子松前漬': 3500,
    '松前漬': 2060,
    '切干松前漬': 1610,
    '白造り松前': 2200,
    '小いかトビラン': 5300,
    'たこ足わさび': 5550,
    '真いか塩辛': 2800,
    'つぶわさび': 4300,
    '菜の花にしん漬': 2750,
    'のりくらげ': 2400,
    '漁火真いか塩辛': 3800,
    'ほたてわさび漬': 4300,
    'えんがわジャン辛': 4800,
    '浜造り塩辛': 1790,
    'いかキムチ': 1840,
    '紅鮭しぐれ': 2570,
    'にしん甘酢漬': 1350,
    '紋甲明太': 1680,
    '粒うにいか': 2480,
    '磯紋甲（柚子）': 2430,
    'タラコ液': 950,
    '明太子液': 950,
    '明太ペースト': 1000
  };

  let history = {};
  try {
    history = JSON.parse(localStorage.getItem(COST_KEY)) || {};
  } catch {
    history = {};
  }

  let changed = false;
  Object.entries(initialCosts).forEach(([product, cost], index) => {
    if (Array.isArray(history[product]) && history[product].length) return;
    history[product] = [{
      id: `initial-${index + 1}`,
      effectiveDate: EFFECTIVE_DATE,
      cost,
      createdAt: 1788267600000 + index,
      updatedAt: 1788267600000 + index,
      source: 'initial-wholesale-list'
    }];
    changed = true;
  });

  if (changed) localStorage.setItem(COST_KEY, JSON.stringify(history));
})();
