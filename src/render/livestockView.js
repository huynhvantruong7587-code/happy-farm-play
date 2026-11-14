import { ZONE_NAMES, PEN_SIZES } from '../game/config.js';
import { getOccupantView } from '../game/systems/livestock.js';
import { drawAnchored, drawSprite, getImage } from './assets.js';
import { fillRoundRect as rect, drawText } from './draw.js';

// Bounds contain the complete artwork. Yard coordinates are fractions of that box.
const ZONES = [
  ['chicken',300,920,490,490*783/930,[.40,.65,.24,.07]],
  ['pig',1380,430,550,550*.67,[.49,.57,.24,.12]],
  ['cow',1420,1000,570,570*.709,[.36,.65,.19,.065]],
  ['sheep',640,1330,560,560*.66,[.48,.56,.24,.11]],
  ['pond',1550,1550,620,620*.578,[.5,.52,.34,.25]],
];
const WALK = {
  chicken:[[.28,.66],[.42,.62],[.50,.66],[.50,.75],[.36,.76],[.26,.70]],
  pig:[[.26,.48],[.42,.34],[.62,.32],[.74,.42],[.70,.48],[.52,.50],[.38,.60],[.24,.54]],
  cow:[[.22,.48],[.40,.42],[.44,.52],[.42,.66],[.28,.76],[.16,.68],[.22,.60],[.16,.52]],
  sheep:[[.28,.40],[.48,.28],[.50,.42],[.52,.52],[.70,.55],[.62,.68],[.48,.62],[.32,.55]],
  pond:[[.30,.38],[.42,.30],[.55,.28],[.68,.34],[.78,.45],[.76,.58],[.62,.70],[.48,.72],[.36,.68],[.26,.55],[.24,.45]],
};
const ATTACH = {
  chicken:{anchor:[.46,.44],name:[.36,.48],empty:[.34,.78]},
  pig:{anchor:[.50,.44],name:[.50,.68],empty:[.50,.74]},
  cow:{anchor:[.54,.44],name:[.52,.36],empty:[.36,.80]},
  sheep:{anchor:[.50,.44],name:[.50,.74],empty:[.58,.80]},
  pond:{anchor:[.50,.44],name:[.50,.86],empty:[.50,.90]},
};
export function zoneAttachment(z,key) {const [x,y]=ATTACH[z.id][key],b=z.bounds;return {x:b.x+x*b.w,y:b.y+y*b.h};}
export function walkPolygon(z) {const b=z.bounds;return WALK[z.id].map(([x,y])=>[b.x+x*b.w,b.y+y*b.h]);}
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
    const distance=([x,y])=>dx*(y-ay)-dy*(x-ax)-Math.abs(dy)*44-Math.abs(dx)*28;
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
  return ZONES.map(([id,cx,cy,w,h,[x,y,rx,ry]])=>{
    const bounds={x:cx-w/2,y:cy-h/2,w,h};
    const yard={cx:bounds.x+x*w,cy:bounds.y+y*h,rx:rx*w,ry:ry*h};
    const poly=movementPolygon({id,bounds}),center=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);
    const slots=Array.from({length:PEN_SIZES[id]},(_,index)=>({index,
      cx:center[0]*.55+poly[Math.floor(index*poly.length/PEN_SIZES[id])][0]*.45,
      cy:center[1]*.55+poly[Math.floor(index*poly.length/PEN_SIZES[id])][1]*.45}));
    return {id,name:ZONE_NAMES[id],cx,cy,bounds,yard,slots};
  });
}
// A close ellipse includes the enclosure and building for taps, not distant corners.
export function zonePolygon(z) {
  const {w,h}=z.bounds;
  return Array.from({length:64},(_,i)=>{const a=i*Math.PI/32;return [z.cx+Math.cos(a)*w*.49,z.cy+Math.sin(a)*h*.49];});
}
export function pointInZone(x,y,z) {
  return ((x-z.cx)/(z.bounds.w*.49))**2+((y-z.cy)/(z.bounds.h*.49))**2<=1;
}
export function emptySign(z) {const p=zoneAttachment(z,'empty');return {x:p.x-48,y:p.y-12,w:96,h:24};}
export function nameSign(z) {const p=zoneAttachment(z,'name');return {x:p.x-31,y:p.y-12,w:62,h:24};}
export function hitTestZone(x,y,layout) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return layout.zones.find(z=>pointInZone(x,y,z))||null;
}
export function hitTestEmptySign(x,y,layout,state) {
  const c=layout.camera;x=(x-c.x)/c.zoom;y=(y-c.y)/c.zoom;
  return layout.zones.find(z=>{const b=emptySign(z);return state.pens[z.id].every(o=>!o)&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;})||null;
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
  return layout.zones.flatMap(z=>z.slots.map(s=>{const o=state.pens[z.id][s.index];return {zoneId:z.id,index:s.index,...getOccupantView(o,now),...(o?occupantPosition(o,z,s,t):{x:s.cx,y:s.cy})};}));
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
    x:v.x,y:v.y-(v.zoneId==='pond'?43:v.kind==='chicken'?60:98)+Math.sin(t/650+v.index)*2,r:27,
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
  const width=fish?88:v.kind==='chicken'?46:v.kind==='cow'?99:83;
  ctx.save();ctx.translate(v.x,v.y+(fish?Math.sin(t/350+v.index)*1.5:0));ctx.scale(v.flip?-1:1,1);
  const path=`animals/${v.kind}-${frame}.webp`;
  if(fish)drawSprite(ctx,path,-width/2,-width*.3,width,width*.6);
  else drawAnchored(ctx,path,0,0,width,92);
  ctx.restore();
}
export function drawLivestock(ctx,state,layout,t,now) {
  const views=livestockViews(state,layout,t,now);
  for(const z of layout.zones){const b=z.bounds;
    drawSprite(ctx,`pens/${z.id==='chicken'?'coop':z.id}.webp`,b.x,b.y,b.w,b.h);
  }
  for(const v of views.filter(v=>v.status!=='empty').sort((a,b)=>a.y-b.y))animal(ctx,v,t);
  for(const z of layout.zones){
    if(z.id==='pond')continue;
    const b=z.bounds,front=`pens/${z.id==='chicken'?'coop':z.id}-front.webp`;
    if(getImage(front))drawSprite(ctx,front,b.x,b.y,b.w,b.h);
  }
  for(const b of animalBubbles(views,t))drawAnimalBubble(ctx,b);
  for(const z of layout.zones){
    for(const [s,text,size] of [[nameSign(z),z.name,15],...(state.pens[z.id].every(o=>!o)?[[emptySign(z),z.id==='pond'?'去买鱼苗':'去买幼崽',12]]:[])]) {
      rect(ctx,s.x,s.y,s.w,s.h,4,'#8a5a32');
      rect(ctx,s.x+2,s.y+2,s.w-4,s.h-4,3,'#f3e0b0');
      drawText(ctx,text,s.x+s.w/2,s.y+s.h/2,{size,color:'#5a3a22',weight:'800'});
    }
  }
  return views;
}
