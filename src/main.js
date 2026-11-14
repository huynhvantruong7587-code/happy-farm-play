import { loadAssets } from './render/assets.js';
let assetsSettled = false;
loadAssets(value => { document.getElementById('loading-progress').style.width = `${value*100}%`; }).then(() => { assetsSettled = true; });
import * as livestock from './game/systems/livestock.js';
import { zoneAttachment, emptySign, livestockViews, animalBubbles, hitTestAnimalBubble, hitTestLivestock, hitTestZone, hitTestEmptySign } from './render/livestockView.js';
import { mapInput, canvasInput, isPortraitRotated, bindLandscape } from './ui/inputMap.js';
import { CROPS, GAME, ANIMALS, PRODUCTS, ZONE_NAMES, formatMs } from './game/config.js';
import { createInitialState } from './game/state.js';
import { loadState, saveState, bindAutoSave, clearSave } from './game/save.js';
import { plant, harvest, getPlotView, forceRipe } from './game/systems/farm.js';
import { buySeed, sellCrop } from './game/systems/economy.js';
import { addXp } from './game/systems/progression.js';
import { createRenderer } from './render/canvas.js';
import { computeLayout, hitTestPlot, clampCamera, homeCamera, cameraForZone, interpolateCamera, WORLD, drawFarm } from './render/farmView.js';
import { createEffects } from './render/effects.js';
import { updateHud } from './ui/hud.js';
import { renderShop, renderBag, renderMore, renderSeedTray, setActiveTab } from './ui/panels.js';
import { toast, showLevelUp, hideLevelUp } from './ui/toast.js';

import { zoneActions, canvasTapAction, bubblePlacement } from './ui/zoneActions.js';

const canvas = document.getElementById('farm-canvas');
const renderer = createRenderer(canvas);

let state = loadState();
let selectedSeed = firstOwnedSeed(state);
let activeTab = 'farm';
let trayOpen=false, chromeVisible=true, openZoneId=null;
const app=document.getElementById('app'), bubble=document.getElementById('zone-bubble');
function setSeedTray(value){trayOpen=!!value;app.classList.toggle('tray-open',trayOpen);}
function setChrome(value){chromeVisible=!!value;app.classList.toggle('chrome-hidden',!chromeVisible);}
function closeZone(){openZoneId=null;bubble.hidden=true;}
function shopYoung(){switchTab('shop');document.getElementById('shop-young')?.scrollIntoView({block:'start'});}
const millPanel=document.getElementById('panel-mill');
function closeMill(){millPanel.classList.add('hidden');app.classList.remove('mill-open');}
function renderMill(){
  document.getElementById('mill-inventory').textContent=`库存：小麦×${state.inventory.wheat} · 玉米×${state.inventory.corn} · 饲料×${state.inventory.feed}`;
  millPanel.querySelectorAll('[data-mill-material]').forEach(b=>{b.disabled=state.inventory[b.dataset.millMaterial]<(b.dataset.millMaterial==='wheat'?2:1);});
}
function openZone(id){
  if(id==='house'){closeZone();closeMill();toast('暂未开放');return true;}
  if(id==='mill'){switchTab('farm');renderMill();millPanel.classList.remove('hidden');app.classList.add('mill-open');return true;}
  if(!state.pens[id])return false;switchTab('farm');openZoneId=id;renderZone();return true;}
