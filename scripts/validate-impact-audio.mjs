// Run a real Web Audio offline render through the production player.
// Start the game HTTP server and Chrome with --remote-debugging-port=9222.
// node scripts/validate-impact-audio.mjs [http://127.0.0.1:9222] [output.json]
import {writeFile} from 'node:fs/promises';
const debugURL=process.argv[2]||'http://127.0.0.1:9222';
const pages=await (await fetch(`${debugURL}/json/list`)).json();
const page=pages.find(page=>page.type==='page'&&/^https?:/.test(page.url));
if(!page)throw new Error('No HTTP browser page available');
const socket=new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
try {
 const expression=`(${async function validate() {
  const {createImpactAudio}=await import(new URL('./impact-audio.js?v=0.76',location.href));
  const rate=48000;
  async function render(kinds,speed,count,maxVoices=12) {
   const offline=new OfflineAudioContext(2,rate,rate);
   let starts=0,stops=0;
   // OfflineAudioContext cannot be resumed before startRendering. The adapter
   // reports 'running' only to allow scheduling at time zero; all actual nodes,
   // decoding, gain, compression and sample rendering are native Web Audio.
   const context=new Proxy(offline,{get(target,key){
    if(key==='state')return 'running';
    if(key==='close')return ()=>Promise.resolve();
    if(key==='createBufferSource')return ()=>{
     const source=target.createBufferSource();
     const start=source.start.bind(source),stop=source.stop.bind(source);
     source.start=(...args)=>{starts++;return start(...args);};
     source.stop=(...args)=>{stops++;return stop(...args);};
     return source;
    };
    const value=Reflect.get(target,key,target);
    return typeof value==='function'?value.bind(target):value;
   }});
   const player=createImpactAudio({contextFactory:()=>context,maxVoices});
   await player.prepare();await player.unlock();
   for(let i=0;i<count;i++)if(!player.play(kinds[i%kinds.length],speed))throw new Error('Sample was not scheduled');
   const evicted=stops;
   const result=await offline.startRendering();
   let peak=0;let sumSquares=0;
   for(let c=0;c<result.numberOfChannels;c++)for(const value of result.getChannelData(c)){
    peak=Math.max(peak,Math.abs(value));sumSquares+=value*value;
   }
   const samples=Array.from({length:result.numberOfChannels},(_,c)=>result.getChannelData(c));
   await player.dispose();
   return {peak,rms:Math.sqrt(sumSquares/result.length/result.numberOfChannels),starts,evicted,samples};
  }
  const isolated=[];
  for(const kind of ['cue','ball','cushion'])for(const [low,high] of [[0.03,0.06],[0.75,1.5],[6,12],[12,24]]){
   const a=await render([kind],low,1),b=await render([kind],high,1);
   let maxError=0;
   for(let c=0;c<a.samples.length;c++)for(let i=0;i<a.samples[c].length;i++)
    maxError=Math.max(maxError,Math.abs(b.samples[c][i]-2*a.samples[c][i]));
   const ratio=b.peak/a.peak;
   if(Math.abs(ratio-2)>1e-5||maxError>1e-6)throw new Error('Nonlinear isolated impact: '+kind);
   isolated.push({kind,speeds:[low,high],peaks:[a.peak,b.peak],peakRatio:ratio,maxSampleError:maxError});
  }
  const bursts=[];
  for(const kinds of [['cue'],['ball'],['cushion'],['cue','ball','cushion']])for(const count of [12,100]){
   const {samples,...result}=await render(kinds,24,count,100);
   if(result.peak>=1||result.evicted!==Math.max(0,count-12))throw new Error('Burst clipping or voice budget exceeded');
   bursts.push({kinds,count,requestedMaxVoices:100,...result});
  }
  return {measuredAt:new Date().toISOString(),browser:navigator.userAgent,sampleRate:rate,
   method:'Production createImpactAudio with native OfflineAudioContext nodes; scheduling-only state adapter; decoded same-origin WAVs; no subjective audition.',isolated,bursts};
 }.toString()})()`;
 const result=await new Promise((resolve,reject)=>{
  socket.addEventListener('message',event=>{
   const response=JSON.parse(event.data);if(response.id!==1)return;
   if(response.error||response.result.exceptionDetails)reject(new Error(JSON.stringify(response.error||response.result.exceptionDetails)));
   else resolve(response.result.result.value);
  });
  socket.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
 });
 const json=JSON.stringify(result,null,2)+'\n';
 if(process.argv[3])await writeFile(process.argv[3],json);
 console.log(json);
} finally {socket.close();}
