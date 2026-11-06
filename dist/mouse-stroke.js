// A deliberate backswing arms the stroke; speed comes from timed cue positions.
export const MAX_STROKE_PULL = 0.30;
const METRES_PER_PIXEL = 0.001;
const MIN_BACKSWING = 0.015;
const FULL_POWER_PIXELS_PER_SECOND = 4500;
const SPEED_WINDOW_MS = 80;
const MIN_MEASURED_TIME_MS = 8;

export function createMouseStroke(now=0) {
  return {pull:0,armed:false,lastTime:now,samples:[],power:0,fired:false,
    forward:false,needsRetry:false};
}

function recordPosition(stroke,time,position) {
  const last=stroke.samples.at(-1);
  // Coalesced events can share a timestamp: accumulate their position, not time.
  if(last?.time===time)last.position=position;
  else stroke.samples.push({time,position});
  while(stroke.samples.length>2&&stroke.samples[1].time<=time-SPEED_WINDOW_MS)
    stroke.samples.shift();
}

function measuredSpeed(samples) {
  if(samples.length<2)return null;
  const end=samples.at(-1);
  const startTime=Math.max(samples[0].time,end.time-SPEED_WINDOW_MS);
  const elapsed=end.time-startTime;
  if(elapsed<MIN_MEASURED_TIME_MS)return null;
  let startPosition=samples[0].position;
  for(let i=1;i<samples.length;i++){
    if(samples[i].time>=startTime){
      const before=samples[i-1],after=samples[i];
      const fraction=(startTime-before.time)/(after.time-before.time);
      startPosition=before.position+(after.position-before.position)*fraction;
      break;
    }
  }
  return Math.max(0,startPosition-end.position)/METRES_PER_PIXEL/(elapsed/1000);
}

export function moveMouseStroke(stroke,deltaY,now,sensitivity=1) {
  if(stroke.fired||!Number.isFinite(deltaY)||!Number.isFinite(now)||now<stroke.lastTime)return null;
  const previousTime=stroke.lastTime;
  stroke.lastTime=now;
  if(deltaY>0){
    stroke.pull=Math.min(MAX_STROKE_PULL,stroke.pull+deltaY*METRES_PER_PIXEL);
    if(stroke.pull>=MIN_BACKSWING)stroke.armed=true;
    stroke.samples=[];stroke.power=0;stroke.forward=false;stroke.needsRetry=false;
    return null;
  }
  if(deltaY===0){
    if(stroke.forward)recordPosition(stroke,now,stroke.pull);
  }else{
    const previous=stroke.pull;
    const displacement=-deltaY*METRES_PER_PIXEL;
    stroke.pull=Math.max(0,previous-displacement);
    if(stroke.pull<1e-8)stroke.pull=0;
    const contact=stroke.armed&&previous>0&&stroke.pull===0;
    if(!stroke.forward){
      // The first packet ends an unknown pause/motion interval. Its distance
      // cannot be assigned an invented duration; start measuring from here.
      stroke.forward=true;stroke.samples=[];
      recordPosition(stroke,now,stroke.pull);
    }else{
      // Locate impact within an event that carries the tip beyond the ball.
      const time=contact?previousTime+(now-previousTime)*Math.min(1,previous/displacement):now;
      recordPosition(stroke,time,stroke.pull);
    }
    if(contact){
      const speed=measuredSpeed(stroke.samples);
      if(speed===null||speed<=0){
        stroke.needsRetry=true;stroke.armed=false;stroke.power=0;
        return null;
      }
      const gain=Number.isFinite(sensitivity)?Math.max(.1,Math.min(1.5,sensitivity)):1;
      stroke.power=Math.max(1,Math.min(100,speed/FULL_POWER_PIXELS_PER_SECOND*100*gain));
      stroke.fired=true;
      return stroke.power;
    }
  }
  const speed=measuredSpeed(stroke.samples);
  const gain=Number.isFinite(sensitivity)?Math.max(.1,Math.min(1.5,sensitivity)):1;
  stroke.power=speed===null||speed<=0?0:Math.max(1,Math.min(100,speed/FULL_POWER_PIXELS_PER_SECOND*100*gain));
  return null;
}

// The v2 UI scale doubles the previous percentage without changing physical gain.
export function strokeSensitivityGain(percent) {
  const value=Number(percent);
  return (Number.isFinite(value)?Math.max(20,Math.min(300,value)):60)/200;
}