function positionBubble(){
  if(!openZoneId)return;const z=layout.zones.find(z=>z.id===openZoneId),c=layout.camera;
  let ox=0,oy=0;for(let e=canvas;e&&e!==app;e=e.offsetParent){ox+=e.offsetLeft;oy+=e.offsetTop;}
  const anchor=zoneAttachment(z,'anchor');
  const pos=bubblePlacement({w:app.clientWidth,h:app.clientHeight},{w:bubble.offsetWidth,h:bubble.offsetHeight},
    {x:ox+anchor.x*c.zoom+c.x,y:oy+anchor.y*c.zoom+c.y},oy);
  bubble.style.left=pos.x+'px';bubble.style.top=pos.y+'px';
}
function renderZone(){
  if(!openZoneId)return;const id=openZoneId,a=zoneActions(state,id);bubble.hidden=false;bubble.replaceChildren();
  const content=document.createElement('div');content.className='zone-bubble-content';bubble.append(content);
  const title=document.createElement('strong');title.textContent=ZONE_NAMES[id];content.append(title);
  const button=(text,action)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;content.append(b);};
  for(const young of a.young)button(`${young.emoji} ${young.name} ×${state.stock[young.id]}`,()=>{const i=zoneActions(state,id).free;if(i<0){toast('栏位已满');return;}runLivestock('place',id,i,young.id);});
  if(!a.young.length&&a.empty){const p=document.createElement('p');p.textContent=id==='pond'?'去商店买鱼苗吧':'去商店买幼崽吧';content.append(p);button('去商店',shopYoung);}
  if(!a.empty&&!a.hungry.length&&!a.ready.length){const p=document.createElement('p');p.textContent='正在成长，耐心等一等';content.append(p);}
  if(a.hungry.length)button(`喂饲料（${state.inventory.feed} 份）`,()=>{const hungry=zoneActions(state,id).hungry;let n=0;for(const i of hungry){if(!state.inventory.feed)break;if(runLivestockBatchItem('feed',id,i).ok)n++;}toast(n===hungry.length?`喂食成功，${n} 只开始计时`:`已喂食 ${n} 只，饲料不足，还剩 ${hungry.length-n} 只饥饿`);});
  if(a.ready.length)button(id==='chicken'?`收鸡蛋（${a.ready.length} 只）`:id==='sheep'?`剪羊毛（${a.ready.length} 只）`:`收获（${a.ready.length} 只已就绪）`,()=>{const outputs={};for(const i of zoneActions(state,id).ready){const r=runLivestockBatchItem('harvest',id,i);if(r.ok)for(const [k,n] of Object.entries(r.outputs||{}))outputs[k]=(outputs[k]||0)+n;}toast('收获 '+Object.entries(outputs).map(([k,n])=>`${PRODUCTS[k].name}×${n}`).join('、'));});
  for(const i of a.chicken)button(`收鸡肉 · 第 ${i+1} 只`,()=>runLivestock('harvestChicken',i));
  for(const i of a.sheep)button(`收羊肉 · 第 ${i+1} 只`,()=>runLivestock('harvestMutton',i));
  if(!a.empty){button('再买',shopYoung);content.lastChild.className='zone-more';}
  positionBubble();
}

let debugOverlay={plots:false,walk:false};
let hoveredIndex = -1;
let layout = computeLayout(1, 1);
const camera = { x: 0, y: 0, zoom: 0.85 };
let cameraInitialized = false;
let cameraTween = null;
let lastAnimationNow = 0;
let drawnLivestock = [];
const effects = createEffects();

function firstOwnedSeed(s) {
  const order = Object.keys(CROPS);
  return order.find((id) => (s.seeds[id] || 0) > 0) || null;
}

function refreshUI() {
  updateHud(state);
  renderMill();
  renderZone();
  renderSeedTray(state, selectedSeed, { onSelect: selectSeed });
  if (activeTab === 'shop') renderShop(state, { onBuy: handleBuy, onYoung: k=>runLivestock('buyYoung',k), onFeed:()=>runLivestock('buyFeed'), onCraft:m=>runLivestock('craftFeed',m) });
  if (activeTab === 'bag') renderBag(state, { onSell: handleSell });
}

function persist() {
  saveState(state);
}

function selectSeed(cropId) {
  if(!CROPS[cropId])return;
  if (selectedSeed === cropId) {
    selectedSeed = null;
    toast('已取消选择');
  } else {
    if ((state.seeds[cropId] || 0) <= 0) {
      toast('没有这种种子了，去商店看看吧');
      return;
    }
    selectedSeed = cropId;
    toast(`已选择 ${CROPS[cropId].emoji} ${CROPS[cropId].name}，点击空地种植`);
    switchTab('farm');
  }
  refreshUI();
}

