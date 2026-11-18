import { GAME } from './config.js?v=587b0539db14';
import { createInitialState, normalizeState } from './state.js?v=587b0539db14';
import { MAP_LAYOUT } from '../render/mapLayout.js?v=587b0539db14';
// The review build has its own storage, so it cannot overwrite the working game.
const saveKey=GAME.saveKey+(MAP_LAYOUT.STYLE==='storybook'?'-storybook-preview':'');

export function loadState() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return createInitialState();
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    console.warn('读取存档失败，将开始新游戏', err);
    return createInitialState();
  }
}

export function saveState(state) {
  try {
    state.updatedAt = Date.now();
    localStorage.setItem(saveKey, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('保存失败', err);
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(saveKey);
  } catch (err) {
    console.warn('清除存档失败', err);
  }
}

/** 在关键操作后立即保存，并在切到后台 / 关闭页面时再存一次 */
export function bindAutoSave(getState) {
  const persist = () => saveState(getState());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
  window.addEventListener('pagehide', persist);
  window.addEventListener('beforeunload', persist);
}
