// Keep one pause interval while moving between native modal menu pages.
export function createGameMenu({dialog,onOpen=()=>{},onClose=()=>{},canOpen=()=>true,onEscape}) {
  let active=false,currentDialog=null;
  const bound=new Set();
  function finish(target) {
    if(!active||currentDialog!==target)return;
    active=false;currentDialog=null;onClose();
  }
  function bind(target) {
    if(bound.has(target))return;
    bound.add(target);
    target.addEventListener('cancel',event=>{
      if(!active||currentDialog!==target)return;
      event.preventDefault();
      if(onEscape)onEscape(target);else close();
    });
    target.addEventListener('close',()=>{
      // Native close events are queued. A previous page may already be open
      // again when its old close event arrives; it must not resume the game.
      if(!target.open)finish(target);
    });
  }
  bind(dialog);
  function open(target=dialog) {
    if(active||!canOpen())return false;
    bind(target);active=true;currentDialog=target;
    try {onOpen();target.showModal();return true;}
    catch {finish(target);return false;}
  }
  function show(target) {
    if(!active)return open(target);
    if(target===currentDialog)return true;
    if(!canOpen())return false;
    bind(target);
    // Open the destination first: a rejected showModal leaves the existing
    // page usable, and successful transitions never end the pause interval.
    try {target.showModal();}catch {return false;}
    const previous=currentDialog;currentDialog=target;
    if(previous.open)previous.close();
    return true;
  }
  function close() {
    if(!active)return false;
    const target=currentDialog;
    if(target.open)target.close();
    finish(target);return true;
  }
  return {open,show,close,toggle:()=>active?close():open(),
    get isOpen(){return active;},get dialog(){return currentDialog;}};
}

export function playerBallState(match,balls,player) {
  if(match?.mode!=='eight'||!match.groups?.[player])return [];
  const numbers=match.groups[player]==='solid'?[1,2,3,4,5,6,7]:[9,10,11,12,13,14,15];
  const active=new Set(balls.filter(ball=>ball.active).map(ball=>ball.num));
  const cleared=numbers.every(num=>!active.has(num));
  return [...numbers,...(cleared?[8]:[])].map(num=>({num,potted:!active.has(num),target:num===8}));
}