function handlePlant(index) {
  if (!selectedSeed || !CROPS[selectedSeed]) {
    toast('请先在下方选择要种的种子');
    return;
  }
  const result = plant(state, index, selectedSeed, Date.now());
  if (!result.ok) {
    const map = {
      occupied: '这块地已经种了东西',
      no_seed: '种子用完了，去商店买一些吧',
      locked: '等级还不够，先去收获升级吧',
    };
    toast(map[result.reason] || '现在不能种在这里');
    if (result.reason === 'no_seed') selectedSeed = firstOwnedSeed(state);
    refreshUI();
    return;
  }
  effects.add('plant', layout.plots[index], result.crop);
  state.stats.planted += 1;
  if ((state.seeds[selectedSeed] || 0) <= 0) selectedSeed = firstOwnedSeed(state);
  persist();
  refreshUI();
}

function handleHarvest(index) {
  const result = harvest(state, index, Date.now());
  if (!result.ok) {
    if (result.reason === 'not_ripe') toast(`还要再等 ${formatMs(result.remainingMs)}`);
    return;
  }
  effects.add('harvest', layout.plots[index], result.crop);
  state.stats.harvested += 1;
  const prog = addXp(state, result.xp);
  toast(`收获 ${result.crop.emoji} ${result.crop.name}，经验 +${result.xp}`);
  if (prog.leveled.length) showLevelUp(prog);
  persist();
  refreshUI();
}

function handleBuy(cropId) {
  const result = buySeed(state, cropId, 1);
  if (!result.ok) {
    const map = { no_coins: '金币不够啦', locked: '还没解锁这种作物' };
    toast(map[result.reason] || '无法购买');
    refreshUI();
    return;
  }
  toast(`买到 ${result.crop.emoji} ${result.crop.name} 种子 ×${result.count}`);
  if (!selectedSeed) selectedSeed = cropId;
  persist();
  refreshUI();
}

function handleSell(cropId, count) {
  const result = sellCrop(state, cropId, count);
  if (!result.ok) {
    toast('仓库里没有这么多');
    refreshUI();
    return;
  }
  toast(`出售 ${result.crop.name} ×${result.count}，获得 ${result.gold} 金币`);
  persist();
  refreshUI();
}

function switchTab(tab) {
  closeZone();
  closeMill();
  if(tab==='shop'||tab==='bag')document.getElementById('toasts').replaceChildren();
  activeTab = tab;
  setActiveTab(tab);
  refreshUI();
}

let batchLivestock=false;
function runLivestockBatchItem(method,...args){batchLivestock=true;try{return runLivestock(method,...args);}finally{batchLivestock=false;}}
function runLivestock(method,...args) {
  const result=livestock[method](state,...args);
  if(result.ok) {
    if(result.xp) {const prog=addXp(state,result.xp);if(prog.leveled.length)showLevelUp(prog);}
    const outputs=result.outputs?Object.entries(result.outputs).map(([k,n])=>`${PRODUCTS[k].name}×${n}`).join('、'):'';
    const messages={buyYoung:()=>`买到${ANIMALS[args[0]].name} ×${args[1]??1}`,
      buyFeed:()=>`买到饲料 ×${args[0]??1}`,craftFeed:()=> '制作饲料 ×1',
      place:()=>`${ANIMALS[args[2]].name}已放入${ZONE_NAMES[args[0]]}`,
      feed:()=> '喂食成功，开始计时'};
    if(!batchLivestock)toast(outputs?`收获 ${outputs}`:messages[method]());persist();
  } else if(!batchLivestock)toast(({wrong_zone:`请放到${ZONE_NAMES[ANIMALS[args[2]]?.zone] || '对应养殖区'}`,invalid:'操作参数无效',no_coins:'金币不够啦',locked:'等级不足，先收获升级',no_material:'材料不足',no_feed:'饲料不足，请去商店购买或用小麦、玉米制作饲料',no_stock:'没有这种幼畜或鱼苗了',occupied:'这个栏位已有动物',already_fed:'已经喂过了',hungry:'请先在气泡中喂饲料',not_ready:'还没到收获时间',empty:'请先放入幼畜或鱼苗'})[result.reason] || '现在无法操作');
  refreshUI();return result;
}
function jumpTo(id) {
  if(!cameraForZone(layout,id))return false;
  document.getElementById('toasts').replaceChildren();
  closeZone();closeMill();
  switchTab('farm');if(id==='farm')setSeedTray(true);cameraInitialized=true;
  cameraTween={start:performance.now(),from:{...camera},id};return true;
}

