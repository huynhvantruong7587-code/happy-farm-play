import { CROPS, PRODUCTS } from '../game/config.js';
export function itemCount(id,count) {
  const item=CROPS[id]||PRODUCTS[id]||{name:'饲料',emoji:'🥣'};
  const icon=CROPS[id]?`crops/${id}-2`:['feed','egg','wool','pork','beef'].includes(id)?`icons/${id}`:['crucianMeat','carpMeat','goldfishMeat'].includes(id)?'icons/fish':null;
  return `<span class="item-count" title="${item.name}">${icon?`<img src="assets/${icon}.webp" alt="${item.name}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${item.emoji}</span>`:item.emoji}<span>×${count??0}</span></span>`;
}
