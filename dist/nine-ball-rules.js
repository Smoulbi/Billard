// Nine-ball rotation: lowest ball first, any legal pot continues, legal nine wins.
export function newNineBallMatch({breaker=0}={}) {
  return {mode:'nine',callPocket:false,current:breaker,breaker,groups:[null,null],
    turn:0,phase:'break',ballInHand:'head',pending:null,winner:null,
    fouls:[0,0],pushOutAvailable:false,lastResult:null};
}
export function nineBallRack(radius) {
  const rows=[1,2,3,2,1],numbers=[1,2,3,4,9,5,6,7,8];
  let index=0;
  return rows.flatMap((count,row)=>Array.from({length:count},(_,col)=>({
    num:numbers[index++],x:.49+row*(Math.sqrt(3)*radius+.00006),
    z:(col-(count-1)/2)*(2*radius+.00012)
  })));
}
export function adjudicateNineBall(state,shot) {
  if(!['break','playing'].includes(state.phase))throw new Error('Aucun tir ne peut être arbitré dans cet état.');
  const pots=(shot.pocketed||[]).filter(p=>p.num>=1&&p.num<=9);
  const nine=pots.some(p=>p.num===9),isBreak=state.phase==='break';
  const push=Boolean(shot.pushOut);
  if(push&&(!state.pushOutAvailable||isBreak))throw new Error('Push-out indisponible.');
  const lowest=Math.min(...(shot.remainingBefore||[]).filter(n=>n>=1&&n<=9));
  let reason=shot.scratch?'Blanche empochée : faute.':null;
  if(!reason&&!push){
    if(shot.firstContact==null)reason='Aucune bille touchée : faute.';
    else if(shot.firstContact!==lowest)reason=`La bille ${lowest} devait être touchée en premier : faute.`;
    else if(isBreak&&!pots.length&&(shot.breakRails||0)<4)reason='Casse irrégulière : quatre billes aux bandes ou une bille empochée sont nécessaires.';
    else if(!isBreak&&!pots.length&&!shot.railAfterContact)reason='Aucune bande après le contact et aucune bille empochée : faute.';
  }
  const fouls=[...state.fouls];
  const base={...state,turn:state.turn+1,pending:null,pushOutAvailable:false,spotNine:false};
  if(reason){
    fouls[state.current]++;
    if(fouls[state.current]>=3)return {...base,fouls,phase:'finished',winner:1-state.current,ballInHand:null,
      spotNine:nine,lastResult:{kind:'loss',reason:'Troisième faute consécutive : perte de la partie.'}};
    return {...base,fouls,phase:'playing',current:1-state.current,ballInHand:'anywhere',spotNine:nine,
      lastResult:{kind:'foul',reason:reason+(fouls[state.current]===2?' Deux fautes consécutives : la prochaine fera perdre la partie.':'')}};
  }
  fouls[state.current]=0;
  if(push)return {...base,fouls,phase:'decision',current:1-state.current,ballInHand:null,spotNine:nine,
    pending:{kind:'push-out',shooter:state.current,options:['take-shot','pass-shot']},
    lastResult:{kind:'decision',reason:'Push-out : l’adversaire choisit de jouer ou de rendre la main. La 9 empochée est replacée.'}};
  if(nine)return {...base,fouls,phase:'finished',winner:state.current,ballInHand:null,
    lastResult:{kind:'win',reason:isBreak?'Bille 9 empochée sur casse régulière.':'Bille 9 empochée légalement.'}};
  return {...base,fouls,phase:'playing',current:pots.length?state.current:1-state.current,
    ballInHand:null,pushOutAvailable:isBreak,
    lastResult:{kind:pots.length?'continue':'turn',reason:pots.length?
      'Bille empochée légalement : même joueur.':'Aucune bille empochée : changement de joueur.'}};
}
export function resolveNineBallDecision(state,action) {
  if(state.phase!=='decision'||state.pending?.kind!=='push-out'||!state.pending.options.includes(action))
    throw new Error('Décision de push-out indisponible.');
  return {...state,phase:'playing',pending:null,spotNine:false,
    current:action==='take-shot'?state.current:state.pending.shooter,
    lastResult:{kind:'turn',reason:action==='take-shot'?'Position acceptée après le push-out.':'Main rendue au joueur du push-out.'}};
}
export function nineBallVictoryPresentation(state) {
  if(state?.phase!=='finished'||!Number.isInteger(state.winner))return null;
  return {winner:`JOUEUR ${state.winner+1}`,
    outcome:state.lastResult.kind==='win'?'LA BILLE 9 A ÉTÉ EMPOCHÉE LÉGALEMENT':'VICTOIRE SUR TROIS FAUTES ADVERSES',
    reason:state.lastResult.reason};
}