function tap(x, y) {
  if (activeTab !== 'farm') { switchTab('farm'); return; }
  const animalBubble=hitTestAnimalBubble(x,y,layout,animalBubbles(drawnLivestock,lastAnimationNow));
  if(animalBubble){runLivestock(animalBubble.action,animalBubble.zoneId,animalBubble.index);return;}
  const target=hitTestZone(x,y,layout)||layout.zones.find(z=>z.id===hitTestLivestock(x,y,layout,drawnLivestock)?.zoneId);
  const action=canvasTapAction(openZoneId,trayOpen,target?.id,!!hitTestPlot(x,y,layout));
  if(action==='keep-zone')return;
  if(action==='close-zone'){closeZone();return;}
  if(hitTestEmptySign(x,y,layout,state)){shopYoung();return;}
  const zone=target;
  if(zone){openZone(zone.id);return;}
  const hit=hitTestPlot(x,y,layout);
  if(!hit){if(trayOpen)setSeedTray(false);else setChrome(!chromeVisible);return;}
  setSeedTray(true);
  const view = getPlotView(state.plots[hit.index], Date.now());
  if (view.status === 'ripe') handleHarvest(hit.index);
  else if (view.status === 'empty') handlePlant(hit.index);
  else toast(`还要再等 ${formatMs(view.remainingMs)}`);
}

function frame(animationNow) {
  lastAnimationNow=animationNow;
  renderer.resize();
  const { cssW, cssH } = renderer.size;
  if (!cameraInitialized) {
    Object.assign(camera,homeCamera(computeLayout(cssW,cssH)));
    cameraInitialized = true;
  }
  if(cameraTween) {
    const a=cameraTween,t=Math.min(1,(animationNow-a.start)/520);
    const target=cameraForZone(computeLayout(cssW,cssH),a.id);
    Object.assign(camera,interpolateCamera(a.from,target,t));
    if(t>=1)cameraTween=null;
  }
  clampCamera(camera, cssW, cssH);
  layout = computeLayout(cssW, cssH, camera);
  drawnLivestock=livestockViews(state,layout,animationNow);
  // Growth uses Unix time, matching persisted plantedAt. rAF time is cosmetic only.
  drawFarm(renderer.ctx, state, layout, {
    now: Date.now(), animationNow, selectedSeed, hoveredIndex, debugOverlay,
  });
  effects.draw(renderer.ctx, layout, animationNow, canvas, document.getElementById('warehouse-button'));
  positionBubble();
  if(openZoneId){const key=JSON.stringify(zoneActions(state,openZoneId));if(bubble.dataset.status!==key){bubble.dataset.status=key;renderZone();}}
  finishLoading();
  requestAnimationFrame(frame);
}

