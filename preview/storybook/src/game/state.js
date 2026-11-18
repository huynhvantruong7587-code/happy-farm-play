import { farmerStart } from '../render/farmerView.js';
import { ensureMarket } from './systems/market.js';
import { GAME, CROPS, ANIMALS, PRODUCTS, PEN_ZONES } from './config.js';
import { MAP_LAYOUT } from '../render/mapLayout.js';

function emptyCounts() {
  const counts = {};
  for (const id of Object.keys(CROPS)) counts[id] = 0;
  return counts;
}

export function plotCount() {
  return MAP_LAYOUT.STYLE==='storybook'?MAP_LAYOUT.PLOTS.length:GAME.cols * GAME.rows;
}

export function createInitialState(now = Date.now()) {
  const seeds = emptyCounts();
  Object.assign(seeds, GAME.startSeeds);
  const state = {
    version: GAME.version,
    farmer: farmerStart(),
    coins: GAME.startCoins,
    xp: 0,
    level: 1,
    seeds,
    inventory: { ...emptyCounts(), ...Object.fromEntries(Object.keys(PRODUCTS).map(k=>[k,0])), feed: 2 },
    stock: Object.fromEntries(Object.keys(ANIMALS).map(k=>[k,0])),
    pens: Object.fromEntries(PEN_ZONES.map(k=>[k,Array(8).fill(null)])),
    plots: Array.from({ length: plotCount() }, () => ({
      cropId: null,
      plantedAt: 0,
    })),
    stats: { planted: 0, harvested: 0, earned: 0, spent: 0 },
    flags: { welcomed: false },
    createdAt: now,
    updatedAt: now,
  };
  ensureMarket(state,now);
  return state;
}

/** 兼容旧存档，补齐新增字段 */
export function normalizeState(raw, now = Date.now()) {
  const base = createInitialState(now);
  if (!raw || typeof raw !== 'object' || !Number.isFinite(raw.version) || raw.version < 12) return base;

  const state = {
    ...base,
    ...raw,
    seeds: { ...emptyCounts(), ...(raw.seeds || {}) },
    inventory: { ...base.inventory, ...(raw.inventory || {}) },
    stats: { ...base.stats, ...(raw.stats || {}) },
    flags: { ...base.flags, ...(raw.flags || {}) },
  };

  const expected = plotCount();
  const plots = Array.isArray(raw.plots) ? raw.plots : [];
  state.plots = Array.from({ length: expected }, (_, i) => {
    const p = plots[i];
    if (!p || typeof p !== 'object') return { cropId: null, plantedAt: 0 };
    const cropId = p.cropId && CROPS[p.cropId] ? p.cropId : null;
    const plantedAt = cropId && Number.isFinite(p.plantedAt) ? p.plantedAt : 0;
    return { cropId, plantedAt };
  });

  state.stock = { ...base.stock, ...(raw.stock || {}) };
  state.inventory.feed = raw.inventory?.feed ?? 0;
  state.pens = Object.fromEntries(PEN_ZONES.map(zone => [zone,
    Array.from({length:8}, (_,i) => {
      const o = raw.pens?.[zone]?.[i];
      return o && ANIMALS[o.kind]?.zone === zone ? {
        id: String(o.id || `${zone}-${i}-${now}`), kind:o.kind,
        placedAt: Number.isFinite(o.placedAt) ? o.placedAt : now,
        fedAt: Number.isFinite(o.fedAt) ? o.fedAt : 0,
      } : null;
    })]));
  for (const counts of [state.stock,state.inventory]) for (const k of Object.keys(counts))
    counts[k] = Math.max(0,Math.floor(Number(counts[k]) || 0));
  state.farmer=Number.isFinite(raw.farmer?.x)&&Number.isFinite(raw.farmer?.y)?{x:raw.farmer.x,y:raw.farmer.y}:farmerStart();
  ensureMarket(state,now);
  state.version = GAME.version;
  state.coins = Math.max(0, Math.floor(Number(state.coins) || 0));
  state.xp = Math.max(0, Math.floor(Number(state.xp) || 0));
  state.level = Math.max(1, Math.floor(Number(state.level) || 1));
  for (const id of Object.keys(CROPS)) {
    state.seeds[id] = Math.max(0, Math.floor(Number(state.seeds[id]) || 0));
    state.inventory[id] = Math.max(0, Math.floor(Number(state.inventory[id]) || 0));
  }
  return state;
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
