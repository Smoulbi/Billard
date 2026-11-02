import test from 'node:test';
import assert from 'node:assert/strict';
import {isFullscreenShortcut,toggleSceneFullscreen,IMMERSIVE_CLASS} from '../dist/fullscreen.js';

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
  await toggleSceneFullscreen(stage,doc);
  assert.equal(doc.fullscreenElement,stage);
  await toggleSceneFullscreen(stage,doc);
  assert.equal(doc.fullscreenElement,null);
  assert.deepEqual(calls,['enter','exit']);
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
  await toggleSceneFullscreen(stage,doc);
  assert.equal(stage.classList.contains(IMMERSIVE_CLASS),true);
  await toggleSceneFullscreen(stage,doc);
  assert.equal(stage.classList.contains(IMMERSIVE_CLASS),false);
});
