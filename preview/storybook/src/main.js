import { besideZone, moveFarmer, farmerFacing } from './render/farmerView.js?v=0019904d88fd';
import { itemCount } from './ui/icons.js?v=0019904d88fd';
import { tickMarket, sellToCustomer } from './game/systems/market.js?v=0019904d88fd';
import { loadAssets } from './render/assets.js?v=0019904d88fd';
let assetsSettled = false;
loadAssets(value => { document.getElementById('loading-progress').style.width = `${value*100}%`; }).then(() => { assetsSettled = true; });
import * as livestock from './game/systems/livestock.js?v=0019904d88fd';
import { livestockViews, animalBubbles, hitTestAnimalBubble, hitTestLivestock, hitTestZone } from './render/livestockView.js?v=0019904d88fd';
import { mapInput, canvasInput, isPortraitRotated, bindLandscape } from './ui/inputMap.js?v=0019904d88fd';
import { CROPS, GAME, ANIMALS, PRODUCTS, ZONE_NAMES, formatMs, slotCount, slotUnlockLevel } from './game/config.js?v=0019904d88fd';
import { createInitialState } from './game/state.js?v=0019904d88fd';
import { loadState, saveState, bindAutoSave, clearSave } from './game/save.js?v=0019904d88fd';
import { plant, harvest, getPlotView, forceRipe } from './game/systems/farm.js?v=0019904d88fd';
import { buySeed } from './game/systems/economy.js?v=0019904d88fd';
import { addXp } from './game/systems/progression.js?v=0019904d88fd';
import { createRenderer } from './render/canvas.js?v=0019904d88fd';
import { computeLayout, hitTestPlot, clampCamera, coverMinZoom, homeCamera, cameraForZone, interpolateCamera, WORLD, toWorld, drawFarm } from './render/farmView.js?v=0019904d88fd';
import { createEffects } from './render/effects.js?v=0019904d88fd';
import { MAP_LAYOUT } from './render/mapLayout.js?v=0019904d88fd';
import { updateHud } from './ui/hud.js?v=0019904d88fd';
import { renderShop, renderBag, renderMore, renderSeedTray, setActiveTab } from './ui/panels.js?v=0019904d88fd';
import { toast, showLevelUp, hideLevelUp } from './ui/toast.js?v=0019904d88fd';
import {createNaturalDialogs} from './ui/naturalDialogs.js?v=0019904d88fd';
import {createNaturalCommerce} from './ui/naturalCommerce.js?v=0019904d88fd';
import {initNaturalChrome} from './ui/naturalChrome.js?v=0019904d88fd';

const canvas = document.getElementById('farm-canvas');
const renderer = createRenderer(canvas);

