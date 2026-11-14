import { ANIMALS } from '../game/config.js';
import { getOccupantView } from '../game/systems/livestock.js';
export function zoneActions(state,id,now=Date.now()) {
  const slots=state.pens[id];
  if(!slots)return null;
  const views=slots.map(o=>getOccupantView(o,now));
  return {young:Object.values(ANIMALS).filter(a=>a.zone===id&&state.stock[a.id]>0),
    empty:slots.every(o=>!o), free:slots.findIndex(o=>!o),
    hungry:views.flatMap((v,i)=>v.status==='hungry'?[i]:[]),
    ready:views.flatMap((v,i)=>v.status==='ready'?[i]:[]),
    chicken:id==='chicken'?slots.flatMap((o,i)=>o?[i]:[]):[],
    sheep:id==='sheep'?slots.flatMap((o,i)=>o?[i]:[]):[]};
}

// A canvas tap consumes one layer at a time; an open bubble owns the tap.
export function canvasTapAction(openZoneId, trayOpen, targetZoneId=null, hasPlot=false) {
  if(openZoneId)return targetZoneId===openZoneId?'keep-zone':'close-zone';
  if(targetZoneId)return 'open-zone';
  if(hasPlot)return 'plot';
  return trayOpen?'close-tray':'toggle-chrome';
}

// Choose the least obstructive in-app placement, using sprite bounds in app coordinates.
export function bubblePlacement(app, size, zone, animals=[]) {
  const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
  const candidates=[
    [zone.x-size.w/2,zone.top-size.h-14],
    [zone.left-size.w-12,zone.top-size.h/2],
    [zone.right+12,zone.top-size.h/2],
    [zone.x-size.w/2,8],
    [8,8],[app.w-size.w-8,8]
  ];
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  return candidates.map(([x,y],i)=>({x:clamp(x,8,app.w-size.w-8),y:clamp(y,8,app.h-size.h-16),w:size.w,h:size.h,i}))
    .sort((a,b)=>animals.reduce((n,r)=>n+overlap(a,r)-overlap(b,r),0)||a.i-b.i)[0];
}
