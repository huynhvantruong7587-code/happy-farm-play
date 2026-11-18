import {ANIMALS,PEN_ZONES,ZONE_NAMES,CROPS,PRODUCTS,slotCount,slotUnlockLevel,formatMs} from '../game/config.js?v=b5e861e4569c';
import {getOccupantView,previewMeatHarvest} from '../game/systems/livestock.js?v=b5e861e4569c';
import {itemIcon,itemCount} from './icons.js?v=b5e861e4569c';
import {bindHorizontalScroll} from './horizontalScroll.js?v=b5e861e4569c';

const customerNames={bunny:'兔子客人',bear:'小熊客人',fox:'狐狸客人',duck:'鸭子客人',cat:'猫咪客人',boy:'邻家男孩'};
const art=id=>`<span class="natural-item-art">${itemIcon(id)}</span>`;
const action=(label,name,index,extra='')=>`<button type="button" class="natural-primary" data-action="${name}" data-index="${index}" ${extra}>${label}</button>`;
const penCopy={
  chicken:{name:'小鸡',young:'幼鸡',kind:'chicken',subtitle:'照顾小鸡，收取产出',collect:'收取鸡蛋',meat:'chickenMeat',product:'egg'},
  sheep:{name:'小羊',young:'羊羔',kind:'sheep',subtitle:'照顾小羊，收取柔软羊毛',collect:'收取羊毛',meat:'mutton',product:'wool'},
  pig:{name:'小猪',young:'小猪',kind:'pig',subtitle:'悉心喂养，等待小猪长大',collect:'收取猪肉'},
  cow:{name:'小牛',young:'牛犊',kind:'cow',subtitle:'悉心喂养，收取牛肉与牛皮',collect:'收取产出'},
  pond:{name:'鱼儿',young:'鱼苗',kind:'crucian',subtitle:'投喂鱼儿，等待满塘收获',collect:'收取成鱼'},
};

