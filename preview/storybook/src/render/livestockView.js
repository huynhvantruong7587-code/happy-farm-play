import { ZONE_NAMES } from '../game/config.js?v=587b0539db14';
import { getOccupantView } from '../game/systems/livestock.js?v=587b0539db14';
import { drawAnchored, drawSprite } from './assets.js?v=587b0539db14';
import { fillRoundRect as rect, drawText } from './draw.js?v=587b0539db14';

import { MAP_LAYOUT } from './mapLayout.js?v=587b0539db14';
export const ANIMAL_BUBBLE_RADIUS=62;
// Keep bubbles readable when the whole map is on screen (world size grows as zoom drops).
export const ANIMAL_BUBBLE_MIN_SCREEN=24;
export function bubbleWorldRadius(zoom=1){
  const z=Math.max(0.05, Number(zoom)||1);
  const screen=Math.min(ANIMAL_BUBBLE_RADIUS*1.2, Math.max(ANIMAL_BUBBLE_MIN_SCREEN, ANIMAL_BUBBLE_RADIUS*z));
  return screen/z;
}
const SCALE=MAP_LAYOUT.ANIMAL_SCALE;
export function zoneAttachment(z,key) {const p=z[key];return p?{x:p[0],y:p[1]}:null;}
export function walkPolygon(z) {return z.walk || [];}
function inside(x,y,poly) {
  let yes=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const [ax,ay]=poly[j],[bx,by]=poly[i],dx=bx-ax,dy=by-ay;
    if(Math.abs((x-ax)*dy-(y-ay)*dx)<1e-7 && x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7&&y>=Math.min(ay,by)-1e-7&&y<=Math.max(ay,by)+1e-7)return true;
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)yes=!yes;
  }
  return yes;
}
export function pointInWalk(x,y,z) {return inside(x,y,walkPolygon(z));}
function project(x,y,poly) {
  if(inside(x,y,poly))return {x,y};
  let best=null,distance=Infinity;
  for(let i=0;i<poly.length;i++) {
    const [ax,ay]=poly[i],[bx,by]=poly[(i+1)%poly.length],dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy))),px=ax+t*dx,py=ay+t*dy,d=(x-px)**2+(y-py)**2;
    if(d<distance){distance=d;best={x:px,y:py};}
  }
  return best;
}
// Erode the convex water polygon by the fish silhouette, including draw bobbing.
function movementPolygon(z) {
  const water=walkPolygon(z);if(z.id!=='pond')return water;
  let poly=water;
  for(let i=0;i<water.length;i++) {
    const [ax,ay]=water[i],[bx,by]=water[(i+1)%water.length],dx=bx-ax,dy=by-ay;
    const distance=([x,y])=>dx*(y-ay)-dy*(x-ax)-Math.abs(dy)*44*SCALE-Math.abs(dx)*28*SCALE;
    const next=[];
    for(let j=0;j<poly.length;j++) {
      const a=poly[j],b=poly[(j+1)%poly.length],da=distance(a),db=distance(b);
      if(da>=0)next.push(a);
      if((da>=0)!==(db>=0)){const t=da/(da-db);next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    poly=next;
  }
  return poly;
}
export function makeZones() {
  return Object.values(MAP_LAYOUT.ZONES).map(source=>{
    const z={...source,label:ZONE_NAMES[source.id] || (source.id==='house'?'农场主小屋':'饲料加工厂')};
    const b=z.bounds;z.cx=b.x+b.w/2;z.cy=b.y+b.h/2;
    const poly=movementPolygon(z);
    z.slots=(source.slots || []).map(s=>({...s}));
    if(z.id!=='pond'||!poly.length)return z;
    const center=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);
    const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    z.yard={rx:(Math.max(...xs)-Math.min(...xs))/2,ry:(Math.max(...ys)-Math.min(...ys))/2};
    return z;
  });
}
export function zonePolygon(z) {return z.hit;}
export function pointInZone(x,y,z) {return inside(x,y,z.hit);}
function polygonArea(poly) {return Math.abs(poly.reduce((sum,[x,y],i)=>{const [nx,ny]=poly[(i+1)%poly.length];return sum+x*ny-y*nx;},0))/2;}
export function hitTestZone(x,y,layout) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return layout.zones.filter(z=>pointInZone(x,y,z)).sort((a,b)=>polygonArea(a.hit)-polygonArea(b.hit))[0]||null;
}
export function occupantPosition(o,z,slot,t) {
  let seed=0;for(const c of o.id)seed=(seed*31+c.charCodeAt(0))>>>0;
  const phase=seed%628/100,cycle=t/9000+phase,part=cycle%1,paused=part>.72;
  const poly=movementPolygon(z),j=z.yard;
  if(MAP_LAYOUT.STYLE==='storybook'){
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const px=slot.cx+(reduced?0:Math.sin(cycle*.8)*24),py=slot.cy+(reduced?0:Math.cos(cycle*.6)*12);
    return {...(z.id==='pond'?project(px,py,poly):{x:px,y:py}),flip:Math.cos(cycle*.8)<0,paused};
  }
  if(z.id==='pond'){
    return {...project(slot.cx,slot.cy,poly),flip:false,paused:false};
  }
  return {x:slot.cx,y:slot.cy+Math.sin(t/650+phase)*.8,flip:false,paused};
}
export function livestockViews(state,layout,t,now=Date.now()) {
  return layout.zones.filter(z=>z.walk && state.pens[z.id]).flatMap(z=>state.pens[z.id]
    .map((o,index)=>({o,index})).filter(v=>v.o).slice(0,MAP_LAYOUT.STYLE==='storybook'?8:4).map(({o,index},visual)=>({zoneId:z.id,index,
      ...getOccupantView(o,now),...occupantPosition(o,z,z.slots[visual],t)})));
}
export function hitTestLivestock(x,y,layout,views) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return [...views].filter(v=>v.status!=='empty').sort((a,b)=>b.y-a.y).find(v=>{const {width,height}=animalSize(v.kind,v.zoneId==='pond');return Math.abs(x-v.x)<=width/2 && y>=v.y-(v.zoneId==='pond'?height/2:height) && y<=v.y+(v.zoneId==='pond'?height/2:0);})||null;
}
// One roof reminder per livestock building, sharing drawing and hit geometry.
// A bubble stays on its own roof. It is never slid over another building or stacked
// at a screen edge. Off-screen roofs are omitted, or shown as a tiny edge pip when
// the roof is only just out of view. There is no leader line.
function zoneSign(zoneId){const z=MAP_LAYOUT.ZONES[zoneId];return z&&z.labelBox?z.labelBox:null;}
function bubbleFits(x,y,r,layout,pad){
  const {camera,cssW,cssH}=layout,z=Math.max(0.05,camera.zoom||1);
  const sx=x*z+camera.x,sy=y*z+camera.y,sr=r*z;
  return sx-sr>=pad.l && sx+sr<=cssW-pad.r && sy-sr>=pad.t && sy+sr<=cssH-pad.b;
}
function circleHitsBox(x,y,r,box,pad=10){
  if(!box)return false;
  const cx=Math.max(box.x,Math.min(x,box.x+box.w)),cy=Math.max(box.y,Math.min(y,box.y+box.h));
  return Math.hypot(x-cx,y-cy)<r+pad;
}
function clearsSign(x,y,r,zoneId){return !circleHitsBox(x,y,r,zoneSign(zoneId),10);}
function placeRoofBubble(zoneId,r,layout){
  const z=MAP_LAYOUT.ZONES[zoneId],roof=z.roof||{x:z.bounds.x+z.bounds.w/2,y:z.bounds.y};
  const preferred={x:roof.x,y:roof.y-r-32};
  if(!layout||layout.cssW==null||!layout.camera)return preferred;
  const pad={l:56,r:76,t:MAP_LAYOUT.ENVIRONMENT?8:44,b:8};
  const sign=zoneSign(zoneId);
  const maxCenterY=sign?sign.y-r-16:roof.y+160;
  const onOwnRoof=y=>Math.abs(preferred.x-roof.x)<=180 && y>=roof.y-r-36 && y<=maxCenterY;
  if(bubbleFits(preferred.x,preferred.y,r,layout,pad)&&clearsSign(preferred.x,preferred.y,r,zoneId))return preferred;
  // Lower the bubble along this same roof (never slide sideways onto another building).
  const {camera}=layout,zoom=Math.max(0.05,camera.zoom||1);
  const step=8/zoom;
  for(let y=preferred.y+step;y<=maxCenterY;y+=step){
    if(onOwnRoof(y)&&clearsSign(preferred.x,y,r,zoneId)&&bubbleFits(preferred.x,y,r,layout,pad))return {x:preferred.x,y};
  }
  return null;
}
function placeEdgePip(zoneId,layout,existing){
  if(!layout||layout.cssW==null||!layout.camera)return null;
  const z=MAP_LAYOUT.ZONES[zoneId],roof=z.roof||{x:z.bounds.x+z.bounds.w/2,y:z.bounds.y};
  const {camera,cssW,cssH}=layout,zoom=Math.max(0.05,camera.zoom||1);
  const worldL=-camera.x/zoom,worldT=-camera.y/zoom,worldR=(cssW-camera.x)/zoom,worldB=(cssH-camera.y)/zoom;
  const b=z.bounds;
  if(b.x+b.w<worldL||b.x>worldR||b.y+b.h<worldT||b.y>worldB)return null;
  const pad={l:56,r:76,t:44,b:8};
  let sx=roof.x*zoom+camera.x,sy=roof.y*zoom+camera.y;
  // Only hint when the roof is just off the safe viewport, not across the map.
  const near=48;
  if(!(sx>=-near&&sx<=cssW+near&&sy>=-near&&sy<=cssH+near))return null;
  const er=11/zoom;
  const esr=er*zoom;
  sx=Math.max(pad.l+esr,Math.min(cssW-pad.r-esr,sx));
  sy=Math.max(pad.t+esr,Math.min(cssH-pad.b-esr,sy));
  const x=(sx-camera.x)/zoom,y=(sy-camera.y)/zoom;
  // Hide rather than cover this building's name sign or stack on another bubble.
  if(!clearsSign(x,y,er,zoneId))return null;
  if(Math.hypot(x-roof.x,y-roof.y)>260)return null;
  for(const o of existing){
    if(Math.hypot(x-o.x,y-o.y)<er+o.r+8)return null;
  }
  return {x,y,r:er};
}
export function animalBubbles(views,t=0,state=null,zoom=1,layout=null) {
  if(state)views=Object.entries(state.pens).flatMap(([zoneId,slots])=>slots.map((o,index)=>({...getOccupantView(o),zoneId,index})).filter(v=>v.status!=='empty'));
  const icons={chicken:'egg',sheep:'wool',pig:'pork',cow:'beef',pond:'fish'},bubbles=[];
  const r=bubbleWorldRadius(zoom);
  for(const zoneId of Object.keys(icons)){
    const group=views.filter(v=>v.zoneId===zoneId),ready=group.filter(v=>v.status==='ready'),hungry=group.filter(v=>v.status==='hungry');
    const active=ready.length?ready:hungry;
    if(!active.length){
      if(MAP_LAYOUT.STYLE==='storybook'&&layout?.previewHints){
        const roof=MAP_LAYOUT.ZONES[zoneId].roof,placed=placeRoofBubble(zoneId,r,layout);
        if(placed)bubbles.push({zoneId,index:null,aggregated:false,action:'open-zone',label:'提示位置预览',icon:null,zoom,...placed,r,targetX:roof.x,targetY:roof.y-12});
      }
      continue;
    }
    const z=MAP_LAYOUT.ZONES[zoneId],roof=z.roof || {x:z.bounds.x+z.bounds.w/2,y:z.bounds.y};
    const icon=`icons/${ready.length?icons[zoneId]:'feed'}.webp`;
    const base={zoneId,index:null,aggregated:true,action:'open-zone',count:active.length,label:ready.length?'收获':'喂饲料',icon,zoom,targetX:roof.x,targetY:roof.y-12};
    const placed=placeRoofBubble(zoneId,r,layout);
    if(placed){
      bubbles.push({...base,...placed,r});
      continue;
    }
    // Tests and callers without a layout still get a roof-anchored bubble.
    if(!layout||layout.cssW==null||!layout.camera){
      bubbles.push({...base,x:roof.x,y:roof.y-r-32,r});
      continue;
    }
    // The pond uses the same full speech bubble as the pens, never a tiny edge icon.
    const pip=MAP_LAYOUT.STYLE==='storybook'&&zoneId==='pond'?null:placeEdgePip(zoneId,layout,bubbles);
    if(pip)bubbles.push({...base,...pip,edge:true,aggregated:false});
  }
  if(MAP_LAYOUT.STYLE==='storybook'&&state){
    const events=state.notifications||{};
    const tradeReady=state.market?.customers?.some(c=>c&&(state.inventory[c.wantId]||0)>=c.qty);
    for(const zoneId of ['house','shop','store','market','mill']){
      if(zoneId==='market'?!tradeReady&&!layout?.previewHints:!events[zoneId]&&!layout?.previewHints)continue;
      const roof=MAP_LAYOUT.ZONES[zoneId].roof,placed=placeRoofBubble(zoneId,r,layout);
      if(placed)bubbles.push({zoneId,index:null,aggregated:false,action:'open-zone',label:'有待处理事项',icon:null,zoom,...placed,r,targetX:roof.x,targetY:roof.y-12});
    }
  }
  return bubbles;
}
export function hitTestAnimalBubble(x,y,layout,bubbles) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return [...bubbles].reverse().find(b=>MAP_LAYOUT.STYLE==='storybook'&&!b.edge
    ? Math.abs(x-b.x)<=b.r*1.4&&Math.abs(y-b.y)<=b.r*.85
    : Math.hypot(x-b.x,y-b.y)<=b.r)||null;
}
function drawAnimalBubble(ctx,b) {
  if(MAP_LAYOUT.STYLE==='storybook'&&!b.edge){drawSpeechBubble(ctx,b);return;}
  const z=Math.max(0.05, Number(b.zoom)||1);
  const screen=b.r*z;
  const s=b.r/62;
  ctx.save();ctx.fillStyle='#f7e7c3';ctx.strokeStyle='#b38a58';ctx.lineWidth=Math.max(1.1,2.4*s);
  ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(255,250,228,.75)';ctx.lineWidth=Math.max(0.7,1.5*s);
  ctx.beginPath();ctx.arc(b.x,b.y,Math.max(b.r-4*s,b.r*0.86),0,Math.PI*2);ctx.stroke();
  const icon=Math.min(screen*(b.edge?1.15:1.35), b.edge?18:36)/z;
  drawSprite(ctx,b.icon,b.x-icon/2,b.y-icon*(b.edge?0.5:0.58),icon,icon);
  if(b.aggregated && !b.edge){
    const tw=Math.min(Math.max(13, screen*0.55), 22)/z, th=tw*1.15, bw=tw*2.05;
    rect(ctx,b.x-bw/2,b.y+b.r*0.22,bw,th,th*0.4,'#f7e7c3');
    ctx.strokeStyle='#b38a58';ctx.stroke();
    drawText(ctx,`×${b.count}`,b.x,b.y+b.r*0.22+th*0.52,{size:tw,color:'#603c20',weight:'800'});
  }
  ctx.restore();
}
function drawSpeechBubble(ctx,b){
  const x=b.x,y=b.y,r=b.r,w=r*2.8,h=r*1.5;
  ctx.save();ctx.fillStyle='#fff0cb';ctx.strokeStyle='#ab783e';ctx.lineWidth=2/Math.max(.15,b.zoom);
  ctx.shadowColor='#76542522';ctx.shadowBlur=6/Math.max(.15,b.zoom);ctx.shadowOffsetY=2/Math.max(.15,b.zoom);
  ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,h*.43);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.beginPath();ctx.moveTo(x-15,y+h/2-2);ctx.lineTo(x,y+h/2+24);ctx.lineTo(x+17,y+h/2-2);ctx.fill();ctx.stroke();
  if(b.icon){
    const s=h*.64;drawSprite(ctx,b.icon,x-w*.35,y-s/2,s,s);
    drawText(ctx,`×${b.count}`,x+w*.19,y,{size:h*.46,color:'#68401f',weight:'800'});
  }else drawText(ctx,'!',x,y,{size:h*.72,color:'#cb7b24',weight:'800'});
  ctx.restore();
}
export function animalSize(kind,fish=false) {
  return {width:(fish?88:kind==='chicken'?72:kind==='cow'?150:83)*SCALE,
    height:(fish?88*.6:kind==='chicken'?100:kind==='cow'?112:92)*SCALE};
}
function animal(ctx,v,t) {
  const fish=v.zoneId==='pond',frame=fish?Math.floor(t/450)%2:v.paused?1:0;
  const {width,height}=animalSize(v.kind,fish);
  ctx.save();ctx.translate(v.x,v.y+(fish?Math.sin(t/350+v.index)*1.5*SCALE:0));ctx.scale(v.flip?-1:1,1);
  const path=`animals/${v.kind}-${frame}.webp`;
  if(fish)drawSprite(ctx,path,-width/2,-width*.3,width,width*.6);
  else drawAnchored(ctx,path,0,0,width,height);
  ctx.restore();
}
export function drawLivestock(ctx,state,layout,t,now) {
  const views=livestockViews(state,layout,t,now);
  for(const v of views.filter(v=>v.status!=='empty').sort((a,b)=>a.y-b.y))animal(ctx,v,t);
  for(const front of Object.values(MAP_LAYOUT.FRONTS))drawSprite(ctx,front.file,front.x,front.y,front.w,front.h);
  for(const b of animalBubbles(views,t,state,layout.camera.zoom,layout))drawAnimalBubble(ctx,b);
  return views;
}
