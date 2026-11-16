export function isFullscreenShortcut(event) {
  return event.key?.toLowerCase()==='f'&&!event.repeat&&
    !event.ctrlKey&&!event.altKey&&!event.metaKey;
}
export const IMMERSIVE_CLASS='scene-immersive';
export const WINDOWED_CLASS='scene-windowed';
const sessions=new WeakMap();

// Keep Escape in the game only where the browser explicitly permits locking it.
// Without Keyboard Lock (or on refusal), use viewport immersion, not an unsafe
// native fullscreen that would consume Escape before the pause menu sees it.
export function requestSceneFullscreen(stage,doc,{keyboard=globalThis.navigator?.keyboard}={}) {
  stage.classList.add(IMMERSIVE_CLASS);stage.classList.remove(WINDOWED_CLASS);
  let state=sessions.get(stage);
  if(!state){state={desired:true,pending:null,locked:false,keyboard};sessions.set(stage,state);}
  state.desired=true;
  if(state.pending)return state.pending;
  if(doc.fullscreenElement&&doc.fullscreenElement!==stage)return Promise.resolve();
  if(state.locked&&doc.fullscreenElement===stage)return Promise.resolve();
  if(!keyboard?.lock||!stage.requestFullscreen)return Promise.resolve();
  state.keyboard=keyboard;
  const exitNative=async()=>{if(doc.fullscreenElement===stage)try{await doc.exitFullscreen();}catch{}};
  state.pending=(async()=>{
    try{
      if(doc.fullscreenElement!==stage)await stage.requestFullscreen();
      if(!state.desired){await exitNative();return;}
      await keyboard.lock(['Escape']);state.locked=true;
      if(!state.desired){keyboard.unlock();state.locked=false;await exitNative();}
    }catch{
      if(state.locked)try{keyboard.unlock();}catch{}
      state.locked=false;await exitNative();
    }finally{state.pending=null;}
  })();
  return state.pending;
}

export function toggleSceneFullscreen(stage,doc,options) {
  if(stage.classList.contains(IMMERSIVE_CLASS)||doc.fullscreenElement===stage){
    const state=sessions.get(stage);if(state)state.desired=false;
    stage.classList.remove(IMMERSIVE_CLASS);stage.classList.add(WINDOWED_CLASS);
    if(state?.locked){try{state.keyboard.unlock();}catch{}state.locked=false;}
    if(doc.fullscreenElement===stage)try{return Promise.resolve(doc.exitFullscreen()).catch(()=>{});}catch{}
    return Promise.resolve();
  }
  return requestSceneFullscreen(stage,doc,options);
}
