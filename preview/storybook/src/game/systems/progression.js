import { CROPS, CROP_LIST, ANIMALS, xpToNext } from '../config.js?v=b5e861e4569c';

export function isUnlocked(state, cropId) {
  const crop = CROPS[cropId];
  return !!crop && state.level >= crop.unlockLevel;
}

export function addXp(state, amount) {
  const gained = Math.max(0, Math.floor(amount));
  if (!gained) return { leveled: [], unlocked: [] };

  state.xp += gained;
  const leveled = [];
  const unlocked = [];

  // 防止异常存档导致死循环
  let guard = 0;
  while (state.xp >= xpToNext(state.level) && guard++ < 50) {
    state.xp -= xpToNext(state.level);
    state.level += 1;
    leveled.push(state.level);
    for (const crop of [...CROP_LIST, ...Object.values(ANIMALS)]) {
      if (crop.unlockLevel === state.level) unlocked.push(crop);
    }
  }
  return { leveled, unlocked };
}

export function xpProgress(state) {
  const need = xpToNext(state.level);
  return { current: state.xp, need, ratio: need ? Math.min(1, state.xp / need) : 1 };
}
