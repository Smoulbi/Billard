import test from 'node:test';
import assert from 'node:assert/strict';
import {newNineBallMatch,nineBallRack,adjudicateNineBall,resolveNineBallDecision,nineBallVictoryPresentation} from '../dist/nine-ball-rules.js';
import {RADIUS} from '../dist/physics.js';
const full=Array.from({length:9},(_,i)=>i+1);
const shot=(extra={})=>({firstContact:1,railAfterContact:true,breakRails:4,remainingBefore:full,pocketed:[],...extra});
const playing=()=>({...newNineBallMatch(),phase:'playing',ballInHand:null});
test('nine-ball diamond has nine unique nonoverlapping balls, one at apex and nine at centre',()=>{
  const rack=nineBallRack(RADIUS);
  assert.deepEqual(rack.map(b=>b.num).sort((a,b)=>a-b),full);
  assert.equal(rack[0].num,1);assert.equal(rack[4].num,9);assert.ok(Math.abs(rack[4].z)<=RADIUS*.001);
  for(let i=0;i<rack.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(rack[i].x-rack[j].x,rack[i].z-rack[j].z)>=2*RADIUS);
});
test('legal break retains player only with a pot and enables one push-out',()=>{
  const dry=adjudicateNineBall(newNineBallMatch(),shot());
  assert.equal(dry.current,1);assert.equal(dry.pushOutAvailable,true);
  const pot=adjudicateNineBall(newNineBallMatch(),shot({pocketed:[{num:2,pocket:0}]}));
  assert.equal(pot.current,0);assert.equal(pot.pushOutAvailable,true);
  assert.equal(adjudicateNineBall(pot,shot()).pushOutAvailable,false);
});
test('lowest remaining ball must be contacted first, even when nine is pocketed',()=>{
  const legal=adjudicateNineBall(playing(),shot({firstContact:3,remainingBefore:[3,5,9],pocketed:[{num:9,pocket:2}]}));
  assert.equal(legal.phase,'finished');assert.equal(legal.winner,0);
  const foul=adjudicateNineBall(playing(),shot({firstContact:5,remainingBefore:[3,5,9],pocketed:[{num:9,pocket:2}]}));
  assert.equal(foul.phase,'playing');assert.equal(foul.ballInHand,'anywhere');assert.equal(foul.spotNine,true);
});
test('legal nine wins on the break, but a scratch spots it and gives ball-in-hand',()=>{
  const win=adjudicateNineBall(newNineBallMatch(),shot({pocketed:[{num:9,pocket:0}]}));
  assert.equal(win.winner,0);assert.match(nineBallVictoryPresentation(win).outcome,/9/);
  const foul=adjudicateNineBall(newNineBallMatch(),shot({scratch:true,pocketed:[{num:9,pocket:0}]}));
  assert.equal(foul.winner,null);assert.equal(foul.spotNine,true);assert.equal(foul.current,1);assert.equal(foul.ballInHand,'anywhere');
});
test('scratch, wrong first ball, no contact, no rail, and illegal break are fouls',()=>{
  for(const extra of [{scratch:true},{firstContact:2},{firstContact:null},{railAfterContact:false}]){
    const result=adjudicateNineBall(playing(),shot(extra));
    assert.equal(result.ballInHand,'anywhere');assert.equal(result.current,1);assert.equal(result.fouls[0],1);
  }
  const illegal=adjudicateNineBall(newNineBallMatch(),shot({breakRails:3}));
  assert.equal(illegal.ballInHand,'anywhere');assert.equal(illegal.pushOutAvailable,false);
});
test('any legal pot continues without requiring ball or pocket announcement',()=>{
  const result=adjudicateNineBall(playing(),shot({pocketed:[{num:7,pocket:5}]}));
  assert.equal(result.current,0);assert.equal(result.lastResult.kind,'continue');
  assert.equal(result.callPocket,false);
});
test('push-out waives first contact and rail; opponent can accept or pass back',()=>{
  const afterBreak=adjudicateNineBall(newNineBallMatch(),shot());
  const pushed=adjudicateNineBall(afterBreak,shot({pushOut:true,firstContact:null,railAfterContact:false,pocketed:[{num:9,pocket:3}]}));
  assert.equal(pushed.phase,'decision');assert.equal(pushed.spotNine,true);assert.equal(pushed.current,0);
  assert.equal(resolveNineBallDecision(pushed,'take-shot').current,0);
  assert.equal(resolveNineBallDecision(pushed,'pass-shot').current,1);
  assert.equal(resolveNineBallDecision(pushed,'pass-shot').pushOutAvailable,false);
  assert.throws(()=>adjudicateNineBall(playing(),shot({pushOut:true})));
  assert.throws(()=>resolveNineBallDecision(pushed,'accept'));
});
test('scratched push-out is a foul and offers no accept/pass decision',()=>{
  const state=adjudicateNineBall(newNineBallMatch(),shot());
  const result=adjudicateNineBall(state,shot({pushOut:true,scratch:true}));
  assert.equal(result.phase,'playing');assert.equal(result.lastResult.kind,'foul');assert.equal(result.ballInHand,'anywhere');
});
test('three consecutive fouls lose, a legal intervening shot resets the counter',()=>{
  const state={...playing(),fouls:[2,1]};
  const lost=adjudicateNineBall(state,shot({firstContact:null}));
  assert.equal(lost.winner,1);assert.equal(lost.phase,'finished');
  assert.match(nineBallVictoryPresentation(lost).outcome,/TROIS FAUTES/);
  const legal=adjudicateNineBall(state,shot());assert.deepEqual(legal.fouls,[0,1]);
  const warning=adjudicateNineBall({...playing(),fouls:[1,0]},shot({firstContact:null}));
  assert.match(warning.lastResult.reason,/Deux fautes/);
  assert.deepEqual(state.fouls,[2,1],'adjudication must not mutate previous state');
});
test('a complete rotation can reach nine and end the match; finished matches reject shots',()=>{
  let state=adjudicateNineBall(newNineBallMatch(),shot());
  for(let num=1;num<=9;num++)state=adjudicateNineBall(state,shot({firstContact:num,remainingBefore:full.filter(n=>n>=num),pocketed:[{num,pocket:num%6}]}));
  assert.equal(state.phase,'finished');assert.equal(state.winner,1);
  assert.throws(()=>adjudicateNineBall(state,shot()));
});
