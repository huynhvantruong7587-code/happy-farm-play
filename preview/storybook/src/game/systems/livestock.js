import { ANIMALS, FEED, slotCount } from '../config.js?v=f4838dd5f949';
const fail = reason => ({ok:false,reason});
const count = n => Number.isFinite(n) && n > 0 && Number.isInteger(n);
export function buyYoung(state, kind, n=1) {
  const a=ANIMALS[kind];
  if (!a || !count(n)) return fail('invalid');
  if (state.level<a.unlockLevel) return fail('locked');
  if (state.coins<a.cost*n) return fail('no_coins');
  state.coins-=a.cost*n; state.stats.spent+=a.cost*n; state.stock[kind]+=n;
  return {ok:true};
}
export function buyFeed(state,n=1) {
  if (!count(n)) return fail('invalid');
  if (state.coins<FEED.cost*n) return fail('no_coins');
  state.coins-=FEED.cost*n; state.stats.spent+=FEED.cost*n; state.inventory.feed+=n;
  return {ok:true};
}
export function craftFeed(state,material) {
  const n=material==='wheat'?2:material==='corn'?1:0;
  if (!n) return fail('invalid');
  if ((state.inventory[material]||0)<n) return fail('no_material');
  state.inventory[material]-=n; state.inventory.feed++; return {ok:true};
}
function valid(state,z,i) { return state.pens[z] && Number.isInteger(i) && i>=0 && i<Math.min(state.pens[z].length,slotCount(state.level)); }
export function place(state,z,i,kind,now=Date.now()) {
  if (!valid(state,z,i) || !ANIMALS[kind]) return fail('invalid');
  if (ANIMALS[kind].zone!==z) return fail('wrong_zone');
  if (state.pens[z][i]) return fail('occupied');
  if (!state.stock[kind]) return fail('no_stock');
  state.stock[kind]--; state.pens[z][i]={id:globalThis.crypto?.randomUUID?.() || `${now}-${Math.random()}`,kind,placedAt:now,fedAt:0};
  return {ok:true};
}
export function getOccupantView(o,now=Date.now()) {
  if (!o) return {status:'empty',progress:0,remainingMs:0,outputs:{}};
  const a=ANIMALS[o.kind], remainingMs=o.fedAt ? Math.max(0,a.growMs-(now-o.fedAt)):a.growMs;
  return {...o,animal:a,status:!o.fedAt?'hungry':remainingMs?'growing':'ready',progress:o.fedAt?Math.max(0,Math.min(1,1-remainingMs/a.growMs)):0,remainingMs,outputs:a.outputs};
}
export function feed(state,z,i,now=Date.now()) {
  if (!valid(state,z,i) || !state.pens[z][i]) return fail('empty');
  if (state.pens[z][i].fedAt) return fail('already_fed');
  if (!state.inventory.feed) return fail('no_feed');
  state.inventory.feed--; state.pens[z][i].fedAt=now; return {ok:true};
}
export function harvest(state,z,i,now=Date.now()) {
  if (!valid(state,z,i)) return fail('invalid');
  const o=state.pens[z][i],v=getOccupantView(o,now);
  if (v.status!=='ready') return fail(v.status==='hungry'?'hungry':'not_ready');
  for (const [k,n] of Object.entries(v.outputs)) state.inventory[k]+=n;
  if (['sheep','chicken'].includes(o.kind)) o.fedAt=0; else state.pens[z][i]=null;
  state.stats.harvested++; return {ok:true,xp:v.animal.xp,outputs:v.outputs};
}
export function harvestMutton(state,i) {
  const preview=previewMeatHarvest(state,'sheep',i);
  if(!preview.ok)return preview;
  state.pens.sheep[i]=null; state.inventory.mutton+=preview.outputs.mutton; state.stats.harvested++;
  return {ok:true,xp:preview.xp,outputs:preview.outputs};
}

const CHICKEN_MEAT_OUTPUT=1, CHICKEN_MEAT_XP=5;
export function previewMeatHarvest(state,z,i,now=Date.now()) {
  if(!['chicken','sheep'].includes(z)||!valid(state,z,i)||!state.pens[z][i])return fail('empty');
  const o=state.pens[z][i],v=getOccupantView(o,now);
  return {ok:true,id:o.id,status:v.status,xp:CHICKEN_MEAT_XP,outputs:z==='chicken'?{chickenMeat:CHICKEN_MEAT_OUTPUT}:{mutton:1},
    lostOutputs:v.status==='ready'?{...v.outputs}:{},interruptsProduction:v.status==='growing'};
}
export function previewChickenHarvest(state,i,now=Date.now()) {return previewMeatHarvest(state,'chicken',i,now);}
export function harvestChicken(state,i) {
  const preview=previewChickenHarvest(state,i);
  if(!preview.ok)return preview;
  state.pens.chicken[i]=null; state.inventory.chickenMeat+=preview.outputs.chickenMeat; state.stats.harvested++;
  return {ok:true,xp:preview.xp,outputs:preview.outputs};
}