function bindCamera() {
  const pointers = new Map();
  let start = null, moved = false;
  const cancelGestures = () => { pointers.clear(); start = null; moved = true; hoveredIndex = -1; };
  window.addEventListener('resize', cancelGestures);
  window.addEventListener('orientationchange', cancelGestures);
  window.visualViewport?.addEventListener('resize', cancelGestures);
  const local = e => canvasInput(canvas, e.clientX, e.clientY);
  const sync = () => {
    clampCamera(camera, renderer.size.cssW, renderer.size.cssH);
    layout = computeLayout(renderer.size.cssW, renderer.size.cssH, camera);
    positionBubble();
  };
  const zoom = (factor, before, after = before) => {
    cameraTween=null;
    const z = Math.max(WORLD.minZoom, Math.min(WORLD.maxZoom, camera.zoom * factor));
    camera.x = after.x - (before.x - camera.x) * z / camera.zoom;
    camera.y = after.y - (before.y - camera.y) * z / camera.zoom;
    camera.zoom = z; sync();
  };
  const pair = points => {
    const [a,b] = points;
    return { center: { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }, distance: Math.hypot(a.x-b.x,a.y-b.y) };
  };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = local(e);
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) { start = p; moved = false; }
    else moved = true;
  });
  canvas.addEventListener('pointermove', e => {
    const p = local(e), previous = pointers.get(e.pointerId);
    if (!previous) { const hit = hitTestPlot(p.x,p.y,layout); hoveredIndex = hit?.index ?? -1; return; }
    const old = [...pointers.values()]; pointers.set(e.pointerId, p);
    if (pointers.size >= 2) {
      moved = true; cameraTween=null;
      const a = pair(old), b = pair([...pointers.values()]);
      if (a.distance > 0) zoom(b.distance / a.distance, a.center, b.center);
    } else {
      if (Math.hypot(p.x-start.x,p.y-start.y) > 8) moved = true;
      if (moved) { cameraTween=null; camera.x += p.x-previous.x; camera.y += p.y-previous.y; sync(); }
    }
    hoveredIndex = -1;
  });
  const finish = (e, cancelled = false) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    if (!cancelled && pointers.size === 1 && !moved && Math.hypot(p.x-start.x,p.y-start.y) <= 8) tap(p.x,p.y);
    pointers.delete(e.pointerId);
    if (pointers.size) moved = true;
  };
  canvas.addEventListener('pointerup', e => finish(e));
  canvas.addEventListener('pointercancel', e => finish(e, true));
  canvas.addEventListener('lostpointercapture', e => finish(e, true));
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(-e.deltaY * .0015), local(e)); }, { passive: false });
}

