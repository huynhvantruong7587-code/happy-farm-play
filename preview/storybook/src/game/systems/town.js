export const RESTAURANT_REPAIR={coins:1200,materials:{wheat:6,egg:3}};
export function normalizeTown(raw){return {restaurant:{repaired:raw?.restaurant?.repaired===true,repairedAt:Number.isFinite(raw?.restaurant?.repairedAt)?Math.max(0,raw.restaurant.repairedAt):0}};}
export function restaurantRepairView(state){
  const repaired=state.town?.restaurant?.repaired===true;
  const materials=Object.entries(RESTAURANT_REPAIR.materials).map(([id,need])=>({id,need,owned:state.inventory[id]||0}));
  return {repaired,materials,coins:RESTAURANT_REPAIR.coins,ready:!repaired&&state.coins>=RESTAURANT_REPAIR.coins&&materials.every(m=>m.owned>=m.need)};
}
export function repairRestaurant(state,now=Date.now()){
  const v=restaurantRepairView(state);
  if(v.repaired)return {ok:false,reason:'already_repaired'};
  if(!v.ready)return {ok:false,reason:'missing_resources'};
  state.coins-=v.coins;
  for(const m of v.materials)state.inventory[m.id]-=m.need;
  state.stats.spent+=v.coins;
  state.town=normalizeTown(state.town);state.town.restaurant={repaired:true,repairedAt:now};
  return {ok:true};
}
