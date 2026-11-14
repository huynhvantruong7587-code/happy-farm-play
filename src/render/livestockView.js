import { ZONE_NAMES, PEN_SIZES } from '../game/config.js';
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
    z.slots=[];
    if(!poly.length)return z;
    const center=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);
    const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    z.yard={rx:(Math.max(...xs)-Math.min(...xs))/2,ry:(Math.max(...ys)-Math.min(...ys))/2};
    z.slots=Array.from({length:PEN_SIZES[z.id]},(_,index)=>({index,
      cx:center[0]*.55+poly[Math.floor(index*poly.length/PEN_SIZES[z.id])][0]*.45,
      cy:center[1]*.55+poly[Math.floor(index*poly.length/PEN_SIZES[z.id])][1]*.45}));
    return z;
  });
}
export function zonePolygon(z) {return z.hit;}
export function pointInZone(x,y,z) {return inside(x,y,z.hit);}
function polygonArea(poly) {return Math.abs(poly.reduce((sum,[x,y],i)=>{const [nx,ny]=poly[(i+1)%poly.length];return sum+x*ny-y*nx;},0))/2;}
export function emptySign(z) {const p=zoneAttachment(z,'empty');if(!p)return null;return {x:p.x-48,y:p.y-12,w:96,h:24};}
export function nameSign(z) {const p=zoneAttachment(z,'name');return {x:p.x-(z.walk?36:70),y:p.y-12,w:z.walk?72:140,h:24};}
export function hitTestZone(x,y,layout) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return layout.zones.filter(z=>pointInZone(x,y,z)).sort((a,b)=>polygonArea(a.hit)-polygonArea(b.hit))[0]||null;
}
export function hitTestEmptySign(x,y,layout,state) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return layout.zones.find(z=>{const b=emptySign(z);return b && state.pens[z.id]?.every(o=>!o)&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;})||null;
}
export function occupantPosition(o,z,slot,t) {
  let seed=0;for(const c of o.id)seed=(seed*31+c.charCodeAt(0))>>>0;
  const phase=seed%628/100,cycle=t/9000+phase,part=cycle%1,paused=part>.72;
  const u=Math.min(1,part/.72),clock=(Math.floor(cycle)+u*u*(3-2*u))*2+phase;
  const poly=movementPolygon(z),j=z.yard;
  if(z.id==='pond'){
    const center=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);
    const a=t/6500+phase+slot.index*Math.PI/2;
    return {...project(center[0]+Math.sin(a)*j.rx*.8,center[1]+Math.cos(a)*j.ry*.8,poly),flip:Math.cos(a)<0,paused:false};
  }
  return {...project(slot.cx+Math.sin(clock)*j.rx*.15,slot.cy+Math.cos(clock*.71)*j.ry*.65,poly),flip:Math.cos(clock)<0,paused};
}
export function livestockViews(state,layout,t,now=Date.now()) {
  return layout.zones.filter(z=>z.walk && state.pens[z.id]).flatMap(z=>z.slots.map(s=>{const o=state.pens[z.id][s.index];return {zoneId:z.id,index:s.index,...getOccupantView(o,now),...(o?occupantPosition(o,z,s,t):{x:s.cx,y:s.cy})};}));
}
export function hitTestLivestock(x,y,layout,views) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return [...views].filter(v=>v.status!=='empty').sort((a,b)=>b.y-a.y).find(v=>Math.hypot(x-v.x,y-(v.y-(v.zoneId==='pond'?0:35)))<55)||null;
}
// Shared world-space geometry keeps drawing and rotated-canvas input aligned.
export function animalBubbles(views,t=0) {
  const icons={chicken:'egg',sheep:'wool',pig:'pork',cow:'beef'};
  const bubbles=views.filter(v=>v.status==='ready'||v.status==='hungry').map(v=>({
    zoneId:v.zoneId,index:v.index,action:v.status==='hungry'?'feed':'harvest',
    icon:`icons/${v.status==='hungry'?'feed':v.zoneId==='pond'?'fish':icons[v.kind]}.webp`,
    x:v.x,y:v.y-(v.zoneId==='pond'?43:v.kind==='chicken'?60:98)*SCALE+Math.sin(t/650+v.index)*2,r:27,
  }));
  for(let pass=0;pass<24;pass++)for(let i=0;i<bubbles.length;i++)for(let j=i+1;j<bubbles.length;j++){
    const a=bubbles[i],b=bubbles[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),gap=a.r+b.r+3.01;
    if(d>=gap)continue;
    const nx=d?dx/d:1,ny=d?dy/d:0,n=(gap-d)/2;
    a.x-=nx*n;a.y-=ny*n;b.x+=nx*n;b.y+=ny*n;
  }
  return bubbles;
}
export function hitTestAnimalBubble(x,y,layout,bubbles) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return [...bubbles].reverse().find(b=>Math.hypot(x-b.x,y-b.y)<=b.r)||null;
}
function drawAnimalBubble(ctx,b) {
  ctx.save();ctx.fillStyle='#f7e7c3';ctx.strokeStyle='#b38a58';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(b.x-7,b.y+22);ctx.lineTo(b.x,b.y+35);ctx.lineTo(b.x+8,b.y+22);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(255,250,228,.75)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(b.x,b.y,b.r-4,0,Math.PI*2);ctx.stroke();
  drawSprite(ctx,b.icon,b.x-17,b.y-17,34,34);ctx.restore();
}
function animal(ctx,v,t) {
  const fish=v.zoneId==='pond',frame=fish?Math.floor(t/450)%2:v.paused?1:0;
  const width=(fish?88:v.kind==='chicken'?46:v.kind==='cow'?99:83)*SCALE;
  ctx.save();ctx.translate(v.x,v.y+(fish?Math.sin(t/350+v.index)*1.5*SCALE:0));ctx.scale(v.flip?-1:1,1);
  const path=`animals/${v.kind}-${frame}.webp`;
  if(fish)drawSprite(ctx,path,-width/2,-width*.3,width,width*.6);
  else drawAnchored(ctx,path,0,0,width,92*SCALE);
  ctx.restore();
}
export function drawLivestock(ctx,state,layout,t,now) {
  const views=livestockViews(state,layout,t,now);
  for(const v of views.filter(v=>v.status!=='empty').sort((a,b)=>a.y-b.y))animal(ctx,v,t);
  for(const front of Object.values(MAP_LAYOUT.FRONTS))drawSprite(ctx,front.file,front.x,front.y,front.w,front.h);
  for(const b of animalBubbles(views,t))drawAnimalBubble(ctx,b);
  for(const z of layout.zones){
    for(const [s,text,size] of [[nameSign(z),z.label,15],...(state.pens[z.id]?.every(o=>!o)?[[emptySign(z),z.id==='pond'?'去买鱼苗':'去买幼崽',12]]:[])]) {
      rect(ctx,s.x,s.y,s.w,s.h,4,'#8a5a32');
      rect(ctx,s.x+2,s.y+2,s.w-4,s.h-4,3,'#f3e0b0');
      drawText(ctx,text,s.x+s.w/2,s.y+s.h/2,{size,color:'#5a3a22',weight:'800'});
    }
  }
  return views;
}
