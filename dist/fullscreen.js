export function isFullscreenShortcut(event) {
  return event.key?.toLowerCase() === 'f' && !event.repeat &&
    !event.ctrlKey && !event.altKey && !event.metaKey;
}

export const IMMERSIVE_CLASS = 'scene-immersive';

// Native fullscreen is preferred. Embedded browsers that deny the Fullscreen
// API still get a viewport-sized immersive stage with the same F shortcut.
// Keep requestFullscreen() synchronous with the originating user key event.
export function toggleSceneFullscreen(stage, doc) {
  if (doc.fullscreenElement === stage) return doc.exitFullscreen();
  if (stage?.classList.contains(IMMERSIVE_CLASS)) {
    stage.classList.remove(IMMERSIVE_CLASS);
    return Promise.resolve();
  }
  if (!doc.fullscreenElement) {
    const immersiveFallback = () => stage.classList.add(IMMERSIVE_CLASS);
    if (!stage.requestFullscreen) {
      immersiveFallback();
      return Promise.resolve();
    }
    try {
      return Promise.resolve(stage.requestFullscreen()).catch(immersiveFallback);
    } catch (_error) {
      immersiveFallback();
    }
  }
  return Promise.resolve();
}

// Starting/resuming a game requests native fullscreen during its user gesture.
// Unlike the F toggle, repeated starts never remove the viewport fallback.
export function requestSceneFullscreen(stage,doc) {
  if(doc.fullscreenElement)return Promise.resolve();
  const fallback=()=>stage.classList.add(IMMERSIVE_CLASS);
  try {
    if(!stage.requestFullscreen){fallback();return Promise.resolve();}
    return Promise.resolve(stage.requestFullscreen()).then(()=>{
      stage.classList.remove(IMMERSIVE_CLASS);
    }).catch(fallback);
  }catch {fallback();return Promise.resolve();}
}
