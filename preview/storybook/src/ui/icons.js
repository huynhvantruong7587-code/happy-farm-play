import { CROPS, PRODUCTS } from '../game/config.js?v=167e955d2030';
export function itemIcon(id) {
  const item=CROPS[id]||PRODUCTS[id]||{name:'饲料',emoji:'🥣'};
  const icon=CROPS[id]?`crops/${id}-2`:['feed','egg','wool','pork','beef'].includes(id)?`icons/${id}`:['crucianMeat','carpMeat','goldfishMeat'].includes(id)?'icons/fish':null;
  return icon?`<img src="assets/${icon}.webp" alt="${item.name}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${item.emoji}</span>`:`<span class="item-emoji">${item.emoji}</span>`;
}
export function itemCount(id,count) {
  const item=CROPS[id]||PRODUCTS[id]||{name:'饲料'};
  return `<span class="item-count" title="${item.name}">${itemIcon(id)}<span class="item-qty">×${count??0}</span></span>`;
}
