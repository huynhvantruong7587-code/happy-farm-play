import {mapInput} from './inputMap.js?v=0019904d88fd';

// One gesture owner for mouse and touch, including the quarter-turned phone UI.
export function bindHorizontalScroll(list){
  list.classList.add('free-horizontal-scroll');
  let drag=null,frame=0,suppress=false;
  const stop=()=>{cancelAnimationFrame(frame);frame=0;};
  document.addEventListener('pointerdown',stop,true);
  function glide(velocity){
    if(Math.abs(velocity)<.03||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let previous=performance.now();
    const tick=now=>{
      const dt=Math.min(32,now-previous);previous=now;
      if(!list.getClientRects().length){stop();return;}
      const before=list.scrollLeft;list.scrollLeft+=velocity*dt;
      velocity*=Math.exp(-dt/210);
      if(Math.abs(velocity)<.03||Math.abs(list.scrollLeft-before)<.1){stop();return;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
  }
  list.addEventListener('pointerdown',e=>{
    if(e.isPrimary===false||e.button>0)return;
    stop();suppress=false;
    const x=mapInput(e.clientX,e.clientY).x;
    drag={id:e.pointerId,start:x,scroll:list.scrollLeft,samples:[{x,time:e.timeStamp}],last:e.timeStamp,moved:false};
  });
  list.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const x=mapInput(e.clientX,e.clientY).x,now=e.timeStamp,dx=x-drag.start;
    if(!drag.moved&&Math.abs(dx)<=6)return;
    drag.moved=true;suppress=true;list.setPointerCapture(e.pointerId);
    list.scrollLeft=drag.scroll-dx;
    drag.samples.push({x,time:now});drag.samples=drag.samples.filter((p,i,all)=>now-p.time<=100||i>=all.length-2);drag.last=now;
    e.preventDefault();
  },{passive:false});
  function finish(e,cancelled){
    if(!drag||e.pointerId!==drag.id)return;
    const ended=drag;drag=null;
    if(list.hasPointerCapture(e.pointerId))list.releasePointerCapture(e.pointerId);
    if(cancelled||!ended.moved||e.timeStamp-ended.last>140)return;
    const first=ended.samples[0],last=ended.samples.at(-1);
    if(first&&last&&last.time-first.time>8)glide(Math.max(-2.5,Math.min(2.5,(first.x-last.x)/(last.time-first.time))));
  }
  list.addEventListener('pointerup',e=>finish(e,false));
  list.addEventListener('pointercancel',e=>finish(e,true));
  list.addEventListener('lostpointercapture',e=>{if(e.target===list)drag=null;});
  list.addEventListener('dragstart',e=>e.preventDefault());
  list.addEventListener('click',e=>{if(suppress&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
  list.addEventListener('wheel',e=>{
    stop();if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&list.scrollWidth>list.clientWidth){list.scrollLeft+=e.deltaY;e.preventDefault();}
  },{passive:false});
  list.addEventListener('keydown',stop);
  return {stop};
}
