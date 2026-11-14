import { makeZones, drawLivestock, emptySign, nameSign, walkPolygon } from './livestockView.js';
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
    camera[axis] = span < viewport ? (viewport - span) / 2 : Math.max(viewport - span, Math.min(0, camera[axis]));
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
  const boxes=[b,emptySign(z),nameSign(z)].filter(Boolean),x=Math.min(...boxes.map(b=>b.x))-20,y=Math.min(...boxes.map(b=>b.y))-20;
  return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+20,h:Math.max(...boxes.map(b=>b.y+b.h))-y+20};
}
export function cameraForZone(layout, id) {
  const b=zoneBounds(layout,id);
  if (!b) return null;
  const zoom=Math.min(id==='farm'?0.70:0.85,(layout.cssW-24)/b.w,(layout.cssH-24)/b.h);
  const target={zoom,x:layout.cssW/2-(b.x+b.w/2)*zoom,y:layout.cssH/2-(b.y+b.h/2)*zoom};
  if(id==='farm')target.x+=Math.min(56,Math.max(0,(layout.cssW-b.w*zoom)/2-12));
  clampCamera(target,layout.cssW,layout.cssH);
  return target;
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
export function hitTestPlot(x, y, layout) {
  const p = toWorld(x, y, layout);
  return layout.plots.find(t => p.x>=t.x && p.x<=t.x+t.w && p.y>=t.y && p.y<=t.y+t.h) || null;
}
export function drawFarm(ctx, state, layout, { now = Date.now(), animationNow = 0, selectedSeed, hoveredIndex, debugOverlay={} }) {
  const { cssW, cssH, camera, plots } = layout;
  // Green edges cover any viewport area outside the painted world.
  ctx.fillStyle='#8fbf62';ctx.fillRect(0,0,cssW,cssH);
  ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.zoom, camera.zoom);
  drawScenery(ctx, WORLD);
  for (const p of [...plots].sort((a,b)=>a.cy-b.cy)) {
    const view = getPlotView(state.plots[p.index], now);
    if (hoveredIndex===p.index || (selectedSeed && view.status==='empty')) {
      ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);
      ctx.strokeStyle='rgba(255,235,157,.65)';ctx.lineWidth=2;ctx.stroke();
    }
    if(view.status==='empty') continue;
    const ripe=view.status==='ripe';
    const frame=ripe?2:view.progress<.55?0:1;
    const tall=['corn','wheat'].includes(view.crop.id);
    const width=p.w*(frame===0?.3:tall?.55:.65);
    const height=p.h*(frame===0?.5:tall?(ripe?1.05:.95):(ripe?.85:.75));
    ctx.save();ctx.translate(p.cx,p.cy+height/2-5);
    if(ripe)ctx.rotate(Math.sin(animationNow/1100+p.index)*.025);
    drawAnchored(ctx,`crops/${view.crop.id}-${frame}.webp`,0,0,width,height);
    ctx.restore();
    if(ripe) {
      const x=p.cx+21,y=p.cy-height*.65,alpha=.45+.3*(1+Math.sin(animationNow/900+p.index))/2;
      ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#fff6c9';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();
      ctx.fillStyle='#e9bd63';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill();ctx.restore();
    } else {
      fillRoundRect(ctx,p.cx-26,p.cy+8,52,5,2,'#593c2e');
      fillRoundRect(ctx,p.cx-26,p.cy+8,52*view.progress,5,2,'#a9e873');
      drawText(ctx,formatMs(view.remainingMs),p.cx,p.cy+23,{size:11,color:'#fff7df',shadow:true});
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
