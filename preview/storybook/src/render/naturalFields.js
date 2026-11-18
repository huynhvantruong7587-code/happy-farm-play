import {getImage,drawAnchored} from './assets.js?v=0019904d88fd';
function surfacePoint(p,u,v){
 const [tl,tr,br,bl]=p.surface;
 return {x:(1-u)*(1-v)*tl[0]+u*(1-v)*tr[0]+u*v*br[0]+(1-u)*v*bl[0],y:(1-u)*(1-v)*tl[1]+u*(1-v)*tr[1]+u*v*br[1]+(1-u)*v*bl[1]};
}
export function naturalCropAnchors(p,view){
 const grain=view.status==='ripe'&&view.crop.id==='wheat',columns=grain?5:3,rows=grain?4:3;
 return Array.from({length:rows*columns},(_,i)=>{const row=Math.floor(i/columns),col=i%columns,u=grain?.12+col*.19:.18+col*.32,v=grain?.46+row*.15:.50+row*.20;return {...surfacePoint(p,u,v),row,col,v};});
}
// Feather the grass fringe of the approved soil sprite into the environment.
let bed;
function bedSprite(){
 if(bed)return bed;const img=getImage('redesign/environment-study-refined.png');if(!img)return null;
 bed=document.createElement('canvas');bed.width=185;bed.height=185;const c=bed.getContext('2d');c.drawImage(img,862,98,185,185,0,0,185,185);c.globalCompositeOperation='destination-in';
 const horizontal=c.createLinearGradient(0,0,185,0);horizontal.addColorStop(0,'transparent');horizontal.addColorStop(.035,'#000');horizontal.addColorStop(.965,'#000');horizontal.addColorStop(1,'transparent');c.fillStyle=horizontal;c.fillRect(0,0,185,185);
 const vertical=c.createLinearGradient(0,0,0,185);vertical.addColorStop(0,'transparent');vertical.addColorStop(.035,'#000');vertical.addColorStop(.965,'#000');vertical.addColorStop(1,'transparent');c.fillStyle=vertical;c.fillRect(0,0,185,185);return bed;
}
export function drawNaturalBeds(ctx,plots){const sprite=bedSprite();if(sprite)for(const p of plots)ctx.drawImage(sprite,p.x,p.y,p.w,p.h);}
export function drawNaturalCrops(ctx,p,view,time){
 const ripe=view.status==='ripe',large=view.progress>.55,atlas=getImage('redesign/study-crops.png'),kind=['wheat','carrot','cabbage'].indexOf(view.crop.id),grain=ripe&&kind===0,reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 for(const a of naturalCropAnchors(p,view)){
  const depth=(.94+a.v*.08)*(1+Math.sin(p.index*17+a.row*7+a.col*11)*.025),w=p.h*(grain?.40:ripe?.52:large?.42:.30)*depth,h=p.h*(grain?.49:ripe?.55:large?.42:.30)*depth;
  ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.sin(p.index*13+a.col*7+a.row*19)*.018+(ripe&&!reduced?Math.sin(time/1600+p.index+a.col)*.012:0));
  if(kind>=0&&atlas){const sw=atlas.naturalWidth/3,sh=atlas.naturalHeight/2,tile=kind+(ripe?0:3);ctx.drawImage(atlas,tile%3*sw,Math.floor(tile/3)*sh,sw,sh,-w/2,-h,w,h);}
  else drawAnchored(ctx,`crops/${view.crop.id}-${ripe?2:large?1:0}.webp`,0,0,w,h);ctx.restore();
 }
 if(ripe){
  const alpha=reduced?.45:.3+(Math.sin(time/1100+p.index)+1)*.18;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#fff0b1';ctx.translate(p.x+p.w*.84,p.y+p.h*.18);ctx.scale(p.w/185,p.w/185);ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(1.5,-1.5);ctx.lineTo(5,0);ctx.lineTo(1.5,1.5);ctx.lineTo(0,5);ctx.lineTo(-1.5,1.5);ctx.lineTo(-5,0);ctx.lineTo(-1.5,-1.5);ctx.closePath();ctx.fill();ctx.restore();
 }
}
