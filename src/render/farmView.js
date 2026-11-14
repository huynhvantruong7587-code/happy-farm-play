import { makeZones, drawLivestock, walkPolygon } from './livestockView.js';
import { drawAnchored } from './assets.js';
import { drawScenery } from './scenery.js';
import { formatMs } from '../game/config.js';
import { getPlotView } from '../game/systems/farm.js';
import { fillRoundRect, drawText } from './draw.js';

import { MAP_LAYOUT } from './mapLayout.js';
export const WORLD = MAP_LAYOUT.WORLD;
export function clampCamera(camera, w, h) {
  camera.zoom = Math.max(WORLD.minZoom, Math.min(WORLD.maxZoom, camera.zoom));
  for (const [axis, extent, viewport] of [['x', WORLD.w, w], ['y', WORLD.h, h]]) {
    const span = extent * camera.zoom;
    camera[axis] = span < viewport ? (viewport - span) / 2 : Math.max(viewport - span, Math.min(axis === 'x' ? Math.max(0, 64 - (Math.min(...MAP_LAYOUT.PLOTS.map(p=>p.x)) - 20) * camera.zoom) : 0, camera[axis]));
  }
}
// Include every rendered extremity, then add breathing room in world pixels.
export function zoneBounds(layout, id) {
  if (id === 'farm') {
    const boxes=layout.plots;
    const x=Math.min(...boxes.map(b=>b.x))-20, y=Math.min(...boxes.map(b=>b.y))-20;
    return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+20,
      h:Math.max(...boxes.map(b=>b.y+b.h))-y+20};
  }
  const z=layout.zones.find(z=>z.id===id);
  if (!z) return null;
  const b=z.bounds;
  const boxes=[b,...MAP_LAYOUT.SIGNS.filter(s=>s.id===id)].filter(Boolean),x=Math.min(...boxes.map(b=>b.x))-20,y=Math.min(...boxes.map(b=>b.y))-20;
  return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+20,h:Math.max(...boxes.map(b=>b.y+b.h))-y+20};
}
function fitCamera(layout,b,left=12,right=12) {
  const zoom=Math.max(WORLD.minZoom,Math.min(.85,(layout.cssW-left-right)/b.w,(layout.cssH-24)/b.h));
  const target={zoom,x:left+(layout.cssW-left-right-b.w*zoom)/2-b.x*zoom,y:(layout.cssH-b.h*zoom)/2-b.y*zoom};
  clampCamera(target,layout.cssW,layout.cssH);
  return target;
}
export function cameraForZone(layout, id) {
  if(id==='house' || id==='farm')return homeCamera(layout);
  const b=zoneBounds(layout,id);
  if(!b)return null;
  return fitCamera(layout,b,id==='farm'?64:12,id==='farm'?80:id==='pig'?200:56);
}
// Frame the cottage and all field beds, reserving the left navigation strip.
export function homeCamera(layout) {
  const field=zoneBounds(layout,'farm'),house=layout.zones.find(z=>z.id==='house').bounds;
  const x=field.x,y=Math.min(field.y,house.y)-12;
  return fitCamera(layout,{x,y,w:house.x+house.w-x+12,h:Math.max(field.y+field.h,house.y+house.h)-y+12},64,80);
}
export function interpolateCamera(from,to,progress) {
  const e=1-Math.pow(1-Math.max(0,Math.min(1,progress)),3);
  return Object.fromEntries(['x','y','zoom'].map(k=>[k,from[k]+(to[k]-from[k])*e]));
}
export function computeLayout(cssW, cssH, camera = { x: 0, y: 0, zoom: 1 }) {
  const plots = MAP_LAYOUT.PLOTS.map(p=>({...p}));
  return { cssW, cssH, camera: { ...camera }, plots, zones: makeZones() };
}
export function toWorld(x, y, layout) {
  const c = layout.camera;
  return { x: (x - c.x) / c.zoom, y: (y - c.y) / c.zoom };
}
export function toScreen(x, y, layout) {
  const c = layout.camera;
  return { x: x * c.zoom + c.x, y: y * c.zoom + c.y };
}
export function pointInPlot(x,y,poly) {
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const [ax,ay]=poly[i],[bx,by]=poly[j];
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
export function hitTestPlot(x, y, layout) {
  const p = toWorld(x, y, layout);
  return layout.plots.filter(t => p.x>=t.x && p.x<=t.x+t.w && p.y>=t.y && p.y<=t.y+t.h && (!t.poly || pointInPlot(p.x,p.y,t.poly)))
    .sort((a,b)=> Math.hypot(p.x-a.cx,p.y-a.cy)-Math.hypot(p.x-b.cx,p.y-b.cy) || b.cy-a.cy)[0] || null;
}
// Return world sizes with readable, bounded CSS sizes after camera scaling.
export function plotIndicatorSizes(zoom) {
  const bounded = (size, min, max) => Math.min(max, Math.max(min, size * zoom)) / zoom;
  return {
    font: bounded(11, 12, 17),
    barWidth: bounded(52, 40, 72),
    barHeight: bounded(5, 4, 7),
    sparkle: bounded(14, 12, 17),
    gap: 4 / zoom,
    stroke: bounded(2, 1.5, 2.5),
  };
}
export function drawFarm(ctx, state, layout, { now = Date.now(), animationNow = 0, selectedPlotIndex = -1, debugOverlay={} } = {}) {
  const { cssW, cssH, camera, plots } = layout;
  const indicator = plotIndicatorSizes(camera.zoom);
  // Green edges cover any viewport area outside the painted world.
  ctx.fillStyle='#8fbf62';ctx.fillRect(0,0,cssW,cssH);
  ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.zoom, camera.zoom);
  drawScenery(ctx, WORLD);
  for (const p of [...plots].sort((a,b)=>a.cy-b.cy)) {
    const view = getPlotView(state.plots[p.index], now);
    if (selectedPlotIndex===p.index && p.poly) {
      ctx.beginPath();
      p.poly.forEach(([x,y],i)=>{x=p.cx+(x-p.cx)*.96;y=p.cy+(y-p.cy)*.96;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
      ctx.closePath();ctx.strokeStyle='#ffe7a1';ctx.lineWidth=2.8;ctx.stroke();
    }
    if(view.status==='empty') continue;
    const ripe=view.status==='ripe';
    const frame=ripe?2:view.progress<.55?0:1;
    const tall=['corn','wheat'].includes(view.crop.id);
    const corners=p.poly || [[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]];
    const tl=corners.reduce((a,b)=>a[0]+a[1]<b[0]+b[1]?a:b);
    const opposite=corners[(corners.indexOf(tl)+2)%4];
    const neighbors=corners.filter(c=>c!==tl && c!==opposite).sort((a,b)=>b[0]-a[0]);
    const [tr,bl]=neighbors,br=opposite;
    const shortAxis=Math.min(Math.hypot(tr[0]-tl[0],tr[1]-tl[1]),Math.hypot(bl[0]-tl[0],bl[1]-tl[1]));
    const width=shortAxis*(frame===0?.50:ripe?.48:.53),height=width*(tall?1.38:1.05);
    const cols=ripe && ['cabbage','pumpkin','potato'].includes(view.crop.id)?3:4;
    const plants=[];
    for(let row=0;row<3;row++)for(let col=0;col<cols;col++) {
      const u=.14+.72*(col+.5)/cols,v=(tall?.36:.14)+(tall?.54:.72)*(row+.5)/3;
      plants.push({x:(1-u)*(1-v)*tl[0]+u*(1-v)*tr[0]+(1-u)*v*bl[0]+u*v*br[0],
        y:(1-u)*(1-v)*tl[1]+u*(1-v)*tr[1]+(1-u)*v*bl[1]+u*v*br[1]});
    }
    for(const {x,y} of plants.sort((a,b)=>a.y-b.y)) {
      ctx.save();ctx.translate(x,y);
      if(ripe)ctx.rotate(Math.sin(animationNow/1100+p.index)*.025);
      drawAnchored(ctx,`crops/${view.crop.id}-${frame}.webp`,0,0,width,height);
      ctx.restore();
    }
    if(ripe) {
      const x=p.cx,y=p.y-indicator.gap-indicator.sparkle/2,alpha=.45+.3*(1+Math.sin(animationNow/900+p.index))/2;
      const radius=indicator.sparkle/2;
      ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#fff6c9';ctx.lineWidth=indicator.stroke;
      ctx.beginPath();ctx.moveTo(x-radius*5/7,y);ctx.lineTo(x+radius*5/7,y);ctx.moveTo(x,y-radius);ctx.lineTo(x,y+radius);ctx.stroke();
      ctx.fillStyle='#e9bd63';ctx.beginPath();ctx.arc(x,y,indicator.stroke*.9,0,Math.PI*2);ctx.fill();ctx.restore();
    } else {
      const {barWidth,barHeight,font,gap}=indicator;
      const x=p.cx-barWidth/2,y=p.y-gap-barHeight;
      fillRoundRect(ctx,x,y,barWidth,barHeight,barHeight/2,'#593c2e');
      fillRoundRect(ctx,x,y,barWidth*view.progress,barHeight,barHeight/2,'#a9e873');
      drawText(ctx,formatMs(view.remainingMs),p.cx,y-gap-font/2,{size:font,color:'#fff7df',shadow:true});
    }
  }
  drawLivestock(ctx,state,layout,animationNow,now);
  if(debugOverlay.plots)for(const p of plots){
    ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.strokeStyle='#ff357a';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(p.cx,p.cy,3,0,Math.PI*2);ctx.fillStyle='#ff357a';ctx.fill();
  }
  if(debugOverlay.walk)for(const z of layout.zones){const poly=walkPolygon(z);ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.strokeStyle='#00eaff';ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();
}
