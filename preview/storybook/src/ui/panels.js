import { CROP_LIST, PRODUCTS, FEED, ANIMALS, BUILDINGS, TRADING, formatGrowTime } from '../game/config.js?v=0019904d88fd';
import { isUnlocked } from '../game/systems/progression.js?v=0019904d88fd';
const itemIcon = item => item.id==='hide'
  ? '<svg viewBox="0 0 52 52" width="44" height="44" aria-label="牛皮"><path d="M16 5 Q26 12 36 5 L45 15 Q35 22 45 38 L35 46 Q26 38 17 46 L7 38 Q17 23 7 15 Z" fill="#a46a3e" stroke="#654128" stroke-width="3"/><path d="M18 12 Q26 17 34 12 L38 17 Q31 25 38 36 L34 39 Q26 33 18 39 L14 35 Q21 25 14 18 Z" fill="none" stroke="#e5bb7b" stroke-width="1.5" stroke-dasharray="3 2"/></svg>'
  : item.emoji;

export function renderShop(state, { onBuy, onYoung, onFeed, onCraft, tab = 'seeds' }) {
  const list = document.getElementById('shop-list');
  if (!list) return;
  list.innerHTML = '';

  for (const crop of tab==='seeds'?CROP_LIST:[]) {
    const locked = !isUnlocked(state, crop.id);
    const unaffordable = state.coins < crop.seedCost;
    const card = document.createElement('article');
    card.className = 'card' + (locked ? ' is-locked' : '');
    card.innerHTML = `
      <div class="card-emoji" aria-hidden="true">${itemIcon(crop)}</div>
      <div class="card-body">
        <h3>${crop.name}</h3>
        <p class="meta price-row"><span class="coin-price"><span class="coin-icon" aria-hidden="true">🪙</span>${crop.seedCost}</span><span class="meta-sep">生长 ${formatGrowTime(crop.growMs)}</span></p>
        <p class="meta">收获经验 +${crop.xp} · 拥有 ${state.seeds[crop.id] || 0}</p>
        ${locked ? `<p class="lock">🔒 ${crop.unlockLevel} 级解锁</p>` : ''}
      </div>
      <button class="btn btn-buy pill-primary card-action" data-id="${crop.id}" ${locked || unaffordable ? 'disabled' : ''}>
        ${locked ? '未解锁' : unaffordable ? '金币不足' : '购买'}
      </button>
    `;
    const btn = card.querySelector('button');
    btn.addEventListener('click', () => onBuy(crop.id));
    list.appendChild(card);
  }

  for(const a of tab==='animals'?Object.values(ANIMALS):[]) {
    const locked=state.level<a.unlockLevel, disabled=locked || state.coins<a.cost;
    const card=document.createElement('article');card.className='card';
    card.innerHTML=`<div class="card-emoji">${a.emoji}</div><div class="card-body"><h3>${a.name}</h3><p class="meta price-row"><span class="coin-price"><span class="coin-icon" aria-hidden="true">🪙</span>${a.cost}</span><span class="meta-sep">喂食后 ${formatGrowTime(a.growMs)}</span></p><p class="meta">携带 ${state.stock[a.id]} · ${a.unlockLevel} 级解锁</p></div><button class="btn btn-buy pill-primary card-action" ${disabled?'disabled':''}>${locked?'未解锁':disabled?'金币不足':'购买'}</button>`;
    card.querySelector('button').onclick=()=>onYoung(a.id);list.append(card);
  }

  for(const [label,disabled,action] of (tab==='feed'?[
    [`购买饲料 · ${FEED.cost} 金币`,state.coins<FEED.cost,onFeed],
    ['小麦×2 → 饲料×1',state.inventory.wheat<2,()=>onCraft('wheat')],
    ['玉米×1 → 饲料×1',state.inventory.corn<1,()=>onCraft('corn')],
  ]:[])) {
    const card=document.createElement('article');card.className='card';
    const isBuy=label.startsWith('购买');
    card.innerHTML=`<div class="card-emoji">🥣</div><div class="card-body"><h3>${isBuy?'饲料':label}</h3>${isBuy?`<p class="meta price-row"><span class="coin-price"><span class="coin-icon" aria-hidden="true">🪙</span>${FEED.cost}</span></p>`:''}<p class="meta">拥有饲料 ${state.inventory.feed}${disabled?(isBuy?' · 金币不足':' · 材料不足'):''}</p></div><button class="btn btn-buy pill-primary card-action" ${disabled?'disabled':''}>${isBuy?'购买':'制作'}</button>`;
    card.querySelector('button').onclick=action;list.append(card);
  }

}

