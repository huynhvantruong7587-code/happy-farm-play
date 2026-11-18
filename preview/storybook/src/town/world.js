export const WORLD={width:2400,height:1600};
export const BUILDING={x:390,y:220,width:950,height:800,depth:1020};
export const BODY={x:425,y:535,width:865,height:475};
export const DOOR={x:1160,y:1040};
export function insideBody(p){return p.x>BODY.x&&p.x<BODY.x+BODY.width&&p.y>BODY.y&&p.y<BODY.y+BODY.height;}
export function destination(p){return {x:Math.max(100,Math.min(2300,p.x)),y:Math.max(260,Math.min(1500,p.y))};}
export function walkingPath(from,to){
  to=destination(to);if(insideBody(to))return [];
  const crosses=(a,b)=>Array.from({length:30},(_,i)=>({x:a.x+(b.x-a.x)*i/29,y:a.y+(b.y-a.y)*i/29})).some(insideBody);
  if(!crosses(from,to))return [to];
  const routes=[BODY.x-65,BODY.x+BODY.width+65].map(x=>[{x,y:from.y},{x,y:to.y},to]).filter(r=>!crosses(from,r[0])&&!crosses(r[0],r[1])&&!crosses(r[1],to));
  return routes.sort((a,b)=>{const length=r=>r.reduce((v,p,i)=>v+Math.hypot(p.x-(i?r[i-1].x:from.x),p.y-(i?r[i-1].y:from.y)),0);return length(a)-length(b);})[0]||[];
}
