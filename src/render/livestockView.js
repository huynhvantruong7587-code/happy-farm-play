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
export function makeZones() {
  return ZONES.map(([id,cx,cy,w,h,[x,y,rx,ry]])=>{
    const bounds={x:cx-w/2,y:cy-h/2,w,h};
    const yard={cx:bounds.x+x*w,cy:bounds.y+y*h,rx:rx*w,ry:ry*h};
    const slots=Array.from({length:PEN_SIZES[id]},(_,index)=>({index,
      cx:yard.cx+(index-(PEN_SIZES[id]-1)/2)*yard.rx*.4,cy:yard.cy}));
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
export function emptySign(z) {return {x:z.cx-55,y:z.bounds.y+z.bounds.h+8,w:110,h:28};}
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
  const j=z.yard;
  if(z.id==='pond'){
    const a=t/6500+phase+slot.index*Math.PI/2,r=.72+.12*Math.sin(t/11000+phase);
    return {x:j.cx+Math.sin(a)*j.rx*r,y:j.cy+Math.cos(a)*j.ry*r,flip:Math.cos(a)<0,paused:false};
  }
  return {x:slot.cx+Math.sin(clock)*j.rx*.15,y:slot.cy+Math.cos(clock*.71)*j.ry*.65,flip:Math.cos(clock)<0,paused};
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
  ctx.save();ctx.translate(v.x,v.y+Math.sin(t/350+v.index)*1.5);ctx.scale(v.flip?-1:1,1);
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
    if(state.pens[z.id].every(o=>!o)){
      const s=emptySign(z);rect(ctx,s.x+51,s.y+20,7,23,2,'#91633b');rect(ctx,s.x,s.y,s.w,s.h,5,'#e4bf84');
      drawText(ctx,z.id==='pond'?'去买鱼苗':'去买幼崽',z.cx,s.y+14,{size:14,color:'#704b2e'});
    }
    const y=z.bounds.y+z.bounds.h+72;
    rect(ctx,z.cx-41,y-14,82,28,7,'#8a5a32');
    rect(ctx,z.cx-39,y-12,78,24,5,'#f3e0b0');
    drawText(ctx,z.name,z.cx,y,{size:17,color:'#5a3a22',weight:'800'});
  }
  return views;
}
