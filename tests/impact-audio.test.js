import test from 'node:test';
import assert from 'node:assert/strict';
import {impactGain,createImpactAudio} from '../dist/impact-audio.js';

function rig(options={}) {
  const sources=[],gains=[],requests=[],decoded=[],compressors=[];
  const param=()=>({value:0,setValueAtTime(value){this.value=value;},exponentialRampToValueAtTime(value){this.end=value;}});
  const node=()=>({disconnected:false,connect(to){this.to=to;},disconnect(){this.disconnected=true;}});
  const context={state:'suspended',currentTime:1,destination:{},
    resume(){if(options.rejectResume)return Promise.reject(new Error('denied'));this.state='running';return Promise.resolve();},
    close(){this.state='closed';return Promise.resolve();},
    createGain(){const n={...node(),gain:param()};gains.push(n);return n;},
    createDynamicsCompressor(){const n=node();for(const key of ['threshold','knee','ratio','attack','release'])n[key]=param();compressors.push(n);return n;},
    createBufferSource(){const n={...node(),playbackRate:{value:1},start(){this.started=true;},stop(time){if(time===undefined)this.stopped=true;else this.stopTime=time;}};sources.push(n);return n;},
    createOscillator(){const n=this.createBufferSource();n.frequency=param();return n;},
    async decodeAudioData(data){decoded.push(data);if(options.invalid&&decoded.length===1)throw new Error('invalid');return {data};}
  };
  let factories=0;
  const audio=createImpactAudio({contextFactory:()=>{factories++;return context;},
    fetcher:async url=>{requests.push(url);if(options.fail&&url.includes(options.fail))throw new Error('missing');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};},
    maxVoices:options.maxVoices});
  return {audio,context,sources,gains,requests,decoded,compressors,get factories(){return factories;}};
}

test('quiet impacts are lifted smoothly while strong impacts retain their gain and cap',()=>{
  for(const invalid of [0,-1,NaN,Infinity,-Infinity,undefined,null,'12'])assert.equal(impactGain(invalid),0);
  let previous=0;
  for(const speed of [0.0001,0.045,0.1,0.5,1,6,12,18,24]){
    const gain=impactGain(speed);
    assert.ok(gain>previous);previous=gain;
    if(speed<12)assert.ok(gain>speed/12);
    else assert.equal(gain,speed/12);
  }
  assert.ok(impactGain(0.045)>0.06,'threshold-level collisions receive the intended quiet-impact boost');
  assert.ok(impactGain(1e-12)<1e-6,'no artificial minimum or sound at rest');
  assert.ok(Math.abs(impactGain(12-1e-8)-impactGain(12+1e-8))<1e-8);
  assert.equal(impactGain(12),1);assert.equal(impactGain(24),2);assert.equal(impactGain(100),2);
});

test('preparation is context-free and shares exactly three downloads and decodes',async()=>{
  const r=rig();await Promise.all([r.audio.prepare(),r.audio.prepare()]);
  assert.equal(r.factories,0);assert.equal(r.requests.length,3);assert.equal(r.decoded.length,0);
  await Promise.all([r.audio.unlock(),r.audio.unlock(),r.audio.prepare()]);
  assert.equal(r.factories,1);assert.equal(r.requests.length,3);assert.equal(r.decoded.length,3);
  assert.ok(r.requests.some(url=>url.endsWith('/audio/cue.wav')));
  assert.ok(r.requests.some(url=>url.endsWith('/audio/ball.wav')));
  assert.ok(r.requests.some(url=>new URL(url).pathname.endsWith('/audio/cushion.wav')&&new URL(url).searchParams.get('v')==='0.78'));
  for(const [index,kind] of ['cue','ball','cushion'].entries()) {
    assert.equal(r.audio.play(kind,0.12),true);
    assert.equal(r.sources[index].buffer.data,r.decoded[index]);
    assert.equal(r.sources[index].playbackRate.value,1);
    assert.equal(r.gains[index+1].gain.value,kind==='cushion'?0.1*10**(-8/20):0.1);
  }
  assert.equal(r.gains[0].gain.value,0.24);
  assert.equal(r.compressors[0].threshold.value,-12);
  assert.equal(r.compressors[0].ratio.value,20);
  assert.equal(r.compressors[0].knee.value,0);
  assert.equal(r.compressors[0].attack.value,0);
  assert.equal(r.compressors[0].release.value,0.05);
});

test('unavailable and suspended impacts are discarded without delayed playback',async()=>{
  const r=rig();assert.equal(r.audio.play('cue',12),false);
  await r.audio.unlock();assert.equal(r.sources.length,0);
  r.context.state='suspended';assert.equal(r.audio.play('cue',12),false);
  await r.audio.unlock();assert.equal(r.sources.length,0);
  assert.equal(r.audio.play('unknown',12),false);assert.equal(r.audio.play('cue',NaN),false);
});

