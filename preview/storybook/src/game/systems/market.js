import { CROPS, PRODUCTS } from '../config.js?v=167e955d2030';
const goods = {...CROPS,...PRODUCTS};
export const MARKET_VARIANTS = ['bunny','bear','fox','duck','cat','boy'];
export function createCustomer(now=Date.now(), random=Math.random) {
  const items=Object.values(goods), item=items[Math.floor(random()*items.length)];
  const qty=1+Math.floor(random()*5), generous=random()<.15;
  const variation=generous?1.35+random()*.35:.85+random()*.3;
  return {id:`${now}-${random().toString(36).slice(2)}`,variant:MARKET_VARIANTS[Math.floor(random()*6)],wantId:item.id,qty,offer:Math.max(1,Math.round(item.sellPrice*qty*variation)),generous,arrivedAt:now};
}
export function ensureMarket(state,now=Date.now()) {
  if(!state.market || !Array.isArray(state.market.customers)){
    let seed=(now>>>0)||1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    state.market={customers:Array.from({length:10},()=>createCustomer(now,random)),nextArrivalAt:0};
  }
  const previous=state.market.customers;
  state.market.customers=Array.from({length:10},(_,i)=>i<previous.length?previous[i]||null:createCustomer(now));
  return state.market;
}
export function tickMarket(state,now=Date.now(),random=Math.random) {
  const m=ensureMarket(state,now),i=m.customers.indexOf(null);
  if(i<0)return false;
  if(!m.nextArrivalAt)m.nextArrivalAt=now+30000;
  if(now<m.nextArrivalAt)return false;
  m.customers[i]=createCustomer(now,random);m.nextArrivalAt=m.customers.includes(null)?now+30000:0;return true;
}
export function sellToCustomer(state,index,now=Date.now()) {
  const m=ensureMarket(state,now),c=m.customers[index];
  if(!c || !goods[c.wantId] || (state.inventory[c.wantId]||0)<c.qty)return {ok:false,reason:'no_inventory'};
  state.inventory[c.wantId]-=c.qty;state.coins+=c.offer;state.stats.earned+=c.offer;m.customers[index]=null;
  if(!m.nextArrivalAt)m.nextArrivalAt=now+30000;
  return {ok:true,coins:c.offer};
}