function bindUi() {
  document.getElementById('btn-close-mill').onclick=closeMill;
  millPanel.onclick=e=>{if(e.target===millPanel)closeMill();};
  millPanel.querySelectorAll('[data-mill-material]').forEach(b=>b.onclick=()=>runLivestock('craftFeed',b.dataset.millMaterial));
  document.addEventListener('pointerdown',e=>{if(e.target!==canvas&&!bubble.contains(e.target))closeZone();});
  const tray=document.getElementById('seed-tray');let drag=null,suppress=false;
  tray.addEventListener('pointerdown',e=>{const p=mapInput(e.clientX,e.clientY);drag={id:e.pointerId,x:p.x,scroll:tray.scrollLeft,moved:false};suppress=false;});
  tray.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=mapInput(e.clientX,e.clientY).x-drag.x;if(Math.abs(dx)>6){drag.moved=true;tray.setPointerCapture(e.pointerId);}if(drag.moved){tray.scrollLeft=drag.scroll-dx;suppress=true;}});
  const endDrag=()=>{drag=null;};tray.addEventListener('pointerup',endDrag);tray.addEventListener('pointercancel',endDrag);
  tray.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);

  document.querySelectorAll('.zone-jump').forEach(btn=>btn.onclick=()=>jumpTo(btn.dataset.zone));
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(activeTab === btn.dataset.tab ? 'farm' : btn.dataset.tab));
  });

  document.getElementById('btn-close-levelup')?.addEventListener('click', hideLevelUp);
  document.getElementById('modal-levelup')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-levelup') hideLevelUp();
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    const ok = confirm('确定要重新开始吗？当前进度会被清空。');
    if (!ok) return;
    clearSave();
    state = createInitialState();
    state.flags.welcomed=true;
    cameraInitialized=false;cameraTween=null;
    selectedSeed = firstOwnedSeed(state);
    hideLevelUp();
    switchTab('farm');
    toast('已开始新的农场');
    persist();
    refreshUI();
  });

  bindCamera();
  document.querySelectorAll('.sheet-close').forEach(btn => btn.addEventListener('click', () => switchTab('farm')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') switchTab('farm'); });
  canvas.addEventListener('pointerleave', () => { hoveredIndex = -1; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  bindLandscape(() => renderer.resize());
}

function welcomeIfNeeded() {
  if (state.flags.welcomed) return;
  state.flags.welcomed = true;
  persist();
  toast('欢迎来到开心农场！点击农田展开种子栏吧', { timeout: 3200 });
}

function exposeDebug() {
  // 便于自动化测试与本地调试，不影响正常游玩
  window.__FARM__ = {
    skipTime: ms => {
      if(!Number.isFinite(ms) || ms<0)return false;
      for(const p of state.plots) if(p.cropId)p.plantedAt-=ms;
      for(const slots of Object.values(state.pens)) for(const o of slots) if(o?.fedAt) {o.fedAt-=ms;if(o.fedAt===0)o.fedAt=-1;}
      persist();refreshUI();return true;
    },
    buyYoung:(k,n=1)=>runLivestock('buyYoung',k,n),
    buyFeed:(n=1)=>runLivestock('buyFeed',n),
    craftFeed:m=>runLivestock('craftFeed',m),
    place:(z,i,k)=>runLivestock('place',z,i,k),
    feed:(z,i)=>runLivestock('feed',z,i),
    harvestAnimal:(z,i)=>runLivestock('harvest',z,i),
    harvestChicken:i=>runLivestock('harvestChicken',i),
    harvestMutton:i=>runLivestock('harvestMutton',i),
    jumpTo,openZone,setSeedTray,setChrome,
    emptySign,
    setDebugOverlay: flags => {for(const key of ['plots','walk'])if(key in flags)debugOverlay[key]=!!flags[key];return {...debugOverlay};},
    getDebugOverlay:()=>({...debugOverlay}),
    getUI:()=>({trayOpen,chromeVisible,openZone:openZoneId}),
    getAnimalBubbles:()=>animalBubbles(drawnLivestock,lastAnimationNow),
    getLivestockViews:()=>livestockViews(state,layout,lastAnimationNow),
    mapInput,
    isPortraitRotated,
    getState: () => JSON.parse(JSON.stringify(state)),
    setCamera: c => {cameraTween=null;Object.assign(camera,c);cameraInitialized=true;clampCamera(camera,renderer.size.cssW,renderer.size.cssH);layout=computeLayout(renderer.size.cssW,renderer.size.cssH,camera);return {...camera};},
    getLayout: () => layout,
    getPlotViews: () => state.plots.map(p => getPlotView(p, Date.now())),
    getSelectedSeed: () => selectedSeed,
    selectSeed,
    plant: (index, cropId) => {
      if (cropId) selectedSeed = cropId;
      handlePlant(index);
    },
    harvest: (index) => handleHarvest(index),
    forceRipe: (index) => {
      const r = forceRipe(state, index, Date.now());
      persist();
      return r;
    },
    buy: (id, n = 1) => { const r = buySeed(state, id, n); persist(); refreshUI(); return r; },
    sell: (id, n = 1) => handleSell(id, n),
    switchTab,
    reset: () => {
      closeZone();setSeedTray(false);setChrome(true);
      clearSave();
      state = createInitialState();
      state.flags.welcomed = true;
      cameraInitialized=false;cameraTween=null;
      selectedSeed = firstOwnedSeed(state);
      persist();
      refreshUI();
    },
  };
}

renderMore();
bindUi();
bindAutoSave(() => state);
switchTab('farm');
refreshUI();
exposeDebug();

document.getElementById('version-label').textContent = `版本 ${GAME.version}.0`;
requestAnimationFrame(frame);

let loadingFinished = false;
function finishLoading() {
  if (loadingFinished || !assetsSettled) return;
  loadingFinished = true;
  const progress = document.getElementById('loading-progress');
  progress.style.width = '100%';
  setTimeout(() => {
    const app = document.getElementById('app');
    app.inert = false;
    app.removeAttribute('aria-hidden');
    document.getElementById('loading-screen').classList.add('is-leaving');
    setTimeout(() => {
      document.getElementById('loading-screen').remove();
      app.dataset.ready = '1';
      welcomeIfNeeded();
    }, 320);
  }, 0);
}
