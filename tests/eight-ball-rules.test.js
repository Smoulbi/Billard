import test from 'node:test';
import assert from 'node:assert/strict';
import {newEightBallMatch,adjudicateEightBall,resolveEightBallDecision,
  eightBallVictoryPresentation,groupOf}
  from '../dist/eight-ball-rules.js';
import {canPlaceFreeCue,clampFreePosition,canPlaceBreakCue,HEAD_STRING_X}
  from '../dist/placement.js';
import {makePhysicsBody,simulatePhysics,stopBall} from '../dist/physics.js';

const fullRack=Array.from({length:15},(_,i)=>i+1);
const shot=(extras={})=>({firstContact:1,railAfterContact:true,
  remainingBefore:fullRack,pocketed:[],...extras});
const playing=({callPocket=true,group='solid',current=0}={})=>({
  ...newEightBallMatch({callPocket}),phase:'playing',ballInHand:null,current,
  groups:group===null?[null,null]:[group,group==='solid'?'stripe':'solid']});

test('number groups are distinct and exclude cue and eight',()=>{
  assert.equal(groupOf(1),'solid');assert.equal(groupOf(7),'solid');
  assert.equal(groupOf(8),null);assert.equal(groupOf(9),'stripe');
  assert.equal(groupOf(15),'stripe');assert.equal(groupOf(0),null);
});

test('break pots retain the breaker and leave the table open',()=>{
  const result=adjudicateEightBall(newEightBallMatch(),shot({pocketed:[{num:9,pocket:2}]}));
  assert.equal(result.current,0);assert.equal(result.phase,'playing');
  assert.deepEqual(result.groups,[null,null]);
});

test('legal dry break changes player; illegal break opens three WPA options',()=>{
  const dry=adjudicateEightBall(newEightBallMatch(),shot({breakRails:4}));
  assert.equal(dry.current,1);assert.equal(dry.ballInHand,null);
  const illegal=adjudicateEightBall(newEightBallMatch(),shot({breakRails:3}));
  assert.equal(illegal.phase,'decision');
  assert.deepEqual(illegal.pending.options,['accept','rerack-incoming','rerack-breaker']);
  const accept=resolveEightBallDecision(illegal,'accept');
  assert.equal(accept.current,1);assert.equal(accept.phase,'playing');
  assert.equal(accept.ballInHand,null);
});

test('scratch at break gives the opponent cue placement behind head string',()=>{
  const result=adjudicateEightBall(newEightBallMatch(),shot({scratch:true,pocketed:[{num:1,pocket:0}]}));
  assert.equal(result.current,1);assert.equal(result.ballInHand,'head');
  const dryScratch=adjudicateEightBall(newEightBallMatch(),shot({scratch:true,breakRails:0}));
  assert.equal(dryScratch.current,1);assert.equal(dryScratch.ballInHand,'head');
});

test('eight on break is not an automatic win; WPA choice allows spotting or rebreaking',()=>{
  const match=adjudicateEightBall(newEightBallMatch(),shot({pocketed:[{num:8,pocket:0}]}));
  assert.equal(match.phase,'decision');assert.equal(match.winner,null);
  const next=resolveEightBallDecision(match,'spot-continue');
  assert.equal(next.phase,'playing');assert.equal(next.current,0);
  const again=resolveEightBallDecision(match,'rerack-breaker');
  assert.equal(again.phase,'break');assert.equal(again.breaker,0);
});

test('eight and cue on break give adverse choice and head-string placement',()=>{
  const state=adjudicateEightBall(newEightBallMatch(),shot({scratch:true,pocketed:[{num:8,pocket:5}]}));
  assert.deepEqual(state.pending.options,['spot-head','rerack-incoming']);
  const chosen=resolveEightBallDecision(state,'spot-head');
  assert.equal(chosen.current,1);assert.equal(chosen.ballInHand,'head');
});

test('legal call claims group and continues; uncalled pot does not claim group',()=>{
  const match=playing({group:null});
  const legal=adjudicateEightBall(match,shot({pocketed:[{num:10,pocket:4}],
    firstContact:10,calledBall:10,calledPocket:4}));
  assert.deepEqual(legal.groups,['stripe','solid']);assert.equal(legal.current,0);
  const missed=adjudicateEightBall(match,shot({pocketed:[{num:10,pocket:4}],
    firstContact:10,calledBall:10,calledPocket:2}));
  assert.deepEqual(missed.groups,[null,null]);assert.equal(missed.current,1);
  assert.equal(missed.ballInHand,null);
});

test('optional no-call mode counts first eligible pocket on an open table',()=>{
  const match=playing({group:null,callPocket:false});
  const result=adjudicateEightBall(match,shot({firstContact:10,
    pocketed:[{num:10,pocket:4},{num:3,pocket:2}]}));
  assert.deepEqual(result.groups,['stripe','solid']);assert.equal(result.current,0);
});

