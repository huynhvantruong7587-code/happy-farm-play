import { drawFarmer } from './farmerView.js?v=0019904d88fd';
import { makeZones, drawLivestock, walkPolygon, ANIMAL_BUBBLE_RADIUS } from './livestockView.js?v=0019904d88fd';
import { drawAnchored } from './assets.js?v=0019904d88fd';
import { drawScenery } from './scenery.js?v=0019904d88fd';
import { formatMs } from '../game/config.js?v=0019904d88fd';
import { getPlotView } from '../game/systems/farm.js?v=0019904d88fd';
import { fillRoundRect, drawText } from './draw.js?v=0019904d88fd';

import { MAP_LAYOUT } from './mapLayout.js?v=0019904d88fd';
import { drawStorybookSoil } from './storybookScenery.js?v=0019904d88fd';
import {drawNaturalBeds,drawNaturalCrops} from './naturalFields.js?v=0019904d88fd';
export const WORLD = MAP_LAYOUT.WORLD;
// Cover the viewport so painted map edges and the green letterbox never show.
export function coverMinZoom(w, h) {
  return Math.max(WORLD.minZoom, w / WORLD.w, h / WORLD.h);
}
export function clampCamera(camera, w, h) {
  camera.zoom = Math.max(coverMinZoom(w, h), Math.min(WORLD.maxZoom, camera.zoom));
  for (const [axis, extent, viewport] of [['x', WORLD.w, w], ['y', WORLD.h, h]]) {
    const span = extent * camera.zoom;
    camera[axis] = Math.max(viewport - span, Math.min(0, camera[axis]));
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
  const boxes=[b,...MAP_LAYOUT.SIGNS.filter(s=>s.id===id).flatMap(s=>s.board?[s,s.board]:[s])];
  if(z.roof){const r=ANIMAL_BUBBLE_RADIUS;boxes.push({x:z.roof.x-r-10,y:z.roof.y-r-32-r-20,w:r*2+20,h:r*2+52});}
  const x=Math.min(...boxes.map(b=>b.x))-20,y=Math.min(...boxes.map(b=>b.y))-20;
  return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+20,h:Math.max(...boxes.map(b=>b.y+b.h))-y+20};
}
function fitCamera(layout,b,left=12,right=12,top=48,bottom=12) {
  const zoom=Math.max(WORLD.minZoom,Math.min(.85,(layout.cssW-left-right)/b.w,(layout.cssH-top-bottom)/b.h));
  const target={zoom,x:left+(layout.cssW-left-right-b.w*zoom)/2-b.x*zoom,y:top+(layout.cssH-top-bottom-b.h*zoom)/2-b.y*zoom};
  clampCamera(target,layout.cssW,layout.cssH);
  return target;
}
export function cameraForZone(layout, id) {
  if(id==='house')return homeCamera(layout);
  if(id==='farm')return fieldCamera(layout);
  const b=zoneBounds(layout,id);
  if(!b)return null;
  return fitCamera(layout,b,id==='farm'?64:12,id==='farm'?80:id==='pig'?200:56);
}
export function fieldCamera(layout){
  if(MAP_LAYOUT.STYLE==='storybook')return fitCamera(layout,zoneBounds(layout,'farm'),70,88,48,90);
  const field=zoneBounds(layout,'farm');
  const house=layout.zones.find(z=>z.id==='house').bounds;
  const sign=MAP_LAYOUT.SIGNS.find(s=>s.id==='house');
  const left=70,right=88,top=48,bottom=90;
  const signR=sign?sign.x+sign.w:house.x+Math.min(house.w,420);
  const signT=sign?sign.y:house.y;
  const x0=field.x-16, y0=Math.min(field.y,signT)-20;
  const x1=Math.max(field.x+field.w,signR)+20, y1=field.y+field.h+40;
  let zoom=Math.max(WORLD.minZoom,Math.min(.85,(layout.cssW-left-right)/Math.max(1,x1-x0),(layout.cssH-top-bottom)/Math.max(1,y1-y0)));
  let x=left-x0*zoom;
  let y=top+(layout.cssH-top-bottom-(y1-y0)*zoom)/2-y0*zoom;
  const target={zoom,x,y};
  for(let i=0;i<8;i++){
    clampCamera(target,layout.cssW,layout.cssH);
    const sr=signR*target.zoom+target.x;
    const limit=layout.cssW-right+4;
    if(sr<=limit)break;
    const need=sr-limit;
    const nextX=target.x-need;
    const minX=layout.cssW-WORLD.w*target.zoom;
    if(nextX>=minX){target.x=nextX;continue;}
    // Not enough pan room: zoom out so the sign fits left of the shop button.
    target.zoom=Math.max(WORLD.minZoom,(layout.cssW-right-4)/Math.max(1,signR+8));
    target.x=left-x0*target.zoom;
  }
  clampCamera(target,layout.cssW,layout.cssH);
  return target;
}
// Frame the cottage and all field beds, reserving the left navigation strip.
export function homeCamera(layout) {
  if(MAP_LAYOUT.STYLE==='storybook')return fitCamera(layout,zoneBounds(layout,'house'),64,80,48,36);
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
  return { cssW, cssH, camera: { ...camera }, plots, zones: makeZones(),previewHints:!!MAP_LAYOUT.PREVIEW_ALL_HINTS };
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
  const z=Math.max(0.05, Number(zoom)||1);
  const bounded = (size, min, max) => Math.min(max, Math.max(min, size * z)) / z;
  return {
    font: 12 / z,
    pillW: 52 / z,
    pillH: 18 / z,
    barWidth: bounded(34, 28, 46),
    barHeight: bounded(3.2, 2.6, 4),
    sparkle: bounded(8, 3.2, 9),
    gap: 3 / z,
    stroke: bounded(1.4, 1.1, 2),
  };
}
function drawStarSparkle(ctx,x,y,r,alpha){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#ffe38a';ctx.strokeStyle='#c99220';ctx.lineWidth=Math.max(0.55,r*.06);ctx.shadowColor='rgba(255,206,90,.4)';ctx.shadowBlur=Math.max(1,r*.14);
  ctx.beginPath();
  for(let i=0;i<4;i++){
    const a=-Math.PI/2+i*Math.PI/2;
    const ox=x+Math.cos(a)*r,oy=y+Math.sin(a)*r;
    const ix=x+Math.cos(a+Math.PI/4)*r*.28,iy=y+Math.sin(a+Math.PI/4)*r*.28;
    i?ctx.lineTo(ox,oy):ctx.moveTo(ox,oy);ctx.lineTo(ix,iy);
  }
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}

