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

// The caret tip follows an app-local projection of the world anchor.
export function bubblePlacement(app,size,anchor,safeTop=0) {
  const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
  const onScreen=anchor.x>=0&&anchor.x<=app.w&&anchor.y>=0&&anchor.y<=app.h;
  const x=anchor.x-size.w/2,y=anchor.y-size.h-14;
  return {x:onScreen?clamp(x,0,app.w-size.w):x,y:onScreen?clamp(y,safeTop,app.h-size.h-14):y,w:size.w,h:size.h};
}
