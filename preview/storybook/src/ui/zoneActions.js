import { ANIMALS, slotCount } from '../game/config.js?v=b5e861e4569c';
import { getOccupantView } from '../game/systems/livestock.js?v=b5e861e4569c';
export function zoneActions(state,id,now=Date.now()) {
  const slots=state.pens[id];
  if(!slots)return null;
  const available=slots.slice(0,slotCount(state.level));
  const views=available.map(o=>getOccupantView(o,now));
  return {young:Object.values(ANIMALS).filter(a=>a.zone===id&&state.stock[a.id]>0),
    empty:slots.every(o=>!o), free:available.findIndex(o=>!o),
    hungry:views.flatMap((v,i)=>v.status==='hungry'?[i]:[]),
    ready:views.flatMap((v,i)=>v.status==='ready'?[i]:[]),
    chicken:id==='chicken'?slots.flatMap((o,i)=>o?[i]:[]):[],
    sheep:id==='sheep'?slots.flatMap((o,i)=>o?[i]:[]):[]};
}

// Grass dismisses the seed tray without changing chrome.
export function canvasTapAction(openZoneId, trayOpen, targetZoneId=null, hasPlot=false) {
  if(targetZoneId)return 'open-zone';
  if(hasPlot)return 'plot';
  return trayOpen?'close-tray':'none';
}
