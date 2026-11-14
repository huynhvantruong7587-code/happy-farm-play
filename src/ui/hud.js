import { xpProgress } from '../game/systems/progression.js';

export function updateHud(state) {
  const coins = document.getElementById('hud-coins');
  const level = document.getElementById('hud-level');
  const xpFill = document.getElementById('hud-xp-fill');
  const xpText = document.getElementById('hud-xp-text');
  if (!coins) return;

  coins.textContent = String(state.coins);
  level.textContent = `Lv.${state.level}`;
  const xp = xpProgress(state);
  xpFill.style.width = `${Math.round(xp.ratio * 100)}%`;
  xpText.textContent = `${xp.current}/${xp.need}`;
}
