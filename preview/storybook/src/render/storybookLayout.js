// Source-pixel calibration for the unified painted world. Gameplay layers remain independent.
const S=4;
const box=(x,y,w,h)=>({x:x*S,y:y*S,w:w*S,h:h*S});
const polygon=points=>points.map(([x,y])=>[x*S,y*S]);
const corners=(x,y,w,h)=>polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
const point=([x,y])=>({x:x*S,y:y*S});
function zone(id,bounds,roof,building,beside,extra={}){
 return {id,bounds:box(...bounds),roof:point(roof),building:building?box(...building):null,beside:point(beside),hit:corners(...bounds),...extra};
}
function pen(id,bounds,roof,building,beside,fence,walk,slots){
 return zone(id,bounds,roof,building,beside,{fence:box(...fence),walk:polygon(walk),slots:slots.map(([cx,cy],index)=>({index,cx:cx*S,cy:cy*S})),yard:{rx:fence[2]*S/2,ry:fence[3]*S/2}});
}
const ZONES={
 chicken:pen('chicken',[55,80,390,248],[175,96],[85,86,180,158],[248,342],[55,137,385,188],[[90,249],[270,249],[270,180],[410,180],[410,295],[90,295]],[[290,220],[350,230],[235,278],[310,283],[385,270],[125,277],[175,287],[385,205]]),
 pig:pen('pig',[461,85,345,245],[592,100],[472,90,201,140],[645,350],[465,132,335,193],[[495,240],[680,240],[680,184],[774,184],[774,293],[495,293]],[[545,272],[610,280],[685,275],[750,273],[692,240],[738,240],[702,205],[755,205]]),
 cow:pen('cow',[820,45,365,311],[962,78],[850,49,240,180],[1003,374],[822,126,350,225],[[850,230],[1147,230],[1147,318],[850,318]],[[878,264],[960,264],[1042,264],[1124,264],[878,307],[960,307],[1042,307],[1124,307]]),
 sheep:pen('sheep',[1012,398,470,215],[1155,410],[1028,400,210,136],[1244,628],[1015,450,460,160],[[1040,543],[1245,543],[1245,474],[1440,474],[1440,565],[1040,565]],[[1260,510],[1310,510],[1360,510],[1410,510],[1260,550],[1310,550],[1360,550],[1410,550]]),
 house:zone('house',[55,345,380,280],[340,390],[77,345,340,265],[442,628]),
 mill:zone('mill',[540,390,405,220],[780,402],[550,390,390,220],[952,630]),
 shop:zone('shop',[670,650,310,213],[915,690],[675,650,300,205],[988,860]),
 store:zone('store',[28,675,285,195],[185,690],[30,675,280,190],[310,879]),
 market:zone('market',[345,703,285,165],[490,708],[347,704,280,160],[502,892]),
};
const water=Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return [1355+118*Math.cos(a),229+60*Math.sin(a)];});
ZONES.pond=zone('pond',[1200,126,315,220],[1355,145],null,[1450,362],{walk:polygon(water),yard:{rx:118*S,ry:60*S},slots:[[1280,220],[1320,195],[1360,205],[1400,215],[1295,250],[1335,260],[1375,245],[1420,250]].map(([cx,cy],index)=>({index,cx:cx*S,cy:cy*S}))});
export const STORYBOOK_LAYOUT={
 STYLE:'storybook',ENVIRONMENT:'redesign/farm-world-environment.png',WORLD:{w:1536*S,h:1024*S,minZoom:.1,maxZoom:1.8},MAP:{file:'redesign/farm-world-environment.png',x:0,y:0,w:1536*S,h:1024*S},ANIMAL_SCALE:1.1,FARMER_START:point([442,628]),ZONES,FRONTS:{},SIGNS:[],
 DECORATION_BOUNDS:{entranceFence:box(790,925,190,60)},
 PLOTS:Array.from({length:12},(_,index)=>{
  const c=index%3,r=Math.floor(index/3),x=(1030+c*145)*S,y=(640+r*90)*S,w=130*S,h=78*S;
  return {index,c,r,x,y,w,h,cx:x+w/2,cy:y+h/2,parcel:{w,h:w},poly:[[x+34,y+14],[x+w-34,y+14],[x+w-4,y+h-12],[x+4,y+h-12]],surface:[[x+34,y+14],[x+w-34,y+14],[x+w-4,y+h-28],[x+4,y+h-28]]};
 }),
};
