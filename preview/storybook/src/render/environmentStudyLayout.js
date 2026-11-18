// Square parcels retain their size; their painted surfaces use mild perspective.
// The lower earth lip is part of the environment, not an interactive button.
export const STUDY_SIZE={w:1536,h:1024};
export const STUDY_PLOTS=Array.from({length:12},(_,index)=>{
  const c=index%3,r=Math.floor(index/3),x=862+c*210,y=98+r*202,w=185,h=185;
  const surface=[[x+12,y+8],[x+w-12,y+8],[x+w-1,y+h-20],[x+1,y+h-20]];
  const hit=[[x+12,y+8],[x+w-12,y+8],[x+w,y+h-8],[x,y+h-8]];
  return {index,c,r,x,y,w,h,cx:x+w/2,cy:y+h/2,surface,hit};
});
export function studySurfacePoint(p,u,v){
  const [tl,tr,br,bl]=p.surface;
  return {x:(1-u)*(1-v)*tl[0]+u*(1-v)*tr[0]+u*v*br[0]+(1-u)*v*bl[0],
    y:(1-u)*(1-v)*tl[1]+u*(1-v)*tr[1]+u*v*br[1]+(1-u)*v*bl[1]};
}
function contains(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [ax,ay]=poly[i],[bx,by]=poly[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
export function studyPlotAt(x,y){return STUDY_PLOTS.find(p=>contains(x,y,p.hit))||null;}
