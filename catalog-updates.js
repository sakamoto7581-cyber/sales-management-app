(() => {
  const PRODUCT = 'にしん甘露煮';
  const COST = 1800;
  const EFFECTIVE_DATE = '2026-09-02';
  const COST_KEY = 'uriage-note-cost-history-v1';

  function applyCatalogUpdate() {
    if (typeof INVENTORY_PRODUCTS === 'undefined' || typeof costHistory === 'undefined') {
      setTimeout(applyCatalogUpdate, 120);
      return;
    }

    let catalogChanged = false;
    if (!INVENTORY_PRODUCTS.includes(PRODUCT)) {
      const anchorIndex = INVENTORY_PRODUCTS.indexOf('にしん甘酢漬');
      if (anchorIndex >= 0) INVENTORY_PRODUCTS.splice(anchorIndex + 1, 0, PRODUCT);
      else INVENTORY_PRODUCTS.push(PRODUCT);
      catalogChanged = true;
    }

    if (!Array.isArray(costHistory[PRODUCT]) || !costHistory[PRODUCT].length) {
      costHistory[PRODUCT] = [{
        id: 'catalog-nishin-kanroni-20260902',
        effectiveDate: EFFECTIVE_DATE,
        cost: COST,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source: 'catalog-addition'
      }];
      localStorage.setItem(COST_KEY, JSON.stringify(costHistory));
      catalogChanged = true;
    }

    if (catalogChanged) {
      if (typeof renderStock === 'function') renderStock();
      if (typeof renderCosts === 'function') renderCosts();
    }
  }

  applyCatalogUpdate();
})();
