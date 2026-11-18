const compass=`<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="#f9edca" stroke="#bb985c" stroke-width="1.5"/><path d="m25 10-2 13-9 7 3-13z" fill="#96b75d" stroke="#718e43"/><path d="m25 10-8 7 6 6z" fill="#fff8e4"/><circle cx="20" cy="20" r="2" fill="#99784a"/></svg>`;
export function initNaturalChrome(){
  const app=document.getElementById('app'),nav=document.querySelector('.zone-actions');
  const trigger=document.createElement('button');trigger.type='button';trigger.id='farm-destinations-toggle';trigger.className='natural-map-button';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','farm-destinations');trigger.setAttribute('aria-label','前往农场区域');trigger.innerHTML=compass+'<span>前往</span>';
  nav.id='farm-destinations';nav.hidden=true;nav.setAttribute('aria-label','选择农场区域');nav.before(trigger);
  const head=document.createElement('header');head.innerHTML='<strong>去农场逛逛</strong><button type="button" aria-label="关闭区域菜单">×</button>';nav.prepend(head);
  const grid=document.createElement('div');grid.className='natural-destination-grid';
  nav.querySelectorAll('.zone-jump').forEach(b=>{
    const zone=b.dataset.zone,kind={pond:'crucian',farm:'wheat'}[zone]||zone;
    const icon=['chicken','sheep','cow','pig','pond'].includes(zone)?`<img src="assets/animals/${kind}-0.webp" alt="">`:zone==='farm'?'<img src="assets/crops/wheat-2.webp" alt="">':`<span class="destination-icon" aria-hidden="true">${{market:'🧺',house:'🏡',mill:'🌾'}[zone]}</span>`;
    const label={mill:'饲料坊',house:'小屋'}[zone]||b.querySelector('span').textContent;
    b.innerHTML=icon+`<span>${label}</span>`;grid.append(b);
  });nav.append(grid);
  function closeDestinations(restore=false){nav.hidden=true;trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus({preventScroll:true});}
  trigger.onclick=()=>{const opening=nav.hidden;nav.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(opening)nav.querySelector('.zone-jump').focus({preventScroll:true});};
  head.querySelector('button').onclick=()=>closeDestinations(true);
  nav.addEventListener('click',e=>{if(e.target.closest('.zone-jump'))closeDestinations();});
  document.addEventListener('pointerdown',e=>{if(!nav.contains(e.target)&&!trigger.contains(e.target))closeDestinations();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nav.hidden&&document.getElementById('modal-levelup').classList.contains('hidden')){e.preventDefault();e.stopImmediatePropagation();closeDestinations(true);}},true);
  document.querySelectorAll('.side-actions .tab').forEach(b=>{
    const id=b.dataset.tab,label={shop:'商店',bag:'仓库',more:'更多'}[id];
    b.innerHTML=`<span class="natural-action-icon" aria-hidden="true">${{shop:'🛒',bag:'🧺',more:'✦'}[id]}</span><span>${label}</span>`;
  });
  document.querySelector('.hud-title').innerHTML='<span aria-hidden="true">🌿</span> 开心农场';
  document.querySelector('.hud-coins').setAttribute('aria-label','金币');
  document.querySelector('.hud-xp').setAttribute('aria-label','等级与经验');
  const more=document.getElementById('panel-more'),overlay=document.createElement('div');overlay.className='natural-commerce-overlay';more.before(overlay);overlay.append(more);more.classList.add('natural-commerce');more.setAttribute('aria-modal','true');
  more.querySelector('.sheet-head').innerHTML='<h2><span class="commerce-heading-icon">🌿</span><span>农场手记<small>种田、养殖与慢慢长大的日常</small></span></h2><button type="button" class="sheet-close" aria-label="关闭农场手记">×</button>';
  overlay.addEventListener('click',e=>{if(e.target===overlay)more.querySelector('.sheet-close').click();});
  const howto=more.querySelector('.howto');howto.innerHTML=[
    '拖动地图探索农场，用“前往”菜单快速找到各个区域。',
    '商店购买种子和幼苗；点农田进入耕作，点空地种植，点成熟作物收获。',
    '在养殖区放入幼畜或鱼苗，喂食后开始生长，离线也会继续计时。',
    '小鸡可反复产蛋，小羊可反复产毛，每轮重新喂食；“其他操作”中收肉会移除动物。',
    '猪、牛和鱼收取后会腾出位置。收获放入仓库，再带去集市交付订单。',
    '饲料可在商店购买，也可用小麦×2或玉米×1制作；收获经验可升级解锁更多内容。',
  ].map(t=>`<li>${t}</li>`).join('');
  more.querySelectorAll('.more-block').forEach(block=>{if(block.querySelector('.coming-list,#coming-trade'))block.hidden=true;});
  const levelup=document.getElementById('modal-levelup');levelup.classList.add('natural-levelup');
  levelup.addEventListener('keydown',e=>{
    if(e.key==='Tab'){e.preventDefault();document.getElementById('btn-close-levelup').focus();}
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();document.getElementById('btn-close-levelup').click();}
  });
  return {closeDestinations};
}
