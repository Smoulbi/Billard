import test from 'node:test';
import assert from 'node:assert/strict';
import {isFullscreenShortcut,toggleSceneFullscreen,requestSceneFullscreen,IMMERSIVE_CLASS} from '../dist/fullscreen.js';

const stageWithClassList=()=>{
  const classes=new Set();
  return {classList:{contains:name=>classes.has(name),add:name=>classes.add(name),remove:name=>classes.delete(name)}};
};

test('F toggles fullscreen, while modifiers and repeated keystrokes do not',()=>{
  assert.equal(isFullscreenShortcut({key:'f'}),true);
  assert.equal(isFullscreenShortcut({key:'F',shiftKey:true}),true);
  assert.equal(isFullscreenShortcut({key:'f',ctrlKey:true}),false);
  assert.equal(isFullscreenShortcut({key:'f',altKey:true}),false);
  assert.equal(isFullscreenShortcut({key:'f',metaKey:true}),false);
  assert.equal(isFullscreenShortcut({key:'f',repeat:true}),false);
  assert.equal(isFullscreenShortcut({key:'v'}),false);
});

test('fullscreen targets only the game scene and toggles back on F',async()=>{
  const calls=[];
  const doc={fullscreenElement:null,
    exitFullscreen(){calls.push('exit');this.fullscreenElement=null;return Promise.resolve();}};
  const stage={...stageWithClassList(),requestFullscreen(){calls.push('enter');doc.fullscreenElement=stage;return Promise.resolve();}};
  const keyboard={lock:async keys=>calls.push(keys.join(',')),unlock:()=>calls.push('unlock')};
  await toggleSceneFullscreen(stage,doc,{keyboard});
  assert.equal(doc.fullscreenElement,stage);
  await toggleSceneFullscreen(stage,doc,{keyboard});
  assert.equal(doc.fullscreenElement,null);
  assert.deepEqual(calls,['enter','Escape','unlock','exit']);
});

test('fullscreen does not exit another application element',async()=>{
  const doc={fullscreenElement:{}};
  const stage={...stageWithClassList(),requestFullscreen(){throw new Error('should not request');}};
  await toggleSceneFullscreen(stage,doc);
  assert.notEqual(doc.fullscreenElement,stage);
});

test('fullscreen fallback is reversible when embedded browser denies permission',async()=>{
  const stage={...stageWithClassList(),requestFullscreen(){return Promise.reject(new Error('not granted'));}};
  const doc={fullscreenElement:null};
  await toggleSceneFullscreen(stage,doc,{keyboard:{lock:async()=>{}}});
  assert.equal(stage.classList.contains(IMMERSIVE_CLASS),true);
  await toggleSceneFullscreen(stage,doc);
  assert.equal(stage.classList.contains(IMMERSIVE_CLASS),false);
});


test('starting a game keeps viewport fallback on repeated denied fullscreen requests',async()=>{
  const stage={...stageWithClassList(),requestFullscreen(){return Promise.reject(new Error('denied'));}};
  const doc={fullscreenElement:null};
  const options={keyboard:{lock:async()=>{}}};
  await requestSceneFullscreen(stage,doc,options);await requestSceneFullscreen(stage,doc,options);
  assert.equal(stage.classList.contains(IMMERSIVE_CLASS),true);
});


test('without Keyboard Lock immersion never requests native fullscreen that would consume Escape',async()=>{
  let requested=false;
  const stage={...stageWithClassList(),requestFullscreen(){requested=true;return Promise.resolve();}};
  const doc={fullscreenElement:null};
  await requestSceneFullscreen(stage,doc,{keyboard:null});
  assert.equal(requested,false);assert.ok(stage.classList.contains(IMMERSIVE_CLASS));
  assert.equal(doc.fullscreenElement,null);
});
test('a denied Escape lock rolls native fullscreen back while preserving viewport immersion',async()=>{
  let exits=0;
  const doc={fullscreenElement:null,async exitFullscreen(){exits++;this.fullscreenElement=null;}};
  const stage={...stageWithClassList(),async requestFullscreen(){doc.fullscreenElement=stage;}};
  await requestSceneFullscreen(stage,doc,{keyboard:{lock:async()=>{throw new Error('denied');}}});
  assert.equal(exits,1);assert.equal(doc.fullscreenElement,null);
  assert.ok(stage.classList.contains(IMMERSIVE_CLASS));
});
test('F during a pending native request does not allow a late result to re-enter fullscreen',async()=>{
  let finish;
  const doc={fullscreenElement:null,async exitFullscreen(){this.fullscreenElement=null;}};
  const stage={...stageWithClassList(),requestFullscreen(){return new Promise(resolve=>{finish=()=>{doc.fullscreenElement=stage;resolve();};});}};
  const pending=requestSceneFullscreen(stage,doc,{keyboard:{lock:async()=>assert.fail('must not lock after F')}});
  await toggleSceneFullscreen(stage,doc);finish();await pending;
  assert.equal(doc.fullscreenElement,null);assert.equal(stage.classList.contains(IMMERSIVE_CLASS),false);
});
