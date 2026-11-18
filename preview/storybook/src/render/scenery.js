import { getImage } from './assets.js?v=b5e861e4569c';
import { MAP_LAYOUT } from './mapLayout.js?v=b5e861e4569c';
import { drawStorybookGround, drawStorybookBuildings } from './storybookScenery.js?v=b5e861e4569c';
export function drawScenery(ctx, world) {
 if(MAP_LAYOUT.ENVIRONMENT){const img=getImage(MAP_LAYOUT.ENVIRONMENT);if(img)ctx.drawImage(img,0,0,world.w,world.h);return;}
 if(MAP_LAYOUT.STYLE==='storybook'){drawStorybookGround(ctx);drawStorybookBuildings(ctx);return;}
 ctx.fillStyle='#8fbf62';ctx.fillRect(0,0,world.w,world.h);
 const m=MAP_LAYOUT.MAP,img=getImage(m.file);if(img)ctx.drawImage(img,m.x,m.y,m.w,m.h);
}
