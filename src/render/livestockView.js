import { ZONE_NAMES } from '../game/config.js';
import { getOccupantView } from '../game/systems/livestock.js';
import { drawAnchored, drawSprite } from './assets.js';
import { fillRoundRect as rect, drawText } from './draw.js';

import { MAP_LAYOUT } from './mapLayout.js';
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
  if(z.id==='pond'){
    return {...project(slot.cx,slot.cy,poly),flip:false,paused:false};
  }
  return {x:slot.cx,y:slot.cy+Math.sin(t/650+phase)*.8,flip:false,paused};
}
export function livestockViews(state,layout,t,now=Date.now()) {
  return layout.zones.filter(z=>z.walk && state.pens[z.id]).flatMap(z=>state.pens[z.id]
    .map((o,index)=>({o,index})).filter(v=>v.o).slice(0,4).map(({o,index},visual)=>({zoneId:z.id,index,
      ...getOccupantView(o,now),...occupantPosition(o,z,z.slots[visual],t)})));
}
export function hitTestLivestock(x,y,layout,views) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return [...views].filter(v=>v.status!=='empty').sort((a,b)=>b.y-a.y).find(v=>{const {width,height}=animalSize(v.kind,v.zoneId==='pond');return Math.abs(x-v.x)<=width/2 && y>=v.y-(v.zoneId==='pond'?height/2:height) && y<=v.y+(v.zoneId==='pond'?height/2:0);})||null;
}
// One roof reminder per livestock building, sharing drawing and hit geometry.
export function animalBubbles(views,t=0,state=null) {
  if(state)views=Object.entries(state.pens).flatMap(([zoneId,slots])=>slots.map((o,index)=>({...getOccupantView(o),zoneId,index})).filter(v=>v.status!=='empty'));
  const icons={chicken:'egg',sheep:'wool',pig:'pork',cow:'beef',pond:'fish'},bubbles=[];
  for(const zoneId of Object.keys(icons)){
    const group=views.filter(v=>v.zoneId===zoneId),ready=group.filter(v=>v.status==='ready'),hungry=group.filter(v=>v.status==='hungry');
    const active=ready.length?ready:hungry;if(!active.length)continue;
    const z=MAP_LAYOUT.ZONES[zoneId],roof=z.roof || {x:z.bounds.x+z.bounds.w/2,y:z.bounds.y},r=44;
    const b={zoneId,index:null,aggregated:true,action:'open-zone',count:active.length,label:ready.length?'收获':'喂饲料',icon:`icons/${ready.length?icons[zoneId]:'feed'}.webp`,x:roof.x,y:roof.y-r-32,r,targetX:roof.x,targetY:roof.y-12};
    for(const other of bubbles)if(Math.abs(b.y-other.y)<r+other.r+8 && Math.abs(b.x-other.x)<r+other.r+12)b.x=other.x+r+other.r+12;
    bubbles.push(b);
  }
  return bubbles;
}
export function hitTestAnimalBubble(x,y,layout,bubbles) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return [...bubbles].reverse().find(b=>Math.hypot(x-b.x,y-b.y)<=b.r)||null;
}
function drawAnimalBubble(ctx,b) {
  ctx.save();ctx.fillStyle='#f7e7c3';ctx.strokeStyle='#b38a58';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(b.x-7,b.y+b.r-6);ctx.lineTo(b.x+Math.max(-35,Math.min(35,b.targetX-b.x)),b.targetY);ctx.lineTo(b.x+8,b.y+b.r-6);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(255,250,228,.75)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(b.x,b.y,b.r-4,0,Math.PI*2);ctx.stroke();
  drawSprite(ctx,b.icon,b.x-24,b.y-30,48,48);
  if(b.aggregated){
    rect(ctx,b.x-20,b.y+15,40,22,9,'#f7e7c3');
    ctx.strokeStyle='#b38a58';ctx.stroke();
    drawText(ctx,`×${b.count}`,b.x,b.y+26,{size:16,color:'#603c20',weight:'800'});
  }
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
  for(const b of animalBubbles(views,t,state))drawAnimalBubble(ctx,b);
  for(const s of MAP_LAYOUT.SIGNS){
    ctx.save();ctx.translate(s.x+s.w/2,s.y+s.h/2);ctx.rotate((s.angle||0)*Math.PI/180);
    const len=Math.max(1,[...s.text].length);
    const heightFrac=s.h<50?0.84:0.48;
    let size=Math.min(s.h*heightFrac,(s.w*.86)/len*1.05);
    size=Math.max(9,Math.floor(size));
    ctx.font=`700 ${size}px FarmSign`;
    while(ctx.measureText(s.text).width>s.w*.90 && size>9){size--;ctx.font=`700 ${size}px FarmSign`;}
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#e8cda0';ctx.fillText(s.text,-1,-1);
    ctx.fillStyle='#2a160c';ctx.fillText(s.text,1,1);
    ctx.fillStyle='#4a2c16';ctx.fillText(s.text,0,0);
    ctx.restore();
  }
  return views;
}
