const root = () => document.getElementById('toasts');
let levelReturnFocus=null;
const levelInert=new Map();

export function toast(message, { timeout = 3200, action, onClick } = {}) {
  const host = root();
  if (!host) return;
  const limit=document.getElementById('app')?.classList.contains('storybook')?1:2;
  while (host.children.length >= limit) host.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = /不足|不够|没有|不能|无法/.test(message) ? '⚠️' : /买|商店/.test(message) ? '🛒' : /仓库|出售|收获/.test(message) ? '🎒' : /种|生长/.test(message) ? '🌱' : '✨';
  const label = document.createElement('span');
  label.textContent = message;
  el.append(icon, label);
  if(action){const button=document.createElement('button');button.textContent=action;button.onclick=()=>{el.remove();onClick?.();};el.append(button);}
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 280);
  }, timeout);
}

export function showLevelUp({ leveled, unlocked }) {
  const modal = document.getElementById('modal-levelup');
  if (!modal) {
    const names = (unlocked || []).map((c) => c.name).join('、');
    toast(`升级到 ${leveled[leveled.length - 1]} 级！${names ? '解锁：' + names : ''}`, { timeout: 3200 });
    return;
  }
  if(modal.classList.contains('natural-levelup')&&modal.classList.contains('hidden')){
    levelReturnFocus=document.activeElement;
    for(const el of document.getElementById('app').children)if(el!==modal){levelInert.set(el,el.inert);el.inert=true;}
  }
  const level = leveled[leveled.length - 1];
  modal.querySelector('.levelup-level').textContent = `到达 ${level} 级`;
  const unlockEl = modal.querySelector('.levelup-unlock');
  if (unlocked && unlocked.length) {
    unlockEl.hidden = false;
    unlockEl.textContent = '解锁新作物：' + unlocked.map((c) => `${c.emoji} ${c.name}`).join('、');
  } else {
    unlockEl.hidden = true;
  }
  modal.classList.remove('hidden');
  if(modal.classList.contains('natural-levelup'))document.getElementById('btn-close-levelup').focus({preventScroll:true});
}

export function hideLevelUp() {
  const modal = document.getElementById('modal-levelup');
  if (modal) modal.classList.add('hidden');
  for(const [el,inert] of levelInert)el.inert=inert;
  levelInert.clear();
  if(levelReturnFocus?.isConnected)levelReturnFocus.focus({preventScroll:true});
  else if(levelReturnFocus)document.getElementById('farm-destinations-toggle')?.focus({preventScroll:true});
  levelReturnFocus=null;
}
