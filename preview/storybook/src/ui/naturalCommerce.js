import {CROP_LIST,PRODUCTS,ANIMALS,FEED,formatGrowTime} from '../game/config.js?v=0019904d88fd';
import {itemIcon,itemCount} from './icons.js?v=0019904d88fd';
import {bindHorizontalScroll} from './horizontalScroll.js?v=0019904d88fd';

const art=id=>`<span class="commerce-art">${itemIcon(id)}</span>`;
const animalArt=a=>`<span class="commerce-art"><img src="assets/animals/${a.id}-0.webp" alt="${a.name}"></span>`;
const button=(text,key,disabled=false)=>`<button type="button" class="natural-primary" data-commerce-action="${key}" ${disabled?'disabled':''}>${text}</button>`;
const price=n=>`<span class="commerce-price">🪙 <strong>${n}</strong></span>`;

export function createNaturalCommerce({getState,onBuy,onYoung,onFeed,onCraft,onMarket,onClose}){
  let bagTab='crops';
  const shop=document.getElementById('panel-shop'),bag=document.getElementById('panel-bag'),mill=document.getElementById('panel-mill');
  for(const panel of [shop,bag]){
    const overlay=document.createElement('div');overlay.className='natural-commerce-overlay';
    panel.before(overlay);overlay.append(panel);panel.classList.add('natural-commerce');panel.setAttribute('aria-modal','true');
    overlay.addEventListener('click',e=>{if(e.target===overlay)onClose(panel===shop?'shop':'bag');});
  }
  shop.querySelector('.sheet-head').innerHTML=`<h2><span class="commerce-heading-icon">🛒</span><span>商店<small>挑选种子与幼苗，带回农场</small></span></h2><span id="commerce-coins"></span><button type="button" class="sheet-close" aria-label="关闭商店">×</button>`;
  shop.querySelector('[data-shop-tab="animals"]').textContent='幼畜与鱼苗';
  const shopFooter=document.createElement('footer');shopFooter.className='commerce-footer';shopFooter.textContent='每次购买 1 份 · 购买后存入种子或幼苗库存';shop.append(shopFooter);
  bag.querySelector('.sheet-head').innerHTML=`<h2><span class="commerce-heading-icon">🧺</span><span>仓库<small>收好每一份收获，准备下一次耕作</small></span></h2><span id="commerce-bag-count"></span><button type="button" class="sheet-close" aria-label="关闭仓库">×</button>`;
  const bagTabs=document.createElement('nav');bagTabs.className='commerce-tabs';bagTabs.setAttribute('aria-label','仓库分类');
  bagTabs.innerHTML=[['crops','作物'],['products','动物产出'],['supplies','种子与储备']].map(([id,name])=>`<button type="button" data-bag-tab="${id}" aria-pressed="${id===bagTab}">${name}</button>`).join('');
  bag.querySelector('.sheet-head').after(bagTabs);
  bagTabs.addEventListener('click',e=>{const b=e.target.closest('[data-bag-tab]');if(!b)return;bagTab=b.dataset.bagTab;document.getElementById('bag-list').scrollLeft=0;renderBag();});
  const bagFooter=document.createElement('footer');bagFooter.className='commerce-footer';bagFooter.innerHTML=`<span>左右滑动，查看全部库存</span><button type="button" class="natural-secondary" data-commerce-action="market">前往集市 ›</button>`;bag.append(bagFooter);
  mill.classList.add('natural-mill');
  mill.querySelector('.mill-head').innerHTML=`<h2><span class="commerce-heading-icon">🌾</span><span>饲料坊<small>把农场的收成，做成动物的口粮</small></span></h2><p id="mill-inventory"></p><button type="button" id="btn-close-mill" class="sheet-close" aria-label="关闭饲料坊">×</button>`;
  mill.querySelector('.mill-body').innerHTML='';
  const millFooter=document.createElement('footer');millFooter.className='commerce-footer';millFooter.textContent='每次制作 1 份饲料 · 材料足够即可立即完成';mill.querySelector('.modal-card').append(millFooter);

  for(const list of [document.getElementById('shop-list'),document.getElementById('bag-list')]){
    bindHorizontalScroll(list);
  }

  for(const panel of [shop,bag,mill])panel.addEventListener('click',e=>{
    const b=e.target.closest('[data-commerce-action]');if(!b||b.disabled)return;
    const [command,id]=b.dataset.commerceAction.split(':');
    if(command==='buy')onBuy(id);
    else if(command==='young')onYoung(id);
    else if(command==='feed')onFeed();
    else if(command==='craft')onCraft(id);
    else if(command==='market')onMarket();
  });
  // Match the nested animal dialogs: keep keyboard focus within the active panel.
  document.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const panel=[shop,bag,mill,document.getElementById('panel-more')].find(p=>!p.classList.contains('hidden'));if(!panel||!document.getElementById('modal-levelup').classList.contains('hidden'))return;
    const buttons=[...panel.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
  function replaceCards(list,html){
    const key=list.contains(document.activeElement)?document.activeElement.dataset.commerceAction:null,offset=list.scrollLeft;
    list.innerHTML=html;list.scrollLeft=offset;
    if(key)[...list.querySelectorAll('[data-commerce-action]')].find(b=>b.dataset.commerceAction===key&&!b.disabled)?.focus({preventScroll:true});
  }
  function recipe(s,id){
    const needed=id==='wheat'?2:1,owned=s.inventory[id]||0,ready=owned>=needed,label=id==='wheat'?'小麦':'玉米';
    return `<article class="commerce-card commerce-recipe" data-material="${id}"><div class="commerce-card-top"><span>${label}配方</span><span class="natural-state ${ready?'ready':'hungry'}">${ready?'可制作':'材料不足'}</span></div><div class="commerce-formula"><div>${art(id)}<strong>${label} ×${needed}</strong></div><span class="formula-arrow">→</span><div>${art('feed')}<strong>饲料 ×1</strong></div></div><p class="commerce-owned">已有${label} <b>${owned}</b> / 需要 <b>${needed}</b></p><div class="commerce-card-action">${button(ready?'制作 1 份':`还差 ${needed-owned} 份${label}`,`craft:${id}`,!ready)}</div></article>`;
  }
  function renderShop(tab){
    const s=getState(),list=document.getElementById('shop-list');
    document.getElementById('commerce-coins').innerHTML=price(s.coins);
    shopFooter.textContent=tab==='feed'?'每次购买 1 份 · 作物加工请前往饲料坊':'每次购买 1 份 · 左右滑动，查看更多商品';
    const entries=tab==='seeds'?CROP_LIST:tab==='animals'?Object.values(ANIMALS):[];
    const cards=entries.map(a=>{
      const seed=tab==='seeds',cost=seed?a.seedCost:a.cost,owned=seed?s.seeds[a.id]||0:s.stock[a.id]||0,locked=s.level<a.unlockLevel,poor=s.coins<cost;
      return `<article class="commerce-card${locked?' commerce-locked':''}" data-product="${a.id}"><div class="commerce-card-top"><span>${seed?'作物种子':'幼畜 / 鱼苗'}</span><span class="natural-state ${locked?'empty':'ready'}">${locked?`Lv.${a.unlockLevel} 解锁`:'可购买'}</span></div>${seed?art(a.id):animalArt(a)}<h3>${a.name}${seed?'种子':''}</h3><p class="commerce-description">${seed?'生长':'喂养'} ${formatGrowTime(a.growMs)}${seed?` · 收获经验 +${a.xp}`:''}</p><p class="commerce-owned">库存 <b>${owned}</b> 份</p><div class="commerce-card-action">${price(cost)}${button(locked?'未解锁':poor?'金币不足':'购买',`${seed?'buy':'young'}:${a.id}`,locked||poor)}</div></article>`;
    });
    if(tab==='feed')cards.push(`<article class="commerce-card" data-product="feed"><div class="commerce-card-top"><span>动物口粮</span><span class="natural-state ready">通用饲料</span></div>${art('feed')}<h3>饲料</h3><p class="commerce-description">每次喂养消耗 1 份</p><p class="commerce-owned">库存 <b>${s.inventory.feed}</b> 份</p><div class="commerce-card-action">${price(FEED.cost)}${button(s.coins<FEED.cost?'金币不足':'购买','feed',s.coins<FEED.cost)}</div></article>`);
    replaceCards(list,cards.join(''));
  }
  function renderBag(){
    const s=getState(),list=document.getElementById('bag-list');
    bagTabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bagTab===bagTab)));
    const goods=[...CROP_LIST,...Object.values(PRODUCTS)].filter(a=>s.inventory[a.id]>0);
    document.getElementById('commerce-bag-count').textContent=`收获 ${goods.reduce((n,a)=>n+s.inventory[a.id],0)} 份`;
    let entries=(bagTab==='crops'?CROP_LIST:bagTab==='products'?Object.values(PRODUCTS):[]).filter(a=>s.inventory[a.id]>0).map(a=>({key:a.id,name:a.name,count:s.inventory[a.id],art:art(a.id),note:`参考单价 ${a.sellPrice} 金币`,type:'收获'}));
    if(bagTab==='supplies')entries=[
      ...(s.inventory.feed>0?[{key:'feed',name:'饲料',count:s.inventory.feed,art:art('feed'),note:'用于喂养动物与鱼儿',type:'口粮'}]:[]),
      ...CROP_LIST.filter(a=>s.seeds[a.id]>0).map(a=>({key:'seed-'+a.id,name:a.name+'种子',count:s.seeds[a.id],art:art(a.id),note:'在农田中种植',type:'种子'})),
      ...Object.values(ANIMALS).filter(a=>s.stock[a.id]>0).map(a=>({key:'stock-'+a.id,name:a.name,count:s.stock[a.id],art:animalArt(a),note:'放入对应养殖区',type:a.zone==='pond'?'鱼苗':'幼畜'})),
    ];
    document.getElementById('bag-empty').hidden=true;
    replaceCards(list,entries.length?entries.map(a=>`<article class="commerce-card commerce-inventory" data-inventory="${a.key}"><div class="commerce-card-top"><span>${a.type}</span><span class="commerce-quantity">×${a.count}</span></div>${a.art}<h3>${a.name}</h3><p class="commerce-description">${a.note}</p><p class="commerce-inventory-note">${bagTab==='supplies'?'储备在仓库，随时可用':'带到集市，与客人交易'}</p></article>`).join(''):`<div class="commerce-empty"><span>🧺</span><h3>这里还空着呢</h3><p>${bagTab==='supplies'?'去商店挑选种子、幼苗和饲料吧':'去农田或养殖区收获，再来看看吧'}</p></div>`);
  }
  function renderMill(){
    const s=getState();document.getElementById('mill-inventory').innerHTML=itemCount('feed',s.inventory.feed)+'<span>饲料库存</span>';
    replaceCards(mill.querySelector('.mill-body'),recipe(s,'wheat')+recipe(s,'corn'));
  }
  return {renderShop,renderBag,renderMill};
}
