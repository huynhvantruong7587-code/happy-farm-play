import {BUILDING,WORLD} from './world.js?v=167e955d2030';

export const ASSETS={buildings:'assets/town/buildings.png',decor:'assets/town/decor.png',ground:'assets/town/ground.png',landscape:'assets/redesign/landscape.png'};
export async function loadTownAssets(){
  const images={};const paths={...ASSETS};
  for(const pose of ['idle','walk0','walk1'])for(const facing of ['s','sw','se','n','nw','ne'])paths[`${pose}-${facing}`]=`assets/farmer/${pose}-${facing}.webp`;
  const version=new URL(import.meta.url).search;
  await Promise.all(Object.entries(paths).map(([id,url])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[id]=img;resolve();};img.onerror=()=>reject(new Error(`无法加载 ${url}`));img.src=url+version;})));
  return images;
}
function tileRect(img,index,columns,rows){
  const w=img.naturalWidth/columns,h=img.naturalHeight/rows,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,index%columns*w,Math.floor(index/columns)*h,w,h,0,0,w,h);
  const d=ctx.getImageData(0,0,w,h).data;let left=w,top=h,right=0,bottom=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>45){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return {x:index%columns*w+left,y:Math.floor(index/columns)*h+top,w:right-left+1,h:bottom-top+1};
}
export function createTownScene(images){
  const buildingRects=[0,1].map(i=>tileRect(images.buildings,i,2,1));
  const tileW=images.buildings.naturalWidth/2;
  const left=Math.min(buildingRects[0].x,buildingRects[1].x-tileW),top=Math.min(...buildingRects.map(r=>r.y));
  const right=Math.max(buildingRects[0].x+buildingRects[0].w,buildingRects[1].x-tileW+buildingRects[1].w),bottom=Math.max(...buildingRects.map(r=>r.y+r.h));
  const buildings=[0,1].map(i=>({x:left+i*tileW,y:top,w:right-left,h:bottom-top}));
  const decor=[0,1,2,3].map(i=>tileRect(images.decor,i,2,2)),land=[0,1,2,3,4,5].map(i=>tileRect(images.landscape,i,3,2));
  const ground=images.ground;
  const scenery=[
    [0,95,590,420],[1,2260,670,440],[2,2100,370,350],[0,170,1320,350],[2,2270,1500,390],[1,300,260,340],
    [3,320,1190,200],[3,1430,1050,210],[3,2050,1150,210],[3,1430,520,170],[5,2100,1280,210],[5,380,1430,190],
    [4,1770,790,245],
  ];
  function sprite(ctx,img,r,x,foot,width,height){height??=width*r.h/r.w;ctx.drawImage(img,r.x,r.y,r.w,r.h,x-width/2,foot-height,width,height);}
  return {
    buildingRects:buildings,
    draw(ctx,{camera,state,player,walking,facing,time,repairedAlpha=1}){
      ctx.fillStyle='#b1c66c';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
      ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);
      // Mirror only the independent terrain at the edges, so zooming out never
      // reveals a flat green border or a seam with a different grass texture.
      const minX=Math.floor(-camera.x/camera.zoom/WORLD.width),maxX=Math.floor((ctx.canvas.width-camera.x)/camera.zoom/WORLD.width);
      const minY=Math.floor(-camera.y/camera.zoom/WORLD.height),maxY=Math.floor((ctx.canvas.height-camera.y)/camera.zoom/WORLD.height);
      for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++){
        ctx.save();ctx.translate(tx*WORLD.width,ty*WORLD.height);
        if(Math.abs(tx%2)===1){ctx.translate(WORLD.width,0);ctx.scale(-1,1);}
        if(Math.abs(ty%2)===1){ctx.translate(0,WORLD.height);ctx.scale(1,-1);}
        ctx.drawImage(ground,0,0,WORLD.width,WORLD.height);ctx.restore();
      }
      const layers=scenery.map(([i,x,y,w])=>({y,draw:()=>sprite(ctx,images.landscape,land[i],x,y,w)}));
      const repaired=state.town?.restaurant?.repaired;
      layers.push({y:BUILDING.depth,draw:()=>{
        const b=BUILDING;ctx.save();ctx.shadowColor='#5c49202b';ctx.shadowBlur=23;ctx.shadowOffsetY=9;
        const draw=i=>ctx.drawImage(images.buildings,buildings[i].x,buildings[i].y,buildings[i].w,buildings[i].h,b.x,b.y,b.width,b.height);
        if(repaired&&repairedAlpha<1){draw(0);ctx.globalAlpha=repairedAlpha;draw(1);}else draw(repaired?1:0);ctx.restore();
      }});
      if(repaired){
        for(const [id,x,y,w] of [[0,670,1240,310],[0,1210,1255,310],[1,510,1090,180],[1,1400,1190,180],[2,1030,1150,100],[3,1530,1090,80]])layers.push({y,draw:()=>{ctx.save();ctx.globalAlpha=repairedAlpha;sprite(ctx,images.decor,decor[id],x,y,w);ctx.restore();}});
      }
      layers.push({y:player.y,draw:()=>{const pose=walking?'walk'+Math.floor(time/170)%2:'idle',img=images[pose+'-'+facing];if(img)ctx.drawImage(img,player.x-45,player.y-140,90,140);}});
      layers.sort((a,b)=>a.y-b.y).forEach(l=>l.draw());
      // A roof-attached notification is an independent game UI layer.
      const bx=BUILDING.x+BUILDING.width*.67,by=BUILDING.y-65,r=30/camera.zoom;
      ctx.fillStyle='#fff1d2';ctx.strokeStyle='#c09861';ctx.lineWidth=1.4/camera.zoom;ctx.beginPath();ctx.roundRect(bx-r,by-r*.55,r*2,r*1.1,r*.45);ctx.fill();ctx.stroke();ctx.fillStyle=repaired?'#8ba64f':'#bb8950';ctx.font=`700 ${24/camera.zoom}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(repaired?'✓':'!',bx,by);
      ctx.restore();
    },
  };
}
