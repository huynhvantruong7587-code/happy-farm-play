import { getImage } from './assets.js?v=f4838dd5f949';
import { MAP_LAYOUT } from './mapLayout.js?v=f4838dd5f949';
import { drawStorybookGround, drawStorybookBuildings } from './storybookScenery.js?v=f4838dd5f949';
export function drawScenery(ctx, world,groundExtension=0) {
 if(MAP_LAYOUT.ENVIRONMENT){
  const img=getImage(MAP_LAYOUT.ENVIRONMENT);
  if(img){
   ctx.drawImage(img,0,0,world.w,world.h);
   // Continue the painted grass behind the floating tray, instead of a solid green strip.
   const band=40,tileHeight=world.h*band/img.naturalHeight;
   for(let y=0;y<groundExtension;y+=tileHeight){
    const h=Math.min(tileHeight,groundExtension-y);
    ctx.drawImage(img,0,img.naturalHeight-band,img.naturalWidth,band*h/tileHeight,0,world.h+y,world.w,h);
   }
  }
  return;
 }
 if(MAP_LAYOUT.STYLE==='storybook'){drawStorybookGround(ctx);drawStorybookBuildings(ctx);return;}
 ctx.fillStyle='#8fbf62';ctx.fillRect(0,0,world.w,world.h);
 const m=MAP_LAYOUT.MAP,img=getImage(m.file);if(img)ctx.drawImage(img,m.x,m.y,m.w,m.h);
}