test('voice budget never exceeds twelve and interrupts oldest voices with disconnection',async()=>{
  const r=rig({maxVoices:100});await r.audio.unlock();
  for(let i=0;i<100;i++)assert.equal(r.audio.play('ball',24),true);
  assert.equal(r.sources.filter(s=>!s.stopped).length,12);
  for(let i=0;i<88;i++){assert.ok(r.sources[i].stopped);assert.ok(r.sources[i].disconnected);assert.ok(r.gains[i+1].disconnected);}
  r.sources[99].onended();assert.ok(r.sources[99].disconnected);assert.ok(r.gains[100].disconnected);
  r.audio.stop();assert.equal(r.sources.filter(s=>!s.stopped&&!s.disconnected).length,0);
});

test('smaller voice budgets apply and muting immediately stops all families',async()=>{
  const r=rig({maxVoices:2});await r.audio.unlock();
  r.audio.play('cue',12);r.audio.play('ball',12);r.audio.playPocket();
  assert.ok(r.sources[0].stopped);assert.equal(r.sources.filter(s=>!s.stopped).length,2);
  r.audio.setMuted(true);assert.ok(r.sources.every(s=>s.stopped&&s.disconnected));
  assert.equal(r.audio.play('cushion',12),false);assert.equal(r.audio.playPocket(),false);
  r.audio.setMuted(false);assert.equal(r.audio.play('cushion',12),true);
});

test('missing or invalid samples do not prevent other sound families',async()=>{
  for(const options of [{fail:'cue.wav'},{invalid:true}]) {
    const r=rig(options);assert.equal(await r.audio.unlock(),true);
    assert.equal(r.audio.play('cue',12),false);
    assert.equal(r.audio.play('ball',12),true);assert.equal(r.audio.play('cushion',12),true);
  }
});

test('resume rejection is contained and a later user gesture can retry',async()=>{
  const options={rejectResume:true},r=rig(options);
  assert.equal(await r.audio.unlock(),false);assert.equal(r.audio.play('cue',12),false);
  options.rejectResume=false;assert.equal(await r.audio.unlock(),true);
  assert.equal(r.audio.play('cue',12),true);assert.equal(r.decoded.length,3);
});

test('dispose during pending downloads prevents decoding and playback',async()=>{
  let resolve;
  const response=new Promise(done=>{resolve=done;});
  const r=rig();
  const audio=createImpactAudio({contextFactory:()=>r.context,fetcher:()=>response});
  const pending=audio.unlock();await Promise.resolve();await audio.dispose();
  resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
  assert.equal(await pending,false);assert.equal(r.decoded.length,0);
  assert.equal(audio.play('cue',12),false);assert.equal(await audio.unlock(),false);
  await audio.prepare();await audio.dispose();assert.equal(r.context.state,'closed');
});

test('pocket retains the separate triangle envelope and uses shared voice cleanup',async()=>{
  const r=rig();await r.audio.unlock();assert.equal(r.audio.playPocket(),true);
  const source=r.sources[0],gain=r.gains[1];
  assert.equal(source.type,'triangle');assert.equal(source.frequency.value,155);assert.equal(source.frequency.end,65);
  assert.equal(gain.gain.value,0.105);assert.equal(gain.gain.end,0.0004);
  source.onended();assert.ok(source.disconnected);assert.ok(gain.disconnected);
  await r.audio.dispose();assert.ok(r.gains[0].disconnected);assert.ok(r.compressors[0].disconnected);
});

test('dispose during decoding discards late buffers and contains decoding failures',async()=>{
  for(const rejectDecode of [false,true]) {
    const r=rig();let resolveDecode,rejectPending,decodeCalls=0;
    const decoding=new Promise((resolve,reject)=>{resolveDecode=resolve;rejectPending=reject;});
    r.context.decodeAudioData=()=>{decodeCalls++;return decoding;};
    const audio=createImpactAudio({contextFactory:()=>r.context,
      fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});
    const pending=audio.unlock();
    while(decodeCalls<3)await new Promise(resolve=>setImmediate(resolve));
    await audio.dispose();
    if(rejectDecode)rejectPending(new Error('decoder failed after disposal'));
    else resolveDecode({});
    assert.equal(await pending,false);
    assert.equal(audio.play('cue',12),false);
    assert.equal(audio.play('ball',12),false);
    assert.equal(audio.play('cushion',12),false);
    assert.equal(r.sources.length,0);
  }
});


test('only cushion voices are reduced by eight decibels at quiet and strong speeds',async()=>{
  const r=rig();await r.audio.unlock();
  for(const speed of [0.045,0.12,6,12,24]){
    for(const kind of ['cue','ball','cushion']){
      r.audio.play(kind,speed);
      const applied=r.gains.at(-1).gain.value;
      assert.equal(applied,impactGain(speed)*(kind==='cushion'?10**(-8/20):1));
    }
  }
  r.audio.playPocket();assert.equal(r.gains.at(-1).gain.value,0.105);
});