export function createNaturalDialogs({getState,onFeed,onCollect,onRemove,onAdd,onPlace,onTrade,notify}){
  const root=document.getElementById('panel-animal'),panel=root.querySelector('.animal-panel');
  const list=document.getElementById('animal-slots'),title=document.getElementById('animal-title'),inventory=document.getElementById('animal-inventory'),buy=document.getElementById('animal-buy');
  const footer=document.createElement('footer');footer.className='natural-dialog-footer';footer.hidden=true;panel.append(footer);
  const confirmation=document.createElement('div');confirmation.className='natural-confirm-overlay';confirmation.hidden=true;
  confirmation.innerHTML=`<section class="natural-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="natural-confirm-title" aria-describedby="natural-confirm-description"><header><h2 id="natural-confirm-title">收取鸡肉？</h2><button type="button" class="natural-close" data-confirm="cancel" aria-label="关闭确认框">×</button></header><div class="natural-confirm-body"><img class="confirm-chicken" src="assets/animals/chicken-0.webp" alt="小鸡"><div><p id="natural-confirm-description">收取后，这只小鸡将离开鸡舍，空栏可重新放入小鸡。</p><div class="natural-confirm-reward"></div></div></div><p class="natural-confirm-warning"></p><div class="natural-confirm-actions"><button type="button" class="natural-secondary" data-confirm="cancel">取消</button><button type="button" class="natural-amber" data-confirm="accept">确认收取</button></div></section>`;
  root.append(confirmation);
  let current=null,signature='',returnFocus=null,pending=null,menuIndex=null,pickerIndex=null;
  const scrolling=bindHorizontalScroll(list);

  function closeMenus(){menuIndex=null;pickerIndex=null;list.querySelectorAll('.natural-more-menu,.natural-stock-picker').forEach(e=>e.hidden=true);list.querySelectorAll('[data-action="other"],[data-action="add"]').forEach(e=>e.setAttribute('aria-expanded','false'));}
  function closeConfirmation(restore=true){
    const index=pending?.index;pending=null;confirmation.hidden=true;panel.inert=false;panel.removeAttribute('aria-hidden');
    if(restore)list.querySelector(`[data-action="other"][data-index="${index}"]`)?.focus();
  }
  function close(){
    scrolling.stop();
    if(!current)return;
    closeConfirmation(false);closeMenus();root.classList.remove('natural-dialog');delete root.dataset.zone;footer.hidden=true;inventory.hidden=false;
    current=null;signature='';const target=returnFocus;returnFocus=null;
    if(target?.isConnected&&target!==document.body)target.focus({preventScroll:true});
  }
  function setConfirmationCopy(info){
    const copy=penCopy[pending.zone],product=PRODUCTS[copy.product].name,meat=PRODUCTS[copy.meat].name;
    confirmation.querySelector('#natural-confirm-title').textContent=`收取${meat}？`;
    confirmation.querySelector('.confirm-chicken').src=`assets/animals/${copy.kind}-0.webp`;
    confirmation.querySelector('.confirm-chicken').alt=copy.name;
    confirmation.querySelector('#natural-confirm-description').textContent=`收取后，这只${copy.name}将离开${ZONE_NAMES[pending.zone]}，空栏可重新放入${copy.name}。`;
    const reward=confirmation.querySelector('.natural-confirm-reward');
    reward.innerHTML=`${art(copy.meat)}<strong>${meat} ×${info.outputs[copy.meat]}</strong><span>经验 +${info.xp}</span>`;
    const warning=confirmation.querySelector('.natural-confirm-warning');
    warning.textContent=info.status==='ready'
      ? `这只${copy.name}还有${product} ×${info.lostOutputs[copy.product]||0} 未收取。直接收${meat}，这些${product}不会收入仓库；可以取消并先收取。`
      : info.interruptsProduction?`这只${copy.name}正在生产，收取${meat}会结束本轮生产。`:`收取后需要重新放入${copy.name}，才能继续${pending.zone==='chicken'?'产蛋':'生产羊毛'}。`;
    warning.classList.toggle('has-pending-eggs',info.status==='ready');
    pending.shownStatus=info.status;
  }
  function openConfirmation(index){
    const info=previewMeatHarvest(getState(),current,index);if(!info.ok){notify('动物已不在栏位中');return;}
    pending={zone:current,index,id:info.id,shownStatus:info.status};setConfirmationCopy(info);
    confirmation.hidden=false;panel.inert=true;panel.setAttribute('aria-hidden','true');
    confirmation.querySelector('.natural-confirm-actions [data-confirm="cancel"]').focus();
  }
  confirmation.addEventListener('click',e=>{
    const command=e.target.closest('[data-confirm]')?.dataset.confirm;
    if(e.target===confirmation||command==='cancel'){closeConfirmation();return;}
    if(command!=='accept'||!pending)return;
    const info=previewMeatHarvest(getState(),pending.zone,pending.index);
    if(!info.ok||info.id!==pending.id){closeConfirmation();notify('栏位中的动物已变化，请重新选择');return;}
    if(info.status!==pending.shownStatus){setConfirmationCopy(info);notify('产出状态已更新，请确认提示后再收取');return;}
    const {zone,index}=pending;closeConfirmation(false);closeMenus();onRemove(zone,index);
  });
  root.addEventListener('keydown',e=>{
    if(!current)return;
    if(e.key==='Escape'&&(pending||menuIndex!==null||pickerIndex!==null)){
      e.preventDefault();e.stopImmediatePropagation();pending?closeConfirmation():closeMenus();return;
    }
    if(e.key!=='Tab')return;
    const scope=pending?confirmation:panel;
    const buttons=[...scope.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(b=>b.getClientRects().length&&!b.closest('[hidden]'));
    const first=buttons[0],last=buttons.at(-1);if(!first)return;
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  },true);
  list.addEventListener('click',e=>{
    if(!current)return;
    const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
    const index=Number(button.dataset.index);
    switch(button.dataset.action){
      case 'feed':onFeed(current,index);break;
      case 'collect':onCollect(current,index);break;
      case 'add':{
        const owned=Object.values(ANIMALS).filter(a=>a.zone===current&&getState().stock[a.id]>0);
        if(owned.length>1){const wasOpen=pickerIndex===index;closeMenus();if(!wasOpen){pickerIndex=index;list.querySelector(`[data-picker="${index}"]`).hidden=false;button.setAttribute('aria-expanded','true');}}
        else onAdd(current,index);
        break;
      }
      case 'place':closeMenus();onPlace(current,index,button.dataset.kind);break;
      case 'trade':onTrade(index);break;
      case 'meat':openConfirmation(index);break;
      case 'other':{
        const wasOpen=menuIndex===index;closeMenus();
        if(!wasOpen){menuIndex=index;button.setAttribute('aria-expanded','true');list.querySelector(`[data-more="${index}"]`).hidden=false;}
        break;
      }
    }
  });
  document.addEventListener('click',e=>{if(current&&!pending&&!e.target.closest('[data-action="other"],[data-action="add"],.natural-more-menu,.natural-stock-picker'))closeMenus();});

  function updateTimers(){
    if(!penCopy[current])return;
    const s=getState();
    list.querySelectorAll('[data-timer]').forEach(el=>{
      const v=getOccupantView(s.pens[current][Number(el.dataset.timer)]);
      el.textContent=`剩余 ${formatMs(v.remainingMs)}`;
    });
    list.querySelectorAll('[data-growth]').forEach(el=>{const v=getOccupantView(s.pens[current][Number(el.dataset.growth)]);el.style.width=`${v.progress*100}%`;el.parentElement.setAttribute('aria-valuenow',String(Math.round(v.progress*100)));});
    if(pending){const info=previewMeatHarvest(s,pending.zone,pending.index);if(!info.ok||info.id!==pending.id){closeConfirmation();notify('栏位状态已变化，请重新选择');}else setConfirmationCopy(info);}
  }
  function animalCard(s,o,index,zone){
    const copy=penCopy[zone],pond=zone==='pond',kinds=Object.values(ANIMALS).filter(a=>a.zone===zone);
    const prefix=`<div class="natural-card-top"><span class="slot-number">${String(index+1).padStart(2,'0')} 号${pond?'养殖位':'栏位'}</span>`;
    if(index>=slotCount(s.level))return `<article class="animal-slot natural-card natural-locked">${prefix}</div><div class="empty-portrait">⌑</div><h3>尚未解锁</h3><p>Lv.${slotUnlockLevel(index)} 解锁栏位</p></article>`;
    if(!o){
      const stock=kinds.reduce((n,a)=>n+(s.stock[a.id]||0),0);
      const picker=pond?`<div class="natural-stock-picker" data-picker="${index}" hidden><strong>选择鱼苗</strong>${kinds.map(a=>`<button type="button" data-action="place" data-index="${index}" data-kind="${a.id}" ${s.stock[a.id]>0?'':'disabled'}><img src="assets/animals/${a.id}-0.webp" alt=""><span>${a.name}</span><small>×${s.stock[a.id]||0}</small></button>`).join('')}</div>`:'';
      return `<article class="animal-slot natural-card natural-empty" data-slot="${index}">${prefix}<span class="natural-state empty">${pond?'空位':'空栏'}</span></div><div class="empty-portrait">＋</div><h3>等待${copy.name}${pond?'入塘':'入住'}</h3><p>${copy.young}库存 ${stock}${pond?' · 可选择品种':''}</p><div class="natural-card-action">${action(pond?'放入鱼苗':`放入${copy.name}`,'add',index,'aria-expanded="false"')}</div>${picker}</article>`;
    }
    const v=getOccupantView(o),status={ready:'待收取',growing:'生产中',hungry:'待喂食'}[v.status];
    const production=v.status==='ready'?`<div class="natural-production${Object.keys(v.outputs).length>1?' multiple':''}">${Object.entries(v.outputs).map(([k,n])=>`<span class="natural-output">${art(k)}<strong>${PRODUCTS[k].name} ×${n}</strong></span>`).join('')}</div>`
      :v.status==='hungry'?`<div class="natural-production">${art('feed')}<strong>饲料 ×1</strong></div>`
      :`<div class="natural-production growing"><span data-timer="${index}">剩余 ${formatMs(v.remainingMs)}</span><div class="natural-progress" role="progressbar" aria-label="生产进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v.progress*100)}"><i data-growth="${index}" style="width:${v.progress*100}%"></i></div></div>`;
    const primary=v.status==='growing'?'<span class="natural-wait">耐心等待</span>':action(v.status==='ready'?copy.collect:pond?'投喂':'喂食',v.status==='ready'?'collect':'feed',index);
    const secondary=copy.meat?`<button type="button" class="natural-other" data-action="other" data-index="${index}" aria-expanded="false" aria-controls="${zone}-more-${index}">其他操作 <span>···</span></button><div class="natural-more-menu" id="${zone}-more-${index}" data-more="${index}" hidden><button type="button" data-action="meat" data-index="${index}">收取${PRODUCTS[copy.meat].name} <span>›</span></button><p>收取后，${copy.name}将离开${ZONE_NAMES[zone]}</p></div>`:`<p class="natural-release-note">收取后${pond?'腾出养殖位，可再放入鱼苗':'腾出栏位，可再放入幼畜'}</p>`;
    return `<article class="animal-slot natural-card${pond?' natural-fish-card':''}" data-slot="${index}">${prefix}<span class="natural-state ${v.status}">${status}</span></div><div class="animal-portrait"><img src="assets/animals/${o.kind}-0.webp" alt="${v.animal.name}">${pond?`<span class="natural-species">${v.animal.name.replace('苗','')}</span>`:''}</div>${production}<div class="natural-card-action">${primary}</div>${secondary}</article>`;
  }
  function marketCard(s,c,index){
    if(!c)return '<article class="animal-slot natural-card natural-empty natural-customer"><div class="empty-portrait">⌛</div><h3>客人在路上</h3><p>稍后会有新的客人到来</p></article>';
    const item=CROPS[c.wantId]||PRODUCTS[c.wantId],owned=s.inventory[c.wantId]||0,ready=owned>=c.qty;
    return `<article class="animal-slot natural-card natural-customer" data-order="${index}"><div class="natural-customer-head"><div class="customer-portrait"><img src="assets/market/${c.variant}.webp" alt="${customerNames[c.variant]||'客人'}"></div><div><h3>${customerNames[c.variant]||'客人'}</h3><span class="natural-state ${ready?'ready':'hungry'}">${ready?'已备齐':`还差 ${c.qty-owned} 个`}</span>${c.generous?'<span class="natural-generous">豪客</span>':''}</div></div><div class="natural-demand">${art(c.wantId)}<div><strong>${item.name}</strong><p>已有 <b>${owned}</b> / 需要 <b>${c.qty}</b></p></div></div><div class="natural-price"><span>交易奖励</span><strong>🪙 ${c.offer}</strong></div><div class="natural-card-action">${action(ready?'交付':'货物不足','trade',index,ready?'':'disabled')}</div></article>`;
  }
  function render(id){
    if(!PEN_ZONES.includes(id)&&id!=='market'){close();return false;}
    const s=getState(),opened=current!==id||root.hidden;
    if(opened){scrolling.stop();closeConfirmation(false);closeMenus();returnFocus=document.activeElement;current=id;signature='';}
    root.classList.add('natural-dialog');root.dataset.zone=id;root.hidden=false;footer.hidden=false;
    const next=id!=='market'?JSON.stringify([id,s.level,s.stock,s.inventory.feed,s.pens[id].map(o=>o?[o.id,o.kind,o.fedAt,getOccupantView(o).status]:null)])
      :JSON.stringify([id,s.market.customers,s.market.customers.map(c=>c?s.inventory[c.wantId]:0)]);
    if(signature===next){updateTimers();return true;}
    signature=next;
    const offset=opened?0:list.scrollLeft,active=document.activeElement,focusAction=active?.dataset.action,focusIndex=active?.dataset.index;
    buy.hidden=id==='market';inventory.hidden=id==='market';
    title.innerHTML=id!=='market'?`<img src="assets/animals/${penCopy[id].kind}-0.webp" alt=""><span>${ZONE_NAMES[id]}<small>${penCopy[id].subtitle}</small></span>`:'<span class="natural-heading-icon" aria-hidden="true">🧺</span><span>集市<small>带上收获，和客人交易</small></span>';
    list.className=(id==='market'?'market-slots natural-market-list':'natural-chicken-list')+' free-horizontal-scroll';
    if(id!=='market'){
      inventory.innerHTML=`${itemCount('feed',s.inventory.feed)}<span>饲料</span>`;
      list.innerHTML=s.pens[id].map((o,i)=>animalCard(s,o,i,id)).join('');
      footer.innerHTML=`<span>${id==='pond'?'已养殖':'已入住'} ${s.pens[id].filter(Boolean).length} ${id==='pond'?'条':'只'} · 可用 ${slotCount(s.level)} ${id==='pond'?'位':'栏'}</span><span>左右滑动，查看更多${id==='pond'?'养殖位':'栏位'}</span>`;
    }else{
      inventory.replaceChildren();list.innerHTML=s.market.customers.map((c,i)=>marketCard(s,c,i)).join('');
      footer.innerHTML=`<span>${s.market.customers.filter(Boolean).length} 位客人正在等待</span><span>左右滑动，查看更多客人</span>`;
    }
    list.scrollLeft=offset;
    if(menuIndex!==null&&s.pens[id]?.[menuIndex]){
      list.querySelector(`[data-more="${menuIndex}"]`)?.removeAttribute('hidden');
      list.querySelector(`[data-action="other"][data-index="${menuIndex}"]`)?.setAttribute('aria-expanded','true');
    }
    if(pickerIndex!==null&&id==='pond'&&!s.pens.pond[pickerIndex]){
      list.querySelector(`[data-picker="${pickerIndex}"]`)?.removeAttribute('hidden');
      list.querySelector(`[data-action="add"][data-index="${pickerIndex}"]`)?.setAttribute('aria-expanded','true');
    }
    if(opened)document.getElementById('btn-close-animal').focus({preventScroll:true});
    else if(!pending&&focusAction)list.querySelector(`[data-action="${focusAction}"][data-index="${focusIndex}"]`)?.focus({preventScroll:true});
    updateTimers();return true;
  }
  return {render,close};
}
