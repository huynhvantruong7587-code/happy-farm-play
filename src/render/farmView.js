import { makeZones, drawLivestock } from './livestockView.js';
import { drawAnchored, drawSprite, getImage } from './assets.js';
import { drawScenery } from './scenery.js';
import { GAME, formatMs } from '../game/config.js';
import { getPlotView } from '../game/systems/farm.js';
import { fillRoundRect, drawText } from './draw.js';

function soilAspect() {const img=getImage('tiles/soil.webp');return img?img.naturalHeight/img.naturalWidth:395/640;}
function fieldBounds(plots) {
  const boxes=plots.map(p=>({x:p.cx-p.w*.6,y:p.cy-39,w:p.w*1.2,h:p.w*1.2*soilAspect()}));
  const x=Math.min(...boxes.map(b=>b.x))-8, y=Math.min(...boxes.map(b=>b.y))-8;
  return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+8,
    h:Math.max(...boxes.map(b=>b.y+b.h))-y+8};
}

export const WORLD = { w: 2200, h: 1900, minZoom: 0.35, maxZoom: 1.7 };
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
    const boxes=layout.plots.map(p=>({x:p.cx-p.w*.6,y:p.cy-100,
      w:p.w*1.2,h:Math.max(100+p.h/2+23,61+p.w*1.2*soilAspect())}));
    boxes.push(fieldBounds(layout.plots));
    const x=Math.min(...boxes.map(b=>b.x))-20, y=Math.min(...boxes.map(b=>b.y))-20;
    return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x+20,
      h:Math.max(...boxes.map(b=>b.y+b.h))-y+20};
  }
  const z=layout.zones.find(z=>z.id===id);
  if (!z) return null;
  const b=z.bounds;
  return {x:b.x-20,y:b.y-20,w:b.w+40,h:b.h+126};
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
  const plots = [];
  for (let r = 0; r < GAME.rows; r++) for (let c = 0; c < GAME.cols; c++) {
    const cx = 920 + (c - r) * 66, cy = 740 + (c + r) * 37;
    plots.push({ index: r * GAME.cols + c, cx, cy, w: 122, h: 64, x: cx - 61, y: cy - 32 });
  }
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
  return layout.plots.find(t => Math.abs(p.x - t.cx) / (t.w / 2) + Math.abs(p.y - t.cy) / (t.h / 2) <= 1) || null;
}
export function drawFarm(ctx, state, layout, { now = Date.now(), animationNow = 0, selectedSeed, hoveredIndex }) {
  const { cssW, cssH, camera, plots } = layout;
  // Cover viewport padding with meadow art even when the world is smaller.
  drawScenery(ctx,{w:cssW,h:cssH});
  ctx.save(); ctx.translate(camera.x, camera.y); ctx.scale(camera.zoom, camera.zoom);
  drawScenery(ctx, WORLD);
  const field=getImage('tiles/soil-field.webp'), b=fieldBounds(plots);
  if(field) drawSprite(ctx,'tiles/soil-field.webp',b.x,b.y,b.w,b.h);
  for (const p of [...plots].sort((a,b)=>a.cy-b.cy)) {
    const view = getPlotView(state.plots[p.index], now);
    if(!field) drawSprite(ctx,'tiles/soil.webp',p.cx-p.w*.6,p.cy-39,p.w*1.2,p.w*1.2*soilAspect());
    if (hoveredIndex===p.index || (selectedSeed && view.status==='empty')) {
      ctx.beginPath();ctx.moveTo(p.cx,p.cy-p.h/2);ctx.lineTo(p.cx+p.w/2,p.cy);ctx.lineTo(p.cx,p.cy+p.h/2);ctx.lineTo(p.cx-p.w/2,p.cy);ctx.closePath();
      ctx.strokeStyle='rgba(255,235,157,.65)';ctx.lineWidth=2;ctx.stroke();
    }
    if(view.status==='empty') continue;
    const ripe=view.status==='ripe';
    const frame=ripe?2:view.progress<.55?0:1;
    const tall=['corn','wheat'].includes(view.crop.id);
    const width=frame===0?36:tall?56:64;
    const height=frame===0?38:tall?(ripe?95:85):(ripe?76:68);
    ctx.save();ctx.translate(p.cx,p.cy-5);
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
  ctx.restore();
}
