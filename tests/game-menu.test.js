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
