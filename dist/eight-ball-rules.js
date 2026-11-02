// WPA 8-ball shot adjudication. The renderer owns ball motion; this module
// receives observed contacts, rails and pockets after the balls have stopped.
export const groupOf = num => num >= 1 && num <= 7 ? 'solid' :
  num >= 9 && num <= 15 ? 'stripe' : null;

export function newEightBallMatch({callPocket = true, breaker = 0} = {}) {
  return {mode:'eight',callPocket:Boolean(callPocket),current:breaker,breaker,
    groups:[null,null],turn:0,phase:'break',ballInHand:'head',
    pending:null,winner:null,lastResult:null};
}

const opponent = player => 1 - player;
const handoff = (state, reason, foul = false, ballInHand = null) => ({
  ...state,current:opponent(state.current),turn:state.turn+1,
  phase:'playing',ballInHand,pending:null,
  lastResult:{kind:foul?'foul':'turn',reason}
});
const continuation = (state, reason) => ({
  ...state,phase:'playing',turn:state.turn+1,ballInHand:null,pending:null,
  lastResult:{kind:'continue',reason}
});
const pending = (state, kind, reason, options) => ({
  ...state,phase:'decision',pending:{kind,options},ballInHand:null,
  lastResult:{kind:'decision',reason}
});

const foulReason = ({scratch,firstContact,railAfterContact,pocketed,group,remainingBefore}) => {
  if (scratch) return 'Blanche empochée : faute.';
  if (firstContact == null) return 'Aucune bille touchée : faute.';
  if (firstContact === 8 && group && remainingBefore.some(n => groupOf(n) === group))
    return 'La bille 8 a été touchée avant la fin de votre groupe : faute.';
  if (group && groupOf(firstContact) !== group &&
      !(firstContact === 8 && !remainingBefore.some(n => groupOf(n) === group)))
    return 'Mauvais groupe touché en premier : faute.';
  if (!group && firstContact === 8 &&
      [1,2,3,4,5,6,7,9,10,11,12,13,14,15].some(n => remainingBefore.includes(n)))
    return 'Bille 8 touchée en premier sur table ouverte : faute.';
  if (!pocketed.length && !railAfterContact)
    return 'Aucune bande après le contact et aucune bille empochée : faute.';
  return null;
};

