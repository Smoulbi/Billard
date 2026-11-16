// Keep menu pause/resume balanced, including native dialog Escape/close events.
export function createGameMenu({dialog,onOpen=()=>{},onClose=()=>{},canOpen=()=>true}) {
  let active=false;
  const finish=()=>{if(!active)return;active=false;onClose();};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',finish);
  function open() {
    if(active||!canOpen())return false;
    active=true;onOpen();
    try {dialog.showModal();return true;}
    catch {finish();return false;}
  }
  function close() {
    if(!active)return false;
    if(dialog.open)dialog.close();
    finish();return true;
  }
  return {open,close,toggle:()=>active?close():open(),get isOpen(){return active;}};
}

export function playerBallState(match,balls,player) {
  if(match?.mode!=='eight'||!match.groups?.[player])return [];
  const numbers=match.groups[player]==='solid'?[1,2,3,4,5,6,7]:[9,10,11,12,13,14,15];
  const active=new Set(balls.filter(ball=>ball.active).map(ball=>ball.num));
  const cleared=numbers.every(num=>!active.has(num));
  return [...numbers,...(cleared?[8]:[])].map(num=>({num,potted:!active.has(num),target:num===8}));
}