export function drawSigns(ctx) {
  for (const s of MAP_LAYOUT.SIGNS) {
    ctx.save();
    ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
    ctx.rotate((s.angle || 0) * Math.PI / 180);
    const len = Math.max(1, [...s.text].length);
    let size = Math.min(s.h * 0.64, (s.w * 0.80) / len * 1.05);
    size = Math.max(10, Math.floor(size));
    ctx.font = `700 ${size}px FarmSign`;
    while (ctx.measureText(s.text).width > s.w * 0.84 && size > 10) {
      size -= 1;
      ctx.font = `700 ${size}px FarmSign`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f3ddb4';
    ctx.fillText(s.text, -1.15, -1.15);
    ctx.fillStyle = '#2a160c';
    ctx.fillText(s.text, 1.2, 1.2);
    ctx.fillStyle = '#5a3218';
    ctx.fillText(s.text, 0, 0);
    ctx.restore();
  }
}

export function drawFarm(ctx, state, layout, { now = Date.now(), animationNow = 0, selectedPlotIndex = -1, debugOverlay={}, farmerAnimation={} } = {}) {
  const { cssW, cssH, camera, plots } = layout;
  const indicator = plotIndicatorSizes(camera.zoom);
  // Green edges cover any viewport area outside the painted world.
  ctx.fillStyle='#8fbf62';ctx.fillRect(0,0,cssW,cssH);
  ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.zoom, camera.zoom);
  drawScenery(ctx, WORLD);
  if(MAP_LAYOUT.ENVIRONMENT)drawNaturalBeds(ctx,plots);
  else if(MAP_LAYOUT.STYLE==='storybook')drawStorybookSoil(ctx,plots);
  for (const p of [...plots].sort((a,b)=>a.cy-b.cy)) {
    const view = getPlotView(state.plots[p.index], now);
    if (selectedPlotIndex===p.index && p.poly) {
      ctx.beginPath();
      p.poly.forEach(([x,y],i)=>{x=p.cx+(x-p.cx)*.96;y=p.cy+(y-p.cy)*.96;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
      ctx.closePath();ctx.save();ctx.shadowColor='rgba(218,153,49,.85)';ctx.shadowBlur=22;ctx.fillStyle='rgba(226,170,65,.32)';ctx.fill();ctx.restore();
    }
    if(view.status==='empty') continue;
    if(MAP_LAYOUT.ENVIRONMENT){drawNaturalCrops(ctx,p,view,animationNow);continue;}
    const ripe=view.status==='ripe';
    const frame=ripe?2:view.progress<.55?0:1;
    const tall=['corn','wheat'].includes(view.crop.id);
    const corners=p.poly || [[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]];
    const tl=corners.reduce((a,b)=>a[0]+a[1]<b[0]+b[1]?a:b);
    const opposite=corners[(corners.indexOf(tl)+2)%4];
    const neighbors=corners.filter(c=>c!==tl && c!==opposite).sort((a,b)=>b[0]-a[0]);
    const [tr,bl]=neighbors,br=opposite;
    const shortAxis=Math.min(Math.hypot(tr[0]-tl[0],tr[1]-tl[1]),Math.hypot(bl[0]-tl[0],bl[1]-tl[1]));
    const width=shortAxis*(MAP_LAYOUT.STYLE==='storybook'?(frame===0?.26:ripe?.36:.32):(frame===0?.62:ripe?.70:.72)),height=width*(tall?1.32:1.02);
    const cols=ripe && ['cabbage','pumpkin','potato'].includes(view.crop.id)?3:4;
    const plants=[];
    for(let row=0;row<3;row++)for(let col=0;col<cols;col++) {
      const u=.10+.80*(col+.5)/cols,v=(tall?.32:.10)+(tall?.60:.80)*(row+.5)/3;
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
      // One small glint on a mature plot only — never a field of sparkles.
      const pt=plants[Math.min(2, plants.length-1)];
      if(pt){
        const twinkle=.34+.16*(1+Math.sin(animationNow/900+p.index*1.4))/2;
        drawStarSparkle(ctx,pt.x,pt.y-height*.82,indicator.sparkle,twinkle);
      }
    } else if(MAP_LAYOUT.STYLE!=='storybook') {
      const {pillW,pillH,font,gap}=indicator;
      const backY=Math.min(...corners.map(c=>c[1]));
      // Cream pill with dark text, parked on this bed's back edge so it stays off the neighbours.
      const x=p.cx-pillW/2,y=backY+gap;
      fillRoundRect(ctx,x,y,pillW,pillH,pillH/2,'#f6e4c4');
      ctx.strokeStyle='#c4a06a';ctx.lineWidth=Math.max(1,indicator.stroke);ctx.stroke();
      const barPad=pillW*0.08, barH=Math.max(2,pillH*0.14);
      fillRoundRect(ctx,x+barPad,y+pillH-barH-barPad,pillW-barPad*2,barH,barH/2,'#e2c89a');
      fillRoundRect(ctx,x+barPad,y+pillH-barH-barPad,(pillW-barPad*2)*view.progress,barH,barH/2,'#7dbd4e');
      drawText(ctx,formatMs(view.remainingMs),p.cx,y+pillH*0.44,{size:font,color:'#3a2414',weight:'800'});
    }
  }
  drawLivestock(ctx,state,layout,animationNow,now);
  drawSigns(ctx);
  if(state.farmer)drawFarmer(ctx,state.farmer,{...farmerAnimation,time:animationNow});
  if(debugOverlay.plots)for(const p of plots){
    ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.strokeStyle='#ff357a';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(p.cx,p.cy,3,0,Math.PI*2);ctx.fillStyle='#ff357a';ctx.fill();
  }
  if(debugOverlay.walk)for(const z of layout.zones){const poly=walkPolygon(z);ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.strokeStyle='#00eaff';ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();
}
