import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('every UI control used by the game is registered and present in the page',()=>{
  const game=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const declaration=game.match(/^const ids = \[([^\]]+)\];/m);
  assert.ok(declaration,'UI element list missing');
  const ids=new Set([...declaration[1].matchAll(/'([^']+)'/g)].map(match=>match[1]));
  const used=new Set([...game.matchAll(/\bel\.([A-Za-z][\w]*)/g)].map(match=>match[1]));
  for(const id of used)assert.ok(ids.has(id),`game.js uses unregistered control: ${id}`);
  for(const id of ids)assert.ok(html.includes(`id="${id}"`),`missing HTML control: ${id}`);
});

test('ball-in-hand remains adjustable after its first placement until the next stroke',()=>{
  const game=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
  const placement=game.slice(game.indexOf('function cuePlacementAvailable()'),
    game.indexOf('function moveCueTo('));
  const pointerRelease=game.slice(game.indexOf('const releasePointer=e=>{'),
    game.indexOf("el.gameCanvas.addEventListener('pointerup'"));
  const shooting=game.slice(game.indexOf('function shoot('),game.indexOf('function pocketBall('));
  assert.match(placement,/match\.ballInHand/,'placement is allowed while ball-in-hand is owned');
  assert.doesNotMatch(pointerRelease,/match\.ballInHand\s*=\s*null/,
    'releasing the first placement must not consume ball-in-hand');
  assert.match(shooting,/if\(match\)match\.ballInHand=null/,
    'the stroke consumes ball-in-hand');
  assert.match(placement,/REPLACER LA BLANCHE/);
});

test('victory dialog is wired to the match-ending state and restart controls',()=>{
  const game=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  assert.match(html,/id="victoryOverlay"[^>]*aria-modal="true"/);
  assert.match(html,/id="victoryWinner"/);
  assert.match(html,/id="victoryReason"/);
  assert.match(html,/id="victoryNewMatch"/);
  assert.match(game,/if\(isWon\)showVictoryScreen\(\)/);
  assert.match(game,/el\.victoryNewMatch\.addEventListener\('click',showMatchSetup\)/);
});


test('the pre-shot call panel is visible only in eight-ball playing with calls enabled',()=>{
  const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
  const functionSource=source.slice(source.indexOf('function refreshCallUI()'),source.indexOf('function captureTrainingSnapshot()'));
  for(const [match,expected] of [
    [null,false],
    [{mode:'eight',phase:'playing',callPocket:false},false],
    [{mode:'eight',phase:'playing',callPocket:true},true],
    [{mode:'eight',phase:'break',callPocket:true},false],
    [{mode:'eight',phase:'finished',callPocket:true},false],
    [{mode:'nine',phase:'playing',callPocket:true},false]
  ]){
    const classes={toggle(){}};
    const el={callPanel:{hidden:true,classList:classes},
      calledBall:{value:'',replaceChildren(){}},
      safetyButton:{classList:classes,setAttribute(){}},
      calledPockets:{querySelectorAll:()=>[]},callHint:{}};
    runInNewContext(functionSource+';refreshCallUI();',{
      match:match?{...match,groups:[null,null],current:0}:null,el,
      balls:[],safetyCalled:false,chosenPocket:null,groupOf:()=>null,Option:class {}
    });
    assert.equal(!el.callPanel.hidden,expected,JSON.stringify(match));
  }
});


test('camera edits redraw a paused view without advancing physics or rendering unchanged frames',()=>{
  const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
  const animate=source.slice(source.indexOf('function animate(t)'),source.indexOf('function fallbackGeometry()'));
  for(const fallback of [false,true]){
    let draws=0;
    const state={gamePaused:true,pausedViewDirty:true,lastFrame:0,shotSimTime:10,
      fallbackCtx:fallback?{}:null,renderer:{render(){draws++;}},scene:{},camera:{},
      drawFallback(){draws++;},physicsStep(){assert.fail('settings must keep physics paused');}};
    runInNewContext(animate+';animate(100);animate(200);',state);
    assert.equal(draws,1);assert.equal(state.lastFrame,200);assert.equal(state.shotSimTime,10);
    state.pausedViewDirty=true;
    runInNewContext('animate(300);',state);
    assert.equal(draws,2);assert.equal(state.pausedViewDirty,false);assert.equal(state.shotSimTime,10);
  }
});
