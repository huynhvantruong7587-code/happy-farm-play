import { CROPS, PRODUCTS } from '../config.js?v=0019904d88fd';

export function buySeed(state, cropId, count = 1) {
  const crop = CROPS[cropId];
  const n = Math.max(1, Math.floor(count));
  if (!crop) return { ok: false, reason: 'unknown_crop' };
  if (state.level < crop.unlockLevel) return { ok: false, reason: 'locked' };
  const cost = crop.seedCost * n;
  if (state.coins < cost) return { ok: false, reason: 'no_coins' };

  state.coins -= cost;
  state.seeds[cropId] = (state.seeds[cropId] || 0) + n;
  state.stats.spent = (state.stats.spent || 0) + cost;
  return { ok: true, cost, count: n, crop };
}

export function sellCrop(state, cropId, count = 1) {
  const crop = CROPS[cropId] || PRODUCTS[cropId];
  const n = Math.max(1, Math.floor(count));
  if (!crop) return { ok: false, reason: 'unknown_crop' };
  const have = state.inventory[cropId] || 0;
  if (have < n) return { ok: false, reason: 'no_item' };

  const gold = crop.sellPrice * n;
  state.inventory[cropId] = have - n;
  state.coins += gold;
  state.stats.earned = (state.stats.earned || 0) + gold;
  return { ok: true, gold, count: n, crop };
}

export function canAfford(state, cropId, count = 1) {
  const crop = CROPS[cropId];
  if (!crop) return false;
  return state.coins >= crop.seedCost * count;
}
