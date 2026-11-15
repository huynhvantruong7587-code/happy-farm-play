const paths = [
  "icons/feed.webp",
  "icons/egg.webp",
  "icons/wool.webp",
  "icons/pork.webp",
  "icons/beef.webp",
  "icons/fish.webp",

  "animals/carp-0.webp",
  "animals/carp-1.webp",
  "animals/chick.webp",
  "animals/chicken-0.webp",
  "animals/chicken-1.webp",
  "animals/chicken-brown.webp",
  "animals/cow-0.webp",
  "animals/cow-1.webp",
  "animals/crucian-0.webp",
  "animals/crucian-1.webp",
  "animals/egg.webp",
  "animals/goldfish-0.webp",
  "animals/goldfish-1.webp",
  "animals/pig-0.webp",
  "animals/pig-1.webp",
  "animals/sheep-0.webp",
  "animals/sheep-1.webp",
  "bg/farm-map.webp",
  "crops/cabbage-0.webp",
  "crops/cabbage-1.webp",
  "crops/cabbage-2.webp",
  "crops/carrot-0.webp",
  "crops/carrot-1.webp",
  "crops/carrot-2.webp",
  "crops/corn-0.webp",
  "crops/corn-1.webp",
  "crops/corn-2.webp",
  "crops/potato-0.webp",
  "crops/potato-1.webp",
  "crops/potato-2.webp",
  "crops/pumpkin-0.webp",
  "crops/pumpkin-1.webp",
  "crops/pumpkin-2.webp",
  "crops/strawberry-0.webp",
  "crops/strawberry-1.webp",
  "crops/strawberry-2.webp",
  "crops/tomato-0.webp",
  "crops/tomato-1.webp",
  "crops/tomato-2.webp",
  "crops/wheat-0.webp",
  "crops/wheat-1.webp",
  "crops/wheat-2.webp",
  "pens/coop-front.webp",
  "pens/cow-front.webp",
  "pens/pig-front.webp",
  "pens/sheep-front.webp"
];
for(const pose of ['idle','walk0','walk1'])for(const facing of ['s','se','sw','n','ne','nw'])paths.push(`farmer/${pose}-${facing}.webp`);
const images = new Map();
let pending;
export function loadAssets(onProgress = () => {}) {
  if (pending) return pending.then(() => onProgress(1));
  onProgress(0);
  let settled = 0;
  pending = Promise.all(paths.map(path => new Promise(resolve => {
    const img = new Image();
    let done = false;
    const finish = error => {
      if (done) return;
      done = true; clearTimeout(timer);
      img.onload = img.onerror = null;
      if (error) console.warn('图片加载失败', path, error);
      else images.set(path,img);
      onProgress(++settled / paths.length);
      resolve();
    };
    const timer = setTimeout(() => finish('timeout'),10000);
    img.onload = async () => {
      try { if (img.decode) await img.decode(); finish(); }
      catch (error) { finish(error); }
    };
    img.onerror = () => finish('network or format');
    img.src = new URL('../../assets/' + path,import.meta.url).href;
  })));
  return pending;
}
export function getImage(path) {
  const img=images.get(path);
  return img?.complete && img.naturalWidth ? img : null;
}
// A missing image draws nothing and never interrupts the frame.
export function drawSprite(ctx,path,x,y,w,h) {
  const img=getImage(path);
  if (img) ctx.drawImage(img,x,y,w,h);
  else { /* Missing sprites draw nothing. */ }
}
export function drawAnchored(ctx,path,x,y,w,maxH=w*2) {
  const img=getImage(path), ratio=img?img.naturalHeight/img.naturalWidth:1;
  const h=Math.min(maxH,w*ratio), width=h/ratio;
  drawSprite(ctx,path,x-width/2,y-h,width,h);
}