let state = loadState();
let selectedPlotIndex = -1;
let selectedSeed = firstOwnedSeed(state);
let activeTab = 'farm';
let farmMode=false, shopTab='seeds', shopSource=null, farmerTarget=null, farmerDirection='s', farmerWalking=false;
let stockSelection=null;
let trayOpen=false, chromeVisible=true, openZoneId=null;
const app=document.getElementById('app'), bubble=document.getElementById('panel-animal');
let naturalChrome=null;
const naturalDialogs=MAP_LAYOUT.STYLE==='storybook'?createNaturalDialogs({
  getState:()=>state,onFeed:(z,i)=>runLivestock('feed',z,i),onCollect:(z,i)=>runLivestock('harvest',z,i),
  onRemove:(z,i)=>runLivestock(z==='sheep'?'harvestMutton':'harvestChicken',i),onAdd:(z,i)=>addStock(z,i,Object.values(ANIMALS).filter(a=>a.zone===z)),
  onPlace:(z,i,k)=>runLivestock('place',z,i,k),
  onTrade:i=>tradeCustomer(i),notify:message=>toast(message),
}):null;
const naturalCommerce=MAP_LAYOUT.STYLE==='storybook'?createNaturalCommerce({
  getState:()=>state,onBuy:handleBuy,onYoung:k=>runLivestock('buyYoung',k),onFeed:()=>runLivestock('buyFeed'),
  onCraft:m=>runLivestock('craftFeed',m),onMarket:()=>{jumpTo('market');openZone('market');},
  onClose:panel=>panel==='shop'?closeShop():switchTab('farm'),
}):null;
function setSeedTray(value){trayOpen=!!value;if(!trayOpen)selectedPlotIndex=-1;app.classList.toggle('tray-open',trayOpen);}
function setChrome(value){chromeVisible=!!value;app.classList.toggle('chrome-hidden',!chromeVisible);}
function setFarmMode(value){farmMode=!!value;if(!farmMode)setSeedTray(false);}
function enterFarmMode(index=-1){switchTab('farm');farmMode=true;selectedSeed=firstOwnedSeed(state);selectedPlotIndex=index;setSeedTray(true);cameraTween={start:performance.now(),from:{...camera},id:'farm'};refreshUI();}
function openShopTab(tab='seeds',source=null){shopSource=source;shopTab=tab;const list=document.getElementById('shop-list');if(list){list.scrollTop=0;list.scrollLeft=0;}switchTab('shop');}
function closeShop(){const source=shopSource;shopSource=null;switchTab('farm');if(source)openZone(source);}
function renderStockPicker(){
  if(!stockSelection)return;
  const {id,index}=stockSelection,row=document.getElementById('animal-slots').children[index];if(!row)return;
  row.querySelector('.stock-picker')?.remove();
  const picker=document.createElement('div');picker.className='stock-picker';
  for(const a of Object.values(ANIMALS).filter(a=>a.zone===id&&state.stock[a.id]>0)){
    const b=document.createElement('button');b.className='pill-primary';b.textContent=a.name;
    b.onclick=()=>{stockSelection=null;runLivestock('place',id,index,a.id);};picker.append(b);
  }
  row.append(picker);
}
function addStock(id,index,kinds){
  const owned=kinds.filter(a=>state.stock[a.id]>0);
  if(!owned.length){toast('仓库没有幼畜或鱼苗，去商店购买吧',{action:'去购买',onClick:()=>openShopTab('animals',id)});return;}
  if(owned.length===1){runLivestock('place',id,index,owned[0].id);return;}
  stockSelection={id,index};renderStockPicker();
}
function closeZone(){naturalDialogs?.close();openZoneId=null;stockSelection=null;bubble.hidden=true;}
const millPanel=document.getElementById('panel-mill');
function closeMill(){millPanel.classList.add('hidden');app.classList.remove('mill-open');}
function renderMill(){
  if(naturalCommerce){naturalCommerce.renderMill();return;}
  document.getElementById('mill-inventory').innerHTML=['wheat','corn','feed'].map(k=>itemCount(k,state.inventory[k])).join('');
  millPanel.querySelectorAll('[data-recipe]').forEach(r=>{r.innerHTML=itemCount(r.dataset.recipe,r.dataset.recipe==='wheat'?2:1)+'<span>→</span>'+itemCount('feed',1);});
  millPanel.querySelectorAll('[data-mill-material]').forEach(b=>{b.disabled=state.inventory[b.dataset.millMaterial]<(b.dataset.millMaterial==='wheat'?2:1);});
}
function openZone(id){
  setFarmMode(false);
  if(id==='store'){openShopTab('seeds');return true;}
  if(id==='market'){switchTab('farm');openZoneId=id;renderZone();return true;}
  if(id==='shop'){switchTab('bag');return true;}
  if(id==='house'){closeZone();closeMill();toast('暂未开放');return true;}
  if(id==='mill'){switchTab('farm');renderMill();millPanel.classList.remove('hidden');app.classList.add('mill-open');if(naturalCommerce)document.getElementById('btn-close-mill').focus({preventScroll:true});return true;}
  if(!state.pens[id])return false;switchTab('farm');openZoneId=id;renderZone();return true;}
