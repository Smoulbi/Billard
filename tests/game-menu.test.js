import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameMenu,playerBallState} from '../dist/game-menu.js';
function rig({canOpen=()=>true,fail=false}={}) {
  const listeners={},calls=[];
  const dialog={open:false,addEventListener(name,fn){listeners[name]=fn;},
    showModal(){if(fail)throw new Error('unavailable');this.open=true;},close(){this.open=false;listeners.close();}};
  const menu=createGameMenu({dialog,canOpen,onOpen:()=>calls.push('pause'),onClose:()=>calls.push('resume')});
  return {dialog,menu,calls,listeners};
}
test('options pause once and resume once through close, Escape or native close',()=>{
  for(const route of ['button','escape','native']){
    const r=rig();assert.ok(r.menu.open());assert.equal(r.menu.open(),false);
    if(route==='button')r.menu.close();
    if(route==='escape'){let prevented=false;r.listeners.cancel({preventDefault(){prevented=true;}});assert.ok(prevented);}
    if(route==='native'){r.dialog.open=false;r.listeners.close();}
    assert.equal(r.menu.isOpen,false);assert.equal(r.menu.close(),false);
    assert.deepEqual(r.calls,['pause','resume']);
  }
});
test('unavailable menus cannot leave the game paused and guarded dialogs do not open',()=>{
  const denied=rig({canOpen:()=>false});assert.equal(denied.menu.open(),false);assert.deepEqual(denied.calls,[]);
  const failed=rig({fail:true});assert.equal(failed.menu.open(),false);assert.deepEqual(failed.calls,['pause','resume']);
});
test('player HUD distinguishes groups, potted balls and the final eight',()=>{
  const match={mode:'eight',groups:['solid','stripe']};
  const balls=Array.from({length:16},(_,num)=>({num,active:num!==2}));
  assert.deepEqual(playerBallState(match,balls,0).map(b=>b.num),[1,2,3,4,5,6,7]);
  assert.equal(playerBallState(match,balls,0).find(b=>b.num===2).potted,true);
  assert.ok(playerBallState(match,balls,1).every(b=>b.num>=9&&!b.potted));
  for(const b of balls)if(b.num>=1&&b.num<=7)b.active=false;
  assert.deepEqual(playerBallState(match,balls,0).at(-1),{num:8,potted:false,target:true});
  assert.deepEqual(playerBallState({mode:'eight',groups:[null,null]},balls,0),[]);
  assert.deepEqual(playerBallState({mode:'nine'},balls,0),[]);
});


function page({fail=false}={}) {
  const listeners={},queued=[];
  return {open:false,listeners,queued,
    addEventListener(name,callback){listeners[name]=callback;},
    showModal(){if(fail)throw new Error('unavailable');this.open=true;},
    close(){this.open=false;queued.push(()=>listeners.close());},
    flush(){for(const callback of queued.splice(0))callback();},
    escape(){let prevented=false;listeners.cancel({preventDefault(){prevented=true;}});return prevented;}
  };
}
test('pause and options pages share one balanced pause even with asynchronous old close events',()=>{
  const pause=page(),options=page(),calls=[];
  const menu=createGameMenu({dialog:pause,onOpen:()=>calls.push('pause'),onClose:()=>calls.push('resume')});
  assert.ok(menu.open());assert.equal(menu.dialog,pause);
  assert.ok(menu.show(options));assert.equal(menu.dialog,options);assert.ok(options.open);assert.equal(pause.open,false);
  pause.flush();assert.ok(menu.isOpen);assert.deepEqual(calls,['pause']);
  assert.ok(menu.show(pause));assert.equal(menu.dialog,pause);options.flush();
  assert.ok(menu.isOpen);assert.deepEqual(calls,['pause']);
  assert.ok(menu.close());assert.equal(menu.dialog,null);pause.flush();
  assert.equal(menu.isOpen,false);assert.deepEqual(calls,['pause','resume']);
});
test('stale close events do not close a page that has since been reopened',()=>{
  const pause=page(),options=page(),calls=[];
  const menu=createGameMenu({dialog:pause,onClose:()=>calls.push('resume')});
  menu.open();menu.show(options);menu.show(pause);
  pause.flush();options.flush();assert.ok(menu.isOpen);assert.equal(menu.dialog,pause);assert.ok(pause.open);
  assert.deepEqual(calls,[]);menu.close();pause.flush();assert.deepEqual(calls,['resume']);
});
test('options can open directly and Escape can return to pause without resuming',()=>{
  const pause=page(),options=page(),calls=[];
  let menu;
  menu=createGameMenu({dialog:pause,onOpen:()=>calls.push('pause'),onClose:()=>calls.push('resume'),
    onEscape:target=>target===options?menu.show(pause):menu.close()});
  assert.ok(menu.open(options));assert.equal(menu.dialog,options);
  assert.ok(options.escape());assert.equal(menu.dialog,pause);assert.deepEqual(calls,['pause']);
  assert.ok(pause.escape());options.flush();pause.flush();assert.deepEqual(calls,['pause','resume']);
});
test('failed page transitions preserve the original usable modal and pause interval',()=>{
  const pause=page(),unavailable=page({fail:true}),calls=[];
  const menu=createGameMenu({dialog:pause,onOpen:()=>calls.push('pause'),onClose:()=>calls.push('resume')});
  menu.open();assert.equal(menu.show(unavailable),false);
  assert.ok(pause.open);assert.ok(menu.isOpen);assert.equal(menu.dialog,pause);assert.deepEqual(calls,['pause']);
  assert.ok(menu.close());pause.flush();assert.deepEqual(calls,['pause','resume']);
});
test('native close on the active override resumes once, while stale cancel events are ignored',()=>{
  const pause=page(),options=page(),calls=[];
  const menu=createGameMenu({dialog:pause,onClose:()=>calls.push('resume')});
  menu.open();menu.show(options);
  assert.equal(pause.escape(),false);assert.ok(menu.isOpen);
  options.close();options.flush();pause.flush();
  assert.equal(menu.isOpen,false);assert.deepEqual(calls,['resume']);
});
