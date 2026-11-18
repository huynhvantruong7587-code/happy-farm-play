import { getImage } from './assets.js?v=f4838dd5f949';
import { STORYBOOK_LAYOUT as MAP } from './storybookLayout.js?v=f4838dd5f949';

function line(ctx,points,width,color){
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
const roads=[
  [[900,4450],[900,4130],[1270,3300],[1430,2590],[1620,1560],[1770,1430],[3370,1430],[5030,1430],[6600,1460]],
  [[1580,2580],[2450,2490],[3790,2560],[4630,2810],[6500,2810]],
  [[2840,2500],[3400,2170],[4290,2100],[4660,2390]],
  [[2800,4280],[3000,3800],[3150,3000],[3450,2750]],
  [[895,2700],[1000,2810],[1310,2860]],
  [[2340,3200],[2540,3340],[3020,3260]],
  [[725,3850],[780,4010],[900,4130]],
  [[2020,4220],[1810,4330],[1100,4350],[900,4300]],
];
function curvedRoad(ctx,points,width,color){
  ctx.beginPath();ctx.moveTo(...points[0]);
  for(let i=1;i<points.length-1;i++)ctx.quadraticCurveTo(...points[i],(points[i][0]+points[i+1][0])/2,(points[i][1]+points[i+1][1])/2);
  ctx.lineTo(...points.at(-1));ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
export function drawStorybookGround(ctx){
  const meadow=getImage('redesign/meadow.png');
  if(meadow){ctx.fillStyle=ctx.createPattern(meadow,'repeat');ctx.fillRect(0,0,MAP.WORLD.w,MAP.WORLD.h);}
  for(const points of roads){curvedRoad(ctx,points,142,'#c3a569');curvedRoad(ctx,points,130,'#e5c383');curvedRoad(ctx,points,106,'#efd39a');curvedRoad(ctx,points,76,'#edcf94');}
  for(const z of Object.values(MAP.ZONES)){
    if(!z.beside||z.id==='pond')continue;
    const {x,y}=z.beside;
    const endpoint=z.fence?[z.bounds.x+z.bounds.w/2,z.bounds.y+z.bounds.h-20]:[z.building.x+z.building.w*.5,z.building.y+z.building.h-25];
    line(ctx,[endpoint,[x,y]],105,'#d9b67c');line(ctx,[endpoint,[x,y]],86,'#efd39a');
  }
  // A flowered cottage garden remains separate from working animal yards.
  ctx.fillStyle='#a9bd6d55';ctx.beginPath();ctx.ellipse(850,2300,650,440,0,0,Math.PI*2);ctx.fill();
  fence(ctx,{x:260,y:2050,w:1270,h:650},true);
  drawPond(ctx);
  for(const z of Object.values(MAP.ZONES))if(z.fence)fence(ctx,z.fence);
  // Deterministic planting keeps the scene identical across reloads.
  const gardens=[[180,1470,1100,70],[3750,1640,600,230],[260,2860,930,200],[4700,4070,1600,170],[5260,1460,1100,90]];
  for(const [x,y,w,h]of gardens)for(let i=0;i<6;i++)decor(ctx,3,x+(i*157%w),y+(i*83%h),220);
  for(let i=0;i<18;i++){tree(ctx,100+i*386,200+(i%3)*30,105+(i%4)*12,i%3);tree(ctx,70+i*390,4490+(i%2)*30,105+(i%3)*12,i%3);}
  for(let i=1;i<9;i++){tree(ctx,30,400+i*410,125,i%3);tree(ctx,6750,320+i*420,125,i%3);}
  for(const [x,y,s] of [[160,1720,100],[1490,1820,85],[3950,1890,95],[4550,1900,80],[2960,3340,95],[4600,1650,70],[6500,2910,80]])tree(ctx,x,y,s);
  decor(ctx,4,640,2390,360);decor(ctx,3,360,2500,330);decor(ctx,3,1250,2510,300);
  decor(ctx,5,5340,1290,240);decor(ctx,5,6380,510,220);decor(ctx,3,6050,1330,260);
}
function fence(ctx,f,white=false){
  const {x,y,w,h}=f,r=Math.min(125,h*.25),points=[];
  for(let i=0;i<40;i++){
    const a=i/40*Math.PI*2;
    // Superellipse provides rounded corners and long, clear activity boundaries.
    points.push([x+w/2+Math.sign(Math.cos(a))*Math.sqrt(Math.abs(Math.cos(a)))*w/2,
      y+h/2+Math.sign(Math.sin(a))*Math.sqrt(Math.abs(Math.sin(a)))*h/2]);
  }
  points.push(points[0]);
  for(const lift of [30,65]){
    const rail=points.map(([px,py])=>[px,py-lift]);
    line(ctx,rail,22,white?'#bda378':'#906233');line(ctx,rail,14,white?'#fff0cf':'#e3ad58');line(ctx,rail.map(([px,py])=>[px,py-3]),3,white?'#fff9e8':'#f4d28a');
  }
  for(let i=0;i<40;i+=2){const [px,py]=points[i];
    const grad=ctx.createLinearGradient(px-10,0,px+12,0);grad.addColorStop(0,white?'#d3c3a2':'#a87338');grad.addColorStop(.45,white?'#fff9df':'#f0c373');grad.addColorStop(1,white?'#e6d8b6':'#b57c3e');
    ctx.fillStyle='#47532d22';ctx.beginPath();ctx.ellipse(px+10,py+5,22,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=grad;ctx.strokeStyle=white?'#af9973':'#996530';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(px-12,py-90,25,94,11);ctx.fill();ctx.stroke();
  }
  // A small closed gate at the front, separate from animal positions.
  const gx=x+w*.5,gy=y+h;
  ctx.fillStyle=white?'#eee0bb':'#d9a351';ctx.strokeStyle='#9a6b35';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(gx-55,gy-100,110,99,12);ctx.fill();ctx.stroke();
  for(let i=-36;i<45;i+=18)line(ctx,[[gx+i,gy-91],[gx+i,gy-8]],2,'#af7a3c');
  line(ctx,[[gx-48,gy-65],[gx+48,gy-65]],10,'#e8bf77');line(ctx,[[gx-48,gy-22],[gx+48,gy-82]],9,'#edc780');
}
function decor(ctx,tile,x,y,width){
  const atlas=getImage('redesign/landscape.png');if(!atlas)return;
  const tw=atlas.naturalWidth/3,th=atlas.naturalHeight/2;
  ctx.drawImage(atlas,tile%3*tw,Math.floor(tile/3)*th,tw,th,x-width/2,y-width,width,width);
}
function tree(ctx,x,y,r,tile=0){decor(ctx,tile,x,y,r*3.5);}
function flower(ctx,x,y,i){
  ctx.fillStyle='#769444';ctx.beginPath();ctx.ellipse(x,y,12,6,-.5,0,Math.PI*2);ctx.fill();
  const color=i%4===0?'#e7a4a0':i%3===0?'#f5dc83':'#fff7d7';
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+Math.cos(a)*5,y-10+Math.sin(a)*5,4,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#d7aa48';ctx.beginPath();ctx.arc(x,y-10,3,0,Math.PI*2);ctx.fill();
}
function drawPond(ctx){
  const pond=getImage('redesign/pond.png');if(pond){ctx.drawImage(pond,5160,290,1470,980);return;}
  ctx.beginPath();ctx.ellipse(5900,800,660,465,0,0,Math.PI*2);ctx.fillStyle='#c8bd7d';ctx.fill();ctx.strokeStyle='#8ba256';ctx.lineWidth=24;ctx.stroke();
  const water=ctx.createLinearGradient(0,370,0,1230);water.addColorStop(0,'#69b9b4');water.addColorStop(.6,'#83c8ba');water.addColorStop(1,'#a5d6bc');
  ctx.beginPath();ctx.ellipse(5900,800,606,415,0,0,Math.PI*2);ctx.fillStyle=water;ctx.fill();ctx.strokeStyle='#e9e5bb';ctx.lineWidth=10;ctx.stroke();
  for(let i=0;i<8;i++){const x=5470+i*117,y=800+Math.sin(i*3)*220;ctx.strokeStyle='#e4f3d166';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x,y,50,12,0,0,Math.PI);ctx.stroke();}
  for(const [x,y]of [[5450,670],[5630,1060],[6230,560],[6330,870]]){ctx.fillStyle='#7fa950';ctx.beginPath();ctx.ellipse(x,y,36,20,-.2,.3,Math.PI*2-.2);ctx.lineTo(x,y);ctx.fill();flower(ctx,x,y-8,0);}
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=5900+Math.cos(a)*649,y=800+Math.sin(a)*455;ctx.fillStyle=i%2?'#c4c19d':'#ddd6ae';ctx.beginPath();ctx.ellipse(x,y,30+i%3*8,20+i%3*7,-.3,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.translate(6350,1120);ctx.rotate(-.2);
  ctx.fillStyle='#8b633b';ctx.fillRect(-20,-120,160,160);
  for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#e3b46a':'#edc37b';ctx.fillRect(-30,-118+i*23,185,21);}
  ctx.restore();
}
export function drawStorybookBuildings(ctx){
  const atlas=getImage('redesign/buildings.png');if(!atlas)return;
  const tw=atlas.naturalWidth/3,th=atlas.naturalHeight/3;
  for(const z of Object.values(MAP.ZONES).filter(z=>z.building).sort((a,b)=>a.building.y+a.building.h-b.building.y-b.building.h)){
    const b=z.building;ctx.drawImage(atlas,(b.tile%3)*tw,Math.floor(b.tile/3)*th,tw,th,b.x,b.y,b.w,b.h);
    if(z.label&&z.id!=='house'){
      const anchors={shop:[.57,.36,.21,.075],store:[.52,.3,.21,.075],market:[.5,.36,.18,.07],mill:[.55,.36,.21,.075]};
      const [ax,ay,aw,ah]=anchors[z.id];ctx.save();ctx.fillStyle='#63401e';ctx.font=`700 ${b.w*ah*.7}px FarmSign`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(z.label,b.x+b.w*ax,b.y+b.h*ay,b.w*aw);ctx.restore();
    }
  }
}
export function drawStorybookSoil(ctx,plots){
  for(const p of plots){
    const soil=ctx.createLinearGradient(0,p.y,0,p.y+p.h);soil.addColorStop(0,'#b1844a');soil.addColorStop(1,'#926438');
    ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,p.h,25);ctx.fillStyle=soil;ctx.fill();ctx.strokeStyle='#c49b5b';ctx.lineWidth=9;ctx.stroke();
    ctx.save();ctx.clip();for(let i=0;i<7;i++){line(ctx,[[p.x-5,p.y+28+i*34],[p.x+p.w+5,p.y+19+i*34]],10,'#c29a62');line(ctx,[[p.x-5,p.y+37+i*34],[p.x+p.w+5,p.y+28+i*34]],4,'#77512b66');}ctx.restore();
  }
}
