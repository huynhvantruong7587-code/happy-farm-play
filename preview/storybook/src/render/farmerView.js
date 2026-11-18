import { MAP_LAYOUT } from './mapLayout.js?v=f4838dd5f949';
import { drawAnchored } from './assets.js?v=f4838dd5f949';
export function besideZone(zone) {
  if(zone?.beside)return {x:zone.beside.x,y:zone.beside.y};
  const b=zone.bounds;
  return {x:b.x+b.w*.18,y:b.y+b.h*.82};
}
export function farmerStart(){return {...(MAP_LAYOUT.FARMER_START || besideZone(MAP_LAYOUT.ZONES.house))};}
export function moveFarmer(position,target,dt){
  const dx=target.x-position.x,dy=target.y-position.y,d=Math.hypot(dx,dy),step=Math.min(d,110*dt);
  if(d){position.x+=dx/d*step;position.y+=dy/d*step;}
  return d>step;
}
export function farmerFacing(dx,dy){return Math.abs(dx)<Math.abs(dy)*.4?(dy>=0?'s':'n'):(dy>=0?(dx>=0?'se':'sw'):(dx>=0?'ne':'nw'));}
export function drawFarmer(ctx,position,{walking=false,facing='s',time=0}={}){
  // Sprite sheets are ~0.60 wide/tall; keep a small readable chibi.
  drawAnchored(ctx,`farmer/${walking?'walk'+Math.floor(time/200)%2:'idle'}-${facing}.webp`,position.x,position.y,90,148);
}
