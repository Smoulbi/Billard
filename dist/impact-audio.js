// The chosen samples are documented, together with their licences, in audio/.
export function impactGain(speed) {
  if(!Number.isFinite(speed)||speed<=0)return 0;
  const level=Math.min(speed,24)/12;
  // Lift quiet impacts smoothly without changing full-speed hits or the cap.
  return level<1 ? Math.sqrt(level) : level;
}

const sampleURLs=Object.fromEntries(['cue','ball','cushion'].map(kind=>
  [kind,new URL(`./audio/${kind}.wav`,import.meta.url).href]));

export function createImpactAudio({
  contextFactory=()=>{
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    return AudioContext ? new AudioContext() : null;
  },
  fetcher=(url)=>globalThis.fetch(url),
  urls=sampleURLs,
  maxVoices=12
}={}) {
  const budget=Number.isFinite(maxVoices) ? Math.max(1,Math.min(12,Math.floor(maxVoices))) : 12;
  const downloads=new Map(),decodes=new Map(),buffers=new Map(),voices=[];
  let context=null,master=null,compressor=null,muted=false,disposed=false;

  function download(kind) {
    if(!downloads.has(kind))downloads.set(kind,Promise.resolve().then(()=>fetcher(urls[kind]))
      .then(response=>{
        if(!response.ok)throw new Error('Audio download failed');
        return response.arrayBuffer();
      }).catch(()=>null));
    return downloads.get(kind);
  }
  function decode(kind) {
    if(!context||disposed)return Promise.resolve(null);
    if(!decodes.has(kind))decodes.set(kind,download(kind).then(async data=>{
      if(!data||disposed)return null;
      const buffer=await context.decodeAudioData(data.slice(0));
      if(disposed)return null;
      buffers.set(kind,buffer);
      return buffer;
    }).catch(()=>null));
    return decodes.get(kind);
  }
  function prepare() {
    if(disposed)return Promise.resolve([]);
    return Promise.all(Object.keys(sampleURLs).map(kind=>context ? decode(kind) : download(kind)));
  }
  function unlock() {
    if(disposed)return Promise.resolve(false);
    try {
      if(!context) {
        context=contextFactory();
        if(!context)return Promise.resolve(false);
        master=context.createGain();master.gain.value=0.24;
        compressor=context.createDynamicsCompressor();
        for(const [key,value] of Object.entries({threshold:-12,knee:0,ratio:20,attack:0,release:0.05}))
          compressor[key].value=value;
        master.connect(compressor);compressor.connect(context.destination);
      }
      // Call resume directly in the user gesture, before any download awaits.
      const resumed=context.state==='running' ? Promise.resolve() : Promise.resolve(context.resume());
      return Promise.all([resumed.catch(()=>null),prepare()])
        .then(()=>!disposed&&context.state==='running').catch(()=>false);
    }catch {return Promise.resolve(false);}
  }
  function release(voice,interrupt=false) {
    if(voice.released)return;
    voice.released=true;
    const index=voices.indexOf(voice);if(index>=0)voices.splice(index,1);
    voice.source.onended=null;
    if(interrupt)try {voice.source.stop();}catch {}
    try {voice.source.disconnect();}catch {}
    try {voice.gain.disconnect();}catch {}
  }
  function addVoice(source,amplitude) {
    while(voices.length>=budget)release(voices[0],true);
    let gain,voice;
    try {
      gain=context.createGain();gain.gain.value=amplitude;
      source.connect(gain);gain.connect(master);
      voice={source,gain,released:false};voices.push(voice);
      source.onended=()=>release(voice);
      source.start();
      return voice;
    }catch {
      if(voice)release(voice,true);
      else {try {source.disconnect();gain?.disconnect();}catch {}}
      return null;
    }
  }
  function available() {return !disposed&&!muted&&context?.state==='running'&&master;}
  function play(kind,speed) {
    const amplitude=impactGain(speed);
    if(!available()||!amplitude||!buffers.has(kind))return false;
    try {
      const source=context.createBufferSource();source.buffer=buffers.get(kind);
      return !!addVoice(source,amplitude);
    }catch {return false;}
  }
  function playPocket() {
    if(!available())return false;
    let voice;
    try {
      const source=context.createOscillator();source.type='triangle';
      const now=context.currentTime;
      source.frequency.setValueAtTime(155,now);
      source.frequency.exponentialRampToValueAtTime(65,now+0.075);
      voice=addVoice(source,0.105);
      if(!voice)return false;
      voice.gain.gain.setValueAtTime(0.105,now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0004,now+0.09);
      source.stop(now+0.1);
      return true;
    }catch {if(voice)release(voice,true);return false;}
  }
  function stop() {for(const voice of [...voices])release(voice,true);}
  function setMuted(value) {muted=!!value;if(muted)stop();}
  function dispose() {
    if(disposed)return Promise.resolve();
    disposed=true;stop();buffers.clear();downloads.clear();decodes.clear();
    try {master?.disconnect();compressor?.disconnect();}catch {}
    try {return Promise.resolve(context?.close()).catch(()=>{});}catch {return Promise.resolve();}
  }
  return {prepare,unlock,play,playPocket,setMuted,stop,dispose};
}
