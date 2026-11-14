import { CROPS } from '../config.js';

export function getPlotView(plot, now = Date.now()) {
  if (!plot || !plot.cropId || !CROPS[plot.cropId]) {
    return { status: 'empty', progress: 0, stage: null, remainingMs: 0, crop: null };
  }
  const crop = CROPS[plot.cropId];
  const elapsed = Math.max(0, now - (plot.plantedAt || 0));
  const progress = Math.min(1, elapsed / crop.growMs);
  const remainingMs = Math.max(0, crop.growMs - elapsed);
  const status = progress >= 1 ? 'ripe' : 'growing';
  let stage = crop.stages[0];
  for (const s of crop.stages) {
    if (progress >= s.at) stage = s;
  }
  if (status === 'ripe') stage = crop.stages[crop.stages.length - 1];
  return { status, progress, stage, remainingMs, crop };
}

export function plant(state, plotIndex, cropId, now = Date.now()) {
  const plot = state.plots[plotIndex];
  if (!plot) return { ok: false, reason: 'invalid' };
  if (plot.cropId) return { ok: false, reason: 'occupied' };
  const crop = CROPS[cropId];
  if (!crop) return { ok: false, reason: 'unknown_crop' };
  if (state.level < crop.unlockLevel) return { ok: false, reason: 'locked' };
  if ((state.seeds[cropId] || 0) < 1) return { ok: false, reason: 'no_seed' };

  state.seeds[cropId] -= 1;
  plot.cropId = cropId;
  plot.plantedAt = now;
  return { ok: true, crop };
}

export function harvest(state, plotIndex, now = Date.now()) {
  const plot = state.plots[plotIndex];
  if (!plot) return { ok: false, reason: 'invalid' };
  const view = getPlotView(plot, now);
  if (view.status === 'empty') return { ok: false, reason: 'empty' };
  if (view.status !== 'ripe') return { ok: false, reason: 'not_ripe', remainingMs: view.remainingMs };

  const cropId = plot.cropId;
  const crop = view.crop;
  plot.cropId = null;
  plot.plantedAt = 0;
  state.inventory[cropId] = (state.inventory[cropId] || 0) + 1;
  return { ok: true, cropId, crop, xp: crop.xp };
}

/** 测试或调试：把某块地立刻变为成熟（不改生长配置） */
export function forceRipe(state, plotIndex, now = Date.now()) {
  const plot = state.plots[plotIndex];
  if (!plot || !plot.cropId) return { ok: false, reason: 'empty' };
  const crop = CROPS[plot.cropId];
  plot.plantedAt = now - crop.growMs;
  return { ok: true };
}