export function renderBag(state) {
  const list = document.getElementById('bag-list');
  const empty = document.getElementById('bag-empty');
  if (!list) return;
  list.innerHTML = '';
  const items = [...CROP_LIST,...Object.values(PRODUCTS)].filter((c) => (state.inventory[c.id] || 0) > 0);
  if (empty) empty.hidden = items.length > 0;
  for (const crop of items) {
    const count = state.inventory[crop.id];
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-emoji" aria-hidden="true">${itemIcon(crop)}</div>
      <div class="card-body">
        <h3>${crop.name} × ${count}</h3>
        <p class="meta price-row"><span class="coin-price"><span class="coin-icon" aria-hidden="true">🪙</span>${crop.sellPrice}</span><span>单价</span></p>
        <p class="meta">带到集市与客人交易</p>
      </div>
    `;
    list.appendChild(card);
  }
}

export function renderMore() {
  const animals = document.getElementById('coming-animals');
  const buildings = document.getElementById('coming-buildings');
  if (buildings) {
    buildings.innerHTML = Object.values(BUILDINGS)
      .map((b) => `<li><span>${b.emoji}</span><div><strong>${b.name}</strong><small>${b.brief}（即将推出）</small></div></li>`)
      .join('');
  }
  const trade = document.getElementById('coming-trade');
  if (trade) trade.textContent = TRADING.brief + '（即将推出）';
}

export function renderSeedTray(state, selectedSeed, { onSelect }) {
  const tray = document.getElementById('seed-tray');
  if (!tray) return;
  tray.innerHTML = '';
  if(!CROP_LIST.some(c=>state.seeds[c.id]>0))tray.textContent='还没有种子';
  for (const crop of CROP_LIST.filter(c => state.seeds[c.id] > 0)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seed-chip' + (selectedSeed === crop.id ? ' is-selected' : '') + ((state.seeds[crop.id] || 0) === 0 ? ' is-empty' : '');
    const locked = !isUnlocked(state, crop.id);
    btn.classList.toggle('is-locked', locked);
    btn.disabled = locked;
    btn.setAttribute('aria-pressed', String(selectedSeed === crop.id));
    btn.setAttribute('aria-label', `${crop.name}种子，${state.seeds[crop.id] || 0}颗`);
    btn.dataset.id = crop.id;
    btn.innerHTML = `<span class="seed-emoji">${crop.emoji}</span><span class="seed-name">${crop.name}</span><span class="seed-count">${locked ? `🔒 ${crop.unlockLevel}级` : `×${state.seeds[crop.id] || 0}`}</span>`;
    btn.addEventListener('click', () => onSelect(crop.id));
    tray.appendChild(btn);
  }

}

export function setActiveTab(tab) {
  document.querySelectorAll('.tab').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.tab === tab);
  });
  document.querySelectorAll('.sheet').forEach((el) => {
    const isFarm = tab === 'farm';
    const match = el.id === `panel-${tab}`;
    el.classList.toggle('hidden', isFarm ? true : !match);
  });
  const stage = document.getElementById('stage');
  if (stage) stage.classList.toggle('is-dimmed', tab !== 'farm');
}