// A shot contains: firstContact, railAfterContact, breakRails (unique object
// balls reaching cushions), pocketed [{num,pocket}], scratch, remainingBefore,
// calledBall, calledPocket, safety. A pocket is indexed 0..5 by the physics table.
export function adjudicateEightBall(state, shot) {
  if (state.phase !== 'break' && state.phase !== 'playing')
    throw new Error('Aucun tir ne peut être arbitré dans cet état.');
  const pocketed = (shot.pocketed || []).filter(p => p.num !== 0);
  const numbers = pocketed.map(p => p.num);
  const remainingBefore = shot.remainingBefore || [];
  const isBreak = state.phase === 'break';
  const eight = numbers.includes(8);

  if (isBreak) {
    const scratch = Boolean(shot.scratch);
    if (eight && scratch) return pending(state,'eight-foul',
      'Bille 8 et blanche empochées à la casse : décision adverse.',
      ['spot-head','rerack-incoming']);
    if (eight) return pending(state,'eight-legal',
      'Bille 8 empochée sur casse régulière : choix du casseur.',
      ['spot-continue','rerack-breaker']);
    // A scratched break always needs a playable cue-ball position, including
    // when the same break also fails the four-rail requirement.
    if (scratch) return handoff(state,'Blanche empochée à la casse : placement derrière la ligne de tête.',true,'head');
    if (!numbers.length && (shot.breakRails || 0) < 4)
      return pending(state,'illegal-break',
        'Casse irrégulière : moins de quatre billes aux bandes et aucune empochée.',
        ['accept','rerack-incoming','rerack-breaker']);
    if (numbers.length) return continuation(state,'Casse régulière : la table reste ouverte.');
    return handoff(state,'Casse régulière sans bille empochée.');
  }

  const group = state.groups[state.current];
  const foul = foulReason({...shot,pocketed,group,remainingBefore});
  if (eight) {
    const wasCleared = group
      ? !remainingBefore.some(n => groupOf(n) === group)
      : (['solid','stripe'].some(g => !remainingBefore.some(n => groupOf(n) === g)));
    const calledEight = !state.callPocket ||
      (shot.calledBall === 8 && pocketed.some(p => p.num === 8 && p.pocket === shot.calledPocket));
    const won = !foul && wasCleared && calledEight && !shot.safety;
    return {...state,phase:'finished',winner:won?state.current:opponent(state.current),
      turn:state.turn+1,ballInHand:null,pending:null,
      lastResult:{kind:won?'win':'loss',reason:won?'Bille 8 empochée légalement.':
        foul || (!wasCleared?'Bille 8 empochée trop tôt.':'Bille 8 empochée dans une poche non annoncée.')}};
  }
  if (foul) return handoff(state,foul,true,'anywhere');
  if (shot.safety) return handoff(state,'Coup de sécurité annoncé.');

  let legalPotted;
  if (state.callPocket) {
    legalPotted = pocketed.find(p => p.num === shot.calledBall && p.pocket === shot.calledPocket &&
      (!group || groupOf(p.num) === group));
  } else {
    // Explicit house-rule variation: without calls, the first legally potted
    // ball of the player's group counts; on an open table, the first pot claims.
    legalPotted = pocketed.find(p => group ? groupOf(p.num) === group : Boolean(groupOf(p.num)));
  }
  if (!legalPotted) return handoff(state,'Aucune bille valable empochée : changement de joueur.');
  let next = state;
  if (!group) {
    const chosenGroup = groupOf(legalPotted.num);
    next = {...state,groups:state.current === 0 ? [chosenGroup,chosenGroup === 'solid'?'stripe':'solid'] :
      [chosenGroup === 'solid'?'stripe':'solid',chosenGroup]};
  }
  return continuation(next,`Bille ${legalPotted.num} empochée légalement : même joueur.`);
}

export function resolveEightBallDecision(state, action) {
  if (state.phase !== 'decision' || !state.pending?.options.includes(action))
    throw new Error('Choix indisponible pour cette casse.');
  const kind = state.pending.kind;
  if (action === 'rerack-breaker' || action === 'rerack-incoming') {
    const breaker = action === 'rerack-breaker' ? state.breaker : opponent(state.breaker);
    return {...newEightBallMatch({callPocket:state.callPocket,breaker}),
      lastResult:{kind:'rerack',reason:'Triangle reformé pour une nouvelle casse.'}};
  }
  if (action === 'spot-continue') return {...state,phase:'playing',pending:null,
    turn:state.turn+1,ballInHand:null,
    lastResult:{kind:'spot',reason:'Bille 8 replacée. Le casseur continue.'}};
  if (action === 'spot-head') return {...state,phase:'playing',pending:null,
    current:opponent(state.breaker),turn:state.turn+1,ballInHand:'head',
    lastResult:{kind:'spot',reason:'Bille 8 replacée. Blanc en main derrière la ligne de tête.'}};
  if (kind === 'illegal-break' && action === 'accept') return {...state,
    phase:'playing',pending:null,current:opponent(state.breaker),turn:state.turn+1,
    ballInHand:null,lastResult:{kind:'turn',reason:'Position acceptée après casse irrégulière.'}};
  throw new Error('Choix de casse invalide.');
}

export function eightBallVictoryPresentation(state) {
  if(state?.phase!=='finished'||!Number.isInteger(state.winner)||!state.lastResult)return null;
  const winner=state.winner+1;
  const directWin=state.lastResult.kind==='win';
  return {
    winner:`JOUEUR ${winner}`,
    outcome:directWin?'LA BILLE 8 A ÉTÉ EMPOCHÉE LÉGALEMENT':'VICTOIRE SUR UNE FAUTE ADVERSE',
    reason:directWin?'Toutes les billes du groupe ont été empochées, puis la bille 8 a conclu la partie.':
      `Le joueur ${3-winner} a perdu la partie : ${state.lastResult.reason}`
  };
}
