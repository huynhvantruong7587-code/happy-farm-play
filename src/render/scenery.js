import { getImage } from './assets.js';
export function drawScenery(ctx, world) {
  ctx.fillStyle='#8fbf62';ctx.fillRect(0,0,world.w,world.h);
  const img=getImage('bg/meadow.webp');
  if(!img)return;
  const scale=Math.max(world.w/img.naturalWidth,world.h/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.drawImage(img,(world.w-w)/2,(world.h-h)/2,w,h);
}