function renderZone(){
  if(!openZoneId)return;
  if(naturalDialogs?.render(openZoneId))return;
  document.getElementById('animal-buy').hidden=openZoneId==='market';
  const id=openZoneId;
  document.getElementById('animal-slots').classList.remove('market-slots');
  bubble.hidden=false;
  const content=document.getElementById('animal-slots');content.replaceChildren();
  document.getElementById('animal-title').textContent=({chicken:'🐔',pig:'🐷',cow:'🐮',sheep:'🐑',pond:'🐟',market:'🧺'}[id]+' '+ZONE_NAMES[id])+(state.pens[id]?` · ${state.pens[id].filter(Boolean).length} 只`:'');
  if(id==='market'){renderMarket(content);return;}
  const kinds=Object.values(ANIMALS).filter(a=>a.zone===id);
  const productIds=[...new Set([...kinds.flatMap(a=>Object.keys(a.outputs)),...(id==='chicken'?['chickenMeat']:id==='sheep'?['mutton']:[])])];
  document.getElementById('animal-inventory').innerHTML=[...productIds,'feed'].map(k=>itemCount(k,state.inventory[k])).join('');
  state.pens[id].forEach((o,i)=>{
    const v=livestock.getOccupantView(o),row=document.createElement('article');row.className='animal-slot';
    if(i>=slotCount(state.level)){
      row.classList.add('is-locked');row.innerHTML=`<p>🔒</p><p>Lv.${slotUnlockLevel(i)} 解锁</p>`;content.append(row);return;
    }
    const button=(text,action,disabled=false)=>{const b=document.createElement('button');b.type='button';b.className=text==='出售'?'pill-secondary':'pill-primary';b.textContent=text;b.disabled=disabled;b.onclick=action;let actions=row.querySelector('.slot-actions');if(!actions){actions=document.createElement('div');actions.className='slot-actions';row.append(actions);}actions.append(b);};
    if(!o){
      const young=kinds.find(a=>state.stock[a.id]>0)||kinds.find(a=>state.level>=a.unlockLevel)||kinds[0];
      row.innerHTML=`<p class="empty-cue">空栏</p><small>${young.name} · ${young.cost} 金币</small><small>库存 ${state.stock[young.id]}</small>`;
      button('添加',()=>addStock(id,i,kinds));
    }else{
      const output=Object.entries(v.outputs).map(([k,n])=>itemCount(k,n)).join('');
      row.innerHTML=`<img class="slot-sprite" src="assets/animals/${o.kind}-0.webp" alt="${v.animal.name}"><span class="state-pill ${v.status}">${{hungry:'🥣 饥饿',growing:'⏳ '+formatMs(v.remainingMs),ready:'✨ 待收取'}[v.status]}</span>${v.status==='growing'?`<div class="growth-track" role="progressbar" aria-label="生长进度" aria-valuenow="${Math.round(v.progress*100)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${v.progress*100}%"></div></div>`:''}<div class="slot-output">${output}</div>`;
      button(v.status==='ready'?'收取':'喂食',()=>runLivestock(v.status==='ready'?'harvest':'feed',id,i),v.status==='growing');
      if(id==='chicken'||id==='sheep')button('出售',()=>runLivestock(id==='chicken'?'harvestChicken':'harvestMutton',i));
    }
    content.append(row);
  });
  renderStockPicker();
}

