import {loadState,saveState} from './game/save.js?v=167e955d2030';
import {bindLandscape,canvasInput} from './ui/inputMap.js?v=167e955d2030';
import {createRenderer} from './render/canvas.js?v=167e955d2030';
import {farmerFacing} from './render/farmerView.js?v=167e955d2030';
import {itemIcon} from './ui/icons.js?v=167e955d2030';
import {toast} from './ui/toast.js?v=167e955d2030';
import {RESTAURANT_REPAIR,restaurantRepairView,repairRestaurant} from './game/systems/town.js?v=167e955d2030';
import {loadTownAssets,createTownScene} from './town/scene.js?v=167e955d2030';
import {WORLD,BUILDING,DOOR,walkingPath} from './town/world.js?v=167e955d2030';

const state=loadState(),canvas=document.getElementById('town-canvas'),renderer=createRenderer(canvas),dialog=document.getElementById('town-dialog');
const player={x:1000,y:1370},camera={x:0,y:0,zoom:.35};let scene,path=[],facing='n',previous=0,repairStarted=0,returnFocus=null;
const world=p=>({x:(p.x-camera.x)/camera.zoom,y:(p.y-camera.y)/camera.zoom});
function home(whole=false){
  const {cssW:w,cssH:h}=renderer.size;camera.zoom=whole?Math.min(w/2500,h/1700):Math.min(.6,Math.max(.14,Math.min(w/2400,h/1500)));
  camera.x=w/2-1150*camera.zoom;camera.y=h/2-760*camera.zoom;
}
function clamp(){camera.zoom=Math.max(.12,Math.min(1.1,camera.zoom));camera.x=Math.max(-2400*camera.zoom+renderer.size.cssW*.4,Math.min(renderer.size.cssW*.6,camera.x));camera.y=Math.max(-1600*camera.zoom+renderer.size.cssH*.35,Math.min(renderer.size.cssH*.65,camera.y));}
function closeDialog(){dialog.hidden=true;canvas.inert=false;document.querySelector('.town-hud').inert=false;document.querySelector('.town-tools').inert=false;if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
function openDialog(){
  path=[];returnFocus=document.activeElement;const v=restaurantRepairView(state);
  document.getElementById('town-dialog-title').textContent=v.repaired?'餐馆的灯又亮了':'让小餐馆重新开门';
  const requirements=[{id:'coins',name:'金币',owned:state.coins,need:v.coins},...v.materials.map(m=>({...m,name:m.id==='wheat'?'小麦':'鸡蛋'}))];
  document.getElementById('town-dialog-content').innerHTML=v.repaired?
    `<p class="town-intro">整好的炉灶、干净的桌椅，还有门前新开的花。这里又像一间餐馆了。</p><div class="town-owner-message"><strong>店主 · 阿禾</strong>“谢谢你把这里重新照顾起来。第一篮小麦和鸡蛋已经收好了，等我们备好菜单，就请邻居们来吃顿热饭。”</div><div class="town-dialog-actions"><button class="natural-primary" id="town-finish">去小镇走走</button><a class="town-link" href="index.html?scene=storybook">返回农场</a></div><p class="town-reward-note">餐馆修复已保存。本轮先完成修复与场景试装，料理经营将在后续接入。</p>`:
    `<p class="town-intro">阿禾想重新打开这间歇业的小馆。修好炉灶和门窗，再从农场带来第一篮食材，让这里重新飘起饭香。</p><div class="town-requirements">${requirements.map(m=>`<article class="town-requirement"><span class="req-art">${m.id==='coins'?'🪙':itemIcon(m.id)}</span><strong>${m.name} ×${m.need}</strong><div class="req-owned">拥有 ${m.owned}</div><div class="req-status ${m.owned>=m.need?'ready':''}">${m.owned>=m.need?'已备齐':`还差 ${m.need-m.owned}`}</div></article>`).join('')}</div><div class="town-dialog-actions"><button class="natural-primary" id="town-repair" ${v.ready?'':'disabled'}>${v.ready?'修复餐馆':'还需要准备一些材料'}</button><a class="town-link" href="index.html?scene=storybook">返回农场备材料 ›</a></div><p class="town-reward-note">修复会一次消耗以上金币与物资，完成后开门亮灯、摆好桌椅，店主阿禾会来到门前。</p>`;
  dialog.hidden=false;canvas.inert=true;document.querySelector('.town-hud').inert=true;document.querySelector('.town-tools').inert=true;
  document.getElementById('town-dialog-close').focus({preventScroll:true});
  document.getElementById('town-finish')?.addEventListener('click',closeDialog);
  document.getElementById('town-repair')?.addEventListener('click',()=>{
    const result=repairRestaurant(state);if(!result.ok){toast('还需要准备一些材料');openDialog();return;}
    saveState(state);repairStarted=performance.now();document.getElementById('town-coins').textContent=state.coins;closeDialog();
    toast('餐馆修好了，阿禾来到门前啦',{timeout:3800});
  });
}
document.getElementById('town-dialog-close').onclick=closeDialog;dialog.onclick=e=>{if(e.target===dialog)closeDialog();};
document.addEventListener('keydown',e=>{
  if(dialog.hidden)return;
  if(e.key==='Escape'){e.preventDefault();closeDialog();}
  if(e.key==='Tab'){const bs=[...dialog.querySelectorAll('button:not(:disabled),a')],first=bs[0],last=bs.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
document.getElementById('town-home').onclick=()=>home();document.getElementById('town-overview').onclick=()=>home(true);
const pointers=new Map();let gesture=null;
canvas.addEventListener('pointerdown',e=>{const p=canvasInput(canvas,e.clientX,e.clientY);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);gesture={point:p,x:camera.x,y:camera.y,moved:false};if(pointers.size===2){const a=[...pointers.values()];gesture.distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);gesture.zoom=camera.zoom;gesture.center={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};gesture.anchor=world(gesture.center);gesture.moved=true;}});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;const p=canvasInput(canvas,e.clientX,e.clientY);pointers.set(e.pointerId,p);
  if(pointers.size===2&&gesture.distance){const a=[...pointers.values()],center={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};camera.zoom=Math.max(.12,Math.min(1.1,gesture.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/gesture.distance));camera.x=center.x-gesture.anchor.x*camera.zoom;camera.y=center.y-gesture.anchor.y*camera.zoom;clamp();return;}
  const dx=p.x-gesture.point.x,dy=p.y-gesture.point.y;if(Math.hypot(dx,dy)>6)gesture.moved=true;if(gesture.moved){camera.x=gesture.x+dx;camera.y=gesture.y+dy;clamp();}
});
function finish(e,cancelled=false){
  if(!pointers.has(e.pointerId))return;const moved=gesture?.moved;pointers.delete(e.pointerId);
  if(!cancelled&&!moved&&scene){const p=world(canvasInput(canvas,e.clientX,e.clientY)),b=BUILDING;
    if((p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height)||Math.hypot(p.x-(b.x+b.width*.67),p.y-(b.y-65))<40/camera.zoom||(state.town.restaurant.repaired&&Math.hypot(p.x-1530,p.y-1030)<100))openDialog();
    else path=walkingPath(player,p);
  }gesture=null;if(pointers.size)gesture={point:[...pointers.values()][0],x:camera.x,y:camera.y,moved:true};
}
canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=canvasInput(canvas,e.clientX,e.clientY),a=world(p);camera.zoom*=Math.exp(-e.deltaY*.001);camera.zoom=Math.max(.12,Math.min(1.1,camera.zoom));camera.x=p.x-a.x*camera.zoom;camera.y=p.y-a.y*camera.zoom;clamp();},{passive:false});
bindLandscape(()=>{renderer.resize();home();});
document.getElementById('town-coins').textContent=state.coins;
function frame(now){
  const dt=Math.min(.06,(now-previous)/1000||0);previous=now;
  if(path.length){const to=path[0],dx=to.x-player.x,dy=to.y-player.y,d=Math.hypot(dx,dy),step=Math.min(d,260*dt);facing=farmerFacing(dx,dy);if(d){player.x+=dx/d*step;player.y+=dy/d*step;}if(d<=step)path.shift();}
  renderer.resize();clamp();scene.draw(renderer.ctx,{camera,state,player,walking:path.length>0,facing,time:now,repairedAlpha:repairStarted?Math.min(1,(now-repairStarted)/900):1});requestAnimationFrame(frame);
}
try{scene=createTownScene(await loadTownAssets());document.getElementById('town-loading').hidden=true;document.getElementById('app').dataset.ready='1';home();requestAnimationFrame(frame);}
catch(error){document.getElementById('town-loading').textContent='小镇素材加载失败，请刷新重试';console.error(error);}
window.__TOWN__={getState:()=>JSON.parse(JSON.stringify(state)),getPlayer:()=>({...player,walking:!!path.length}),getCamera:()=>({...camera}),getLayers:()=>({building:BUILDING,rects:scene?.buildingRects}),openRestaurant:openDialog,home,walkTo:p=>{path=walkingPath(player,p);},getDoor:()=>({...DOOR})};
