// A deliberate backswing arms the stroke; only forward speed at contact counts.
export const MAX_STROKE_PULL = 0.30;
const METRES_PER_PIXEL = 0.001;
const MIN_BACKSWING = 0.015;
// Softer mapping: 600 px/s gives about 13% (1.6 m/s on a centred hit).
const FULL_POWER_PIXELS_PER_SECOND = 4500;
const SPEED_WINDOW_MS = 80;
export function createMouseStroke(now=0) {
  return {pull:0,armed:false,lastTime:now,samples:[],power:0,fired:false,forward:false};
}
export function moveMouseStroke(stroke,deltaY,now,sensitivity=1) {
  if(stroke.fired||!Number.isFinite(deltaY)||!Number.isFinite(now)||now<stroke.lastTime)return null;
  const gap=now-stroke.lastTime;
  // A pause at full backswing must not dilute the subsequent forward motion.
  const dt=gap>80&&!stroke.forward&&deltaY<0?16:Math.max(1,gap);
  stroke.lastTime=now;
  stroke.samples=stroke.samples.filter(s=>s.time>=now-SPEED_WINDOW_MS);
  if(deltaY>=0){
    stroke.pull=Math.min(MAX_STROKE_PULL,stroke.pull+deltaY*METRES_PER_PIXEL);
    if(stroke.pull>=MIN_BACKSWING)stroke.armed=true;
    if(deltaY>0){stroke.samples=[];stroke.power=0;stroke.forward=false;}
    return null;
  }
  stroke.forward=true;
  const previous=stroke.pull;
  stroke.pull=Math.max(0,stroke.pull+deltaY*METRES_PER_PIXEL);
  if(stroke.pull<1e-8)stroke.pull=0;
  stroke.samples.push({time:now,distance:-deltaY,dt});
  const travel=stroke.samples.reduce((sum,s)=>sum+s.distance,0);
  const elapsed=stroke.samples.reduce((sum,s)=>sum+s.dt,0);
  const gain=Number.isFinite(sensitivity)?Math.max(.1,Math.min(1.5,sensitivity)):1;
  stroke.power=Math.max(1,Math.min(100,travel/elapsed*1000/FULL_POWER_PIXELS_PER_SECOND*100*gain));
  if(stroke.armed&&previous>0&&stroke.pull===0){
    stroke.fired=true;
    return stroke.power;
  }
  return null;
}

// The v2 UI scale doubles the previous percentage without changing physical gain.
export function strokeSensitivityGain(percent) {
  const value=Number(percent);
  return (Number.isFinite(value)?Math.max(20,Math.min(300,value)):60)/200;
}
