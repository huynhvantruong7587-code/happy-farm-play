import { getImage } from './assets.js';
import { MAP_LAYOUT } from './mapLayout.js';
export function drawScenery(ctx, world) {
 ctx.fillStyle='#8fbf62';ctx.fillRect(0,0,world.w,world.h);
 const m=MAP_LAYOUT.MAP,img=getImage(m.file);if(img)ctx.drawImage(img,m.x,m.y,m.w,m.h);
}