test('wrong first contact gives other player free cue placement',()=>{
  const result=adjudicateEightBall(playing(),shot({firstContact:10,
    pocketed:[{num:2,pocket:1}],calledBall:2,calledPocket:1}));
  assert.equal(result.current,1);assert.equal(result.lastResult.kind,'foul');
  assert.equal(result.ballInHand,'anywhere');
});

test('no rail after contact and no pot is a foul; pocket prevents this foul',()=>{
  const state=playing();
  const foul=adjudicateEightBall(state,shot({railAfterContact:false}));
  assert.equal(foul.ballInHand,'anywhere');
  const pot=adjudicateEightBall(state,shot({railAfterContact:false,
    pocketed:[{num:2,pocket:0}],calledBall:2,calledPocket:0}));
  assert.equal(pot.current,0);assert.equal(pot.ballInHand,null);
});

test('a cue ball missing all object balls is a foul',()=>{
  const result=adjudicateEightBall(playing(),shot({firstContact:null}));
  assert.equal(result.lastResult.kind,'foul');assert.equal(result.current,1);
});

test('a declared safety passes the turn even if called group is pocketed',()=>{
  const result=adjudicateEightBall(playing(),shot({pocketed:[{num:2,pocket:3}],safety:true}));
  assert.equal(result.current,1);assert.equal(result.ballInHand,null);
});

test('premature eight and eight plus scratch both lose the rack',()=>{
  const early=adjudicateEightBall(playing(),shot({pocketed:[{num:8,pocket:1}],
    calledBall:8,calledPocket:1}));
  assert.equal(early.phase,'finished');assert.equal(early.winner,1);
  const cleared=playing();
  const scratch=adjudicateEightBall(cleared,shot({firstContact:8,
    remainingBefore:[8,9,10],pocketed:[{num:8,pocket:1}],scratch:true,
    calledBall:8,calledPocket:1}));
  assert.equal(scratch.winner,1);
});

test('eight can win only once group is clear and in called pocket',()=>{
  const state=playing();
  const good=adjudicateEightBall(state,shot({firstContact:8,
    remainingBefore:[8,10,11],pocketed:[{num:8,pocket:5}],
    calledBall:8,calledPocket:5}));
  assert.equal(good.winner,0);assert.equal(good.lastResult.kind,'win');
  const wrong=adjudicateEightBall(state,shot({firstContact:8,
    remainingBefore:[8,10,11],pocketed:[{num:8,pocket:5}],
    calledBall:8,calledPocket:4}));
  assert.equal(wrong.winner,1);
  const noCall=adjudicateEightBall(playing({callPocket:false}),shot({firstContact:8,
    remainingBefore:[8,10,11],pocketed:[{num:8,pocket:5}]}));
  assert.equal(noCall.winner,0);
});

test('victory display identifies the winning player for a legal eight and an adverse foul',()=>{
  const legal=adjudicateEightBall(playing({current:1}),shot({
    firstContact:8,remainingBefore:[8,1,2],pocketed:[{num:8,pocket:5}],
    calledBall:8,calledPocket:5}));
  const win=eightBallVictoryPresentation(legal);
  assert.equal(win.winner,'JOUEUR 2');
  assert.match(win.outcome,/LÉGALEMENT/);
  const early=adjudicateEightBall(playing(),shot({
    pocketed:[{num:8,pocket:1}],calledBall:8,calledPocket:1}));
  const loss=eightBallVictoryPresentation(early);
  assert.equal(loss.winner,'JOUEUR 2');
  assert.match(loss.reason,/joueur 1.*trop tôt/i);
  assert.equal(eightBallVictoryPresentation(playing()),null);
});

test('cue placement anywhere respects rails and other balls',()=>{
  const others=[{active:true,num:1,x:0,z:0}];
  assert.equal(canPlaceFreeCue(.5,.2,others),true);
  assert.equal(canPlaceFreeCue(.01,.01,others),false);
  assert.equal(canPlaceFreeCue(0,.635,others),false);
  assert.equal(canPlaceFreeCue(1.27,.635,others),false);
  assert.equal(canPlaceFreeCue(Infinity,0,others),false);
  assert.ok(clampFreePosition(99,99).x<1.27);
  assert.equal(canPlaceBreakCue(0,0,others),false);
  assert.equal(canPlaceBreakCue(HEAD_STRING_X-.05,0,others),true);
});

test('physics reports actual cue-object contact and subsequent rail contact for refereeing',()=>{
  const cue=makePhysicsBody(0,-.5,0),object=makePhysicsBody(1,.6,0);
  cue.vx=4;cue.state='sliding';
  const balls=[cue,object];
  let first=null,railAfter=false;
  for(let i=0;i<1000;i++){
    const moving=simulatePhysics(balls,1/240,{
      onBallContact:(a,b)=>{if(first===null&&(a.num===0||b.num===0))first=a.num===0?b.num:a.num;},
      onRailContact:()=>{if(first!==null)railAfter=true;}
    });
    if(!moving&&i>5)break;
  }
  assert.equal(first,1);
  assert.equal(railAfter,true);
  stopBall(cue);stopBall(object);
});