function tradeCustomer(index){
  const r=sellToCustomer(state,index);
  if(r.ok){toast(`成交！金币 +${r.coins}`);const coin=document.getElementById('hud-coins')||document.querySelector('.hud');coin?.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:450});persist();refreshUI();}
  return r;
}
function renderMarket(content){
  document.getElementById('animal-inventory').textContent='收获带到集市，卖给需要它的客人';
  content.classList.add('market-slots');
  state.market.customers.forEach((c,i)=>{
    const card=document.createElement('article');card.className='animal-slot customer-card';
    if(!c)card.innerHTML='<p>客人在路上…</p>';
    else {
      const item=CROPS[c.wantId]||PRODUCTS[c.wantId];
      card.innerHTML=`<div class="speech-bubble"><div>${itemCount(c.wantId,c.qty)}</div><strong>🪙 ${c.offer}</strong></div>${c.generous?'<span class="generous-badge">✨ 豪客</span>':''}<img class="customer-sprite" src="assets/market/${c.variant}.webp" alt="客人">`;
      const b=document.createElement('button');b.className='pill-primary';b.textContent='卖给他';b.disabled=(state.inventory[c.wantId]||0)<c.qty;
      b.onclick=()=>tradeCustomer(i);card.append(b);
    }
    content.append(card);
  });
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
  document.querySelectorAll('[data-shop-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.shopTab===shopTab)));
  renderMill();
  renderZone();
  renderSeedTray(state, selectedSeed, { onSelect: selectSeed });
  if (activeTab === 'shop') {
    if(naturalCommerce)naturalCommerce.renderShop(shopTab);
    else renderShop(state, { onBuy: handleBuy, onYoung: k=>runLivestock('buyYoung',k), onFeed:()=>runLivestock('buyFeed'), onCraft:m=>runLivestock('craftFeed',m), tab:shopTab });
  }
  if (activeTab === 'bag') {if(naturalCommerce)naturalCommerce.renderBag();else renderBag(state);}
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

function switchTab(tab) {
  naturalChrome?.closeDestinations();
  closeZone();
  closeMill();
  if(tab!=='farm')setFarmMode(false);
  if(tab==='shop'||tab==='bag')document.getElementById('toasts').replaceChildren();
  activeTab = tab;
  setActiveTab(tab);
  refreshUI();
  if(naturalCommerce&&['shop','bag','more'].includes(tab))document.querySelector(`#panel-${tab} .sheet-close`).focus({preventScroll:true});
}

function runLivestock(method,...args) {
  const result=livestock[method](state,...args);
  if(result.ok) {
    if(result.xp) {const prog=addXp(state,result.xp);if(prog.leveled.length)showLevelUp(prog);}
    const outputs=result.outputs?Object.entries(result.outputs).map(([k,n])=>`${PRODUCTS[k].name}×${n}`).join('、'):'';
    const messages={buyYoung:()=>`买到${ANIMALS[args[0]].name} ×${args[1]??1}`,
      buyFeed:()=>`买到饲料 ×${args[0]??1}`,craftFeed:()=> '制作饲料 ×1',
      place:()=>`${ANIMALS[args[2]].name}已放入${ZONE_NAMES[args[0]]}`,
      feed:()=> '喂食成功，开始计时'};
    toast(outputs?`收获 ${outputs}`:messages[method]());persist();
  } else if(result.reason==='no_feed')toast('饲料不足，去商店购买或制作吧',{action:'去购买',onClick:()=>openShopTab('feed',openZoneId)});
  else toast(({wrong_zone:`请放到${ZONE_NAMES[ANIMALS[args[2]]?.zone] || '对应养殖区'}`,invalid:'操作参数无效',no_coins:'金币不够啦',locked:'等级不足，先收获升级',no_material:'材料不足',no_feed:'饲料不足，请去商店购买或用小麦、玉米制作饲料',no_stock:'没有这种幼畜或鱼苗了',occupied:'这个栏位已有动物',already_fed:'已经喂过了',hungry:'请先在动物面板中喂食',not_ready:'还没到收获时间',empty:'请先放入幼畜或鱼苗'})[result.reason] || '现在无法操作');
  refreshUI();return result;
}
function jumpTo(id) {
  if(id==='farm'){enterFarmMode();return true;}
  setFarmMode(false);selectedPlotIndex=-1;
  if(!cameraForZone(layout,id))return false;
  document.getElementById('toasts').replaceChildren();
  closeZone();closeMill();
  switchTab('farm');setSeedTray(id==='farm');cameraInitialized=true;
  const zone=layout.zones.find(z=>z.id===id);if(zone){Object.assign(state.farmer,besideZone(zone));farmerTarget=null;farmerWalking=false;persist();}
  cameraTween={start:performance.now(),from:{...camera},id};return true;
}

function tap(x, y) {
  if (activeTab !== 'farm') { switchTab('farm'); return; }
  const hit=hitTestPlot(x,y,layout);
  if(hit){if(!farmMode){
    if(MAP_LAYOUT.STYLE==='storybook'&&getPlotView(state.plots[hit.index],Date.now()).status==='ripe'){handleHarvest(hit.index);return;}
    enterFarmMode(hit.index);return;}selectedPlotIndex=hit.index;}
  else {
    setFarmMode(false);
    const animalBubble=hitTestAnimalBubble(x,y,layout,animalBubbles(drawnLivestock,lastAnimationNow,state,layout.camera.zoom,layout));
    const animal=hitTestLivestock(x,y,layout,drawnLivestock);
    const target=animalBubble?.zoneId || animal?.zoneId || hitTestZone(x,y,layout)?.id;
    if(target){openZone(target);return;}
    farmerTarget=toWorld(x,y,layout);farmerDirection=farmerFacing(farmerTarget.x-state.farmer.x,farmerTarget.y-state.farmer.y);farmerWalking=true;return;
  }
  const view = getPlotView(state.plots[hit.index], Date.now());
  if (view.status === 'ripe') handleHarvest(hit.index);
  else if (view.status === 'empty') handlePlant(hit.index);
  else toast(`还要再等 ${formatMs(view.remainingMs)}`);
}

function frame(animationNow) {
  if(tickMarket(state)){persist();if(openZoneId==='market')renderZone();}
  if(farmerTarget){farmerWalking=moveFarmer(state.farmer,farmerTarget,Math.min(.1,(animationNow-lastAnimationNow)/1000));if(!farmerWalking){farmerTarget=null;persist();}}
  lastAnimationNow=animationNow;
  renderer.resize();
  const { cssW, cssH } = renderer.size;
  if (!cameraInitialized) {
    Object.assign(camera,homeCamera(computeLayout(cssW,cssH)));
    cameraInitialized = true;
  }
  if(cameraTween) {
    const a=cameraTween,t=Math.min(1,(animationNow-a.start)/520);
    const view=computeLayout(cssW,cssH);
    const target=a.id==='house'?homeCamera(view):cameraForZone(view,a.id);
    Object.assign(camera,interpolateCamera(a.from,target,t));
    if(t>=1)cameraTween=null;
  }
  clampCamera(camera, cssW, cssH);
  layout = computeLayout(cssW, cssH, camera);
  drawnLivestock=livestockViews(state,layout,animationNow);
  // Growth uses Unix time, matching persisted plantedAt. rAF time is cosmetic only.
  drawFarm(renderer.ctx, state, layout, {
    now: Date.now(), animationNow, selectedPlotIndex, debugOverlay, farmerAnimation:{walking:farmerWalking,facing:farmerDirection},
  });
  effects.draw(renderer.ctx, layout, animationNow, canvas, document.getElementById('warehouse-button'));
  if(openZoneId && state.pens[openZoneId]){const key=JSON.stringify(state.pens[openZoneId].map(o=>{const v=livestock.getOccupantView(o);return [v.status,Math.ceil(v.remainingMs/1000)];}));if(bubble.dataset.status!==key){bubble.dataset.status=key;renderZone();}}
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
  };
  const zoom = (factor, before, after = before) => {
    cameraTween=null;
    const z = Math.max(coverMinZoom(renderer.size.cssW, renderer.size.cssH), Math.min(WORLD.maxZoom, camera.zoom * factor));
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
  document.getElementById('animal-buy').onclick=()=>openShopTab('animals',openZoneId);
  document.querySelectorAll('[data-shop-tab]').forEach(b=>b.onclick=()=>{shopTab=b.dataset.shopTab;const list=document.getElementById('shop-list');if(list){list.scrollTop=0;list.scrollLeft=0;}refreshUI();});
  document.getElementById('btn-close-mill').onclick=closeMill;
  millPanel.onclick=e=>{if(e.target===millPanel)closeMill();};
  millPanel.querySelectorAll('[data-mill-material]').forEach(b=>b.onclick=()=>runLivestock('craftFeed',b.dataset.millMaterial));
  document.getElementById('btn-close-animal').onclick=closeZone;
  bubble.onclick=e=>{if(e.target===bubble)closeZone();};

  const marketScroll=document.getElementById('animal-slots');let marketDrag=null,marketSuppress=false;
  marketScroll.addEventListener('pointerdown',e=>{marketSuppress=false;if(naturalDialogs||!marketScroll.classList.contains('market-slots'))return;marketDrag={id:e.pointerId,x:mapInput(e.clientX,e.clientY).x,scroll:marketScroll.scrollLeft};marketSuppress=false;});
  marketScroll.addEventListener('pointermove',e=>{if(!marketDrag)return;const dx=mapInput(e.clientX,e.clientY).x-marketDrag.x;if(Math.abs(dx)>6){marketSuppress=true;marketScroll.setPointerCapture(e.pointerId);marketScroll.scrollLeft=marketDrag.scroll-dx;}});
  for(const type of ['pointerup','pointercancel'])marketScroll.addEventListener(type,()=>{marketDrag=null;});
  marketScroll.addEventListener('click',e=>{if(marketSuppress&&marketScroll.classList.contains('market-slots')){e.preventDefault();e.stopImmediatePropagation();marketSuppress=false;}},true);
  const tray=document.getElementById('seed-tray');let drag=null,suppress=false;
  tray.addEventListener('pointerdown',e=>{const p=mapInput(e.clientX,e.clientY);drag={id:e.pointerId,x:p.x,scroll:tray.scrollLeft,moved:false};suppress=false;});
  tray.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=mapInput(e.clientX,e.clientY).x-drag.x;if(Math.abs(dx)>6){drag.moved=true;tray.setPointerCapture(e.pointerId);}if(drag.moved){tray.scrollLeft=drag.scroll-dx;suppress=true;}});
  const endDrag=()=>{drag=null;};tray.addEventListener('pointerup',endDrag);tray.addEventListener('pointercancel',endDrag);
  tray.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);

  document.querySelectorAll('.zone-jump').forEach(btn=>btn.onclick=()=>{jumpTo(btn.dataset.zone);if(btn.dataset.zone==='market')openZone('market');});
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => btn.dataset.tab==='shop'?openShopTab('seeds'):switchTab(activeTab === btn.dataset.tab ? 'farm' : btn.dataset.tab));
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
    setFarmMode(false);farmerTarget=null;farmerWalking=false;
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
  document.querySelectorAll('.sheet-close').forEach(btn => btn.addEventListener('click', () => activeTab==='shop'?closeShop():switchTab('farm')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') activeTab==='shop'?closeShop():switchTab('farm'); });
  canvas.addEventListener('pointerleave', () => { hoveredIndex = -1; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  bindLandscape(() => renderer.resize());
}

function welcomeIfNeeded() {
  if (state.flags.welcomed) return;
  state.flags.welcomed = true;
  persist();
  toast('欢迎来到开心农场！点击农田进入耕作模式吧', { timeout: 3200 });
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
    jumpTo,openZone,openShopTab,setSeedTray,setChrome,enterFarmMode,setFarmMode,
    get farmMode(){return farmMode;},get selectedSeed(){return selectedSeed;},get selectedPlotIndex(){return selectedPlotIndex;},get farmer(){return {...state.farmer,target:farmerTarget,walking:farmerWalking,facing:farmerDirection};},getFarmer:()=>({...state.farmer}),setFarmer:(x,y)=>{state.farmer={x,y};farmerTarget=null;farmerWalking=false;persist();},walkTo:(x,y)=>{farmerTarget={x,y};farmerDirection=farmerFacing(x-state.farmer.x,y-state.farmer.y);farmerWalking=true;},
    setDebugOverlay: flags => {for(const key of ['plots','walk'])if(key in flags)debugOverlay[key]=!!flags[key];return {...debugOverlay};},
    getDebugOverlay:()=>({...debugOverlay}),
    getUI:()=>({farmMode,trayOpen,chromeVisible,openZone:openZoneId}),
    getAnimalBubbles:()=>animalBubbles(drawnLivestock,lastAnimationNow,state,layout.camera.zoom,layout),
    getLivestockViews:()=>livestockViews(state,layout,lastAnimationNow),
    mapInput,
    isPortraitRotated,
    getState: () => JSON.parse(JSON.stringify(state)),
    setCamera: c => {cameraTween=null;Object.assign(camera,c);cameraInitialized=true;clampCamera(camera,renderer.size.cssW,renderer.size.cssH);layout=computeLayout(renderer.size.cssW,renderer.size.cssH,camera);return {...camera};},
    getLayout: () => layout,
    getPlotViews: () => state.plots.map(p => getPlotView(p, Date.now())),
    getSelectedSeed: () => selectedSeed,
    setSelectedPlot: i => { selectedPlotIndex = Number.isInteger(i)?i:-1; },
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
    switchTab,
    reset: () => {
      closeZone();setFarmMode(false);farmerTarget=null;setChrome(true);
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

if(MAP_LAYOUT.STYLE==='storybook'){
  app.classList.add('storybook');
  const controls=document.createElement('nav');controls.className='world-review-controls';controls.setAttribute('aria-label','地图视野');
  const overview=document.createElement('button');overview.textContent='全景';overview.onclick=()=>{
    switchTab('farm');closeZone();closeMill();setFarmMode(false);cameraTween=null;
    const zoom=coverMinZoom(renderer.size.cssW,renderer.size.cssH);
    Object.assign(camera,{zoom,x:(renderer.size.cssW-WORLD.w*zoom)/2,y:(renderer.size.cssH-WORLD.h*zoom)/2});cameraInitialized=true;
  };
  const hints=document.createElement('button');hints.textContent='全部提示';hints.setAttribute('aria-pressed','false');hints.onclick=()=>{MAP_LAYOUT.PREVIEW_ALL_HINTS=!MAP_LAYOUT.PREVIEW_ALL_HINTS;hints.setAttribute('aria-pressed',String(MAP_LAYOUT.PREVIEW_ALL_HINTS));};
  controls.append(overview);if(new URLSearchParams(location.search).get('review')==='1')controls.append(hints);app.append(controls);
}
renderMore();
if(MAP_LAYOUT.STYLE==='storybook')naturalChrome=initNaturalChrome();
bindUi();
bindAutoSave(() => state);
switchTab('farm');
refreshUI();
exposeDebug();

document.getElementById('version-label').textContent = `版本 ${GAME.version}.0`;
document.fonts.load('700 32px FarmSign').then(()=>requestAnimationFrame(frame));

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
