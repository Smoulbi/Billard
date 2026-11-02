import {RADIUS, makePhysicsBody, resolveBallCollision, simulatePhysics,
  strikeBall, isMoving} from './physics.js';
import {powerToCueSpeed} from './power.js';
import {PUBLISHED_COLLISIONS, MATHAVAN_2009_PDF,
  measurePostSlipCollision, measureRailRebound, measurePostSlideRailRebound,
  measurePoolObliqueRailRebound,
  measureRollingDeceleration,
  publishedCushionFit} from './experimental.js';
import {CUSHION_PROFILES,TUM_POOL_RAIL,poolRailReference} from './cushion-profiles.js';

// The original 14 cases are analytical limits or diagnostic simulations, not
// measured trajectories. Additional reference cases use Mathavan et al.'s
// snooker measurements / fitted regression, TUM's POOL regression on 1,217
// impacts, and Alciatore's indicative normal pool rebound-speed benchmark.
// Their distinct evidence types are identified per row.
// The ideal 90° stun rule neglects collision-induced throw; the rolling 30°
// rule approximates the 1/4- to 3/4-ball cut range.
const CUTS_STUN=[20,30,40,50,60];
const CUTS_ROLL=[15,20,30,40,49];
const STEP=1/240;
const PUBLISHED_CASES=PUBLISHED_COLLISIONS.flatMap((record,i)=>[
  Object.freeze({id:`mathavan-${i}-cue`,name:`Mathavan · blanche ${record.cut}°`,
    family:'published-ball',index:i,ball:'cue',unit:'m/s',reference:null,
    published:record.cue,publishedKind:'mesure directe',
    source:'Mathavan et al., 2009 · tableau I',sourceUrl:MATHAVAN_2009_PDF,
    detail:`Collision en roulement à ${record.incoming.toFixed(3)} m/s ; vitesse de la blanche après glissement.`}),
  Object.freeze({id:`mathavan-${i}-object`,name:`Mathavan · objet ${record.cut}°`,
    family:'published-ball',index:i,ball:'object',unit:'m/s',reference:null,
    published:record.object,publishedKind:'mesure directe',
    source:'Mathavan et al., 2009 · tableau I',sourceUrl:MATHAVAN_2009_PDF,
    detail:`Collision en roulement à ${record.incoming.toFixed(3)} m/s ; vitesse de l’objet après glissement.`}),
]);

const SNOOKER_RAIL_CASES=[0.5,1.2,2.3,3.2].map(speed=>Object.freeze({
  id:`mathavan-rail-${String(speed).replace('.','-')}`,
  name:`Snooker · bande ${speed.toFixed(1)} m/s`,
  family:'snooker-rail',incoming:speed,unit:'m/s',reference:null,
  published:publishedCushionFit(speed),publishedKind:'régression utilisée pour le calibrage',
  source:'Mathavan et al., 2009 · figure 9',sourceUrl:MATHAVAN_2009_PDF,
  detail:'Profil snooker conservé : vitesse IMMÉDIATEMENT après rebond perpendiculaire ; régression de 31 impacts, non mesure indépendante.'}));

const POOL_RAIL_CASES=[0.5,1.2,2.3].map(speed=>Object.freeze({
  id:`pool-rail-${String(speed).replace('.','-')}`,
  name:`Pool US · bande normale ${speed.toFixed(1)} m/s`,
  family:'pool-rail',incoming:speed,unit:'%',reference:null,
  published:100*poolRailReference(speed,0).velocityRetention,
  publishedKind:'régression sur 1 217 impacts mesurés, pas mesure à cette vitesse précise',
  source:'Nierhoff, Heunisch & Hirche · équations 19–20 (pool)',sourceUrl:TUM_POOL_RAIL.url,
  detail:'Vitesse après le rebond / vitesse entrante, en %, sur une table de pool. Ajustement empirique TUM, pour billes en roulement sans effet latéral.'}));

// The paper reports outgoing DIRECTION from e_bc and outgoing SPEED from
// delta_v. Their Eq. 14 normalizes the outgoing vector BEFORE scaling it;
// e_bc*delta_v is NOT the normal velocity component at oblique angles.
const POOL_OBLIQUE_CASES=[0.5,1.2,2.3].flatMap(speed=>
  [30,45,60,75].flatMap(angle=>['normal','tangent'].map(component=>{
    const fit=poolRailReference(speed,angle*Math.PI/180);
    return Object.freeze({
      id:`tum-pool-${String(speed).replace('.','-')}-${angle}-${component}`,
      name:`Pool US · ${angle}° · ${speed.toFixed(1)} m/s · ${component==='normal'?'normale':'tangentielle'}`,
      family:'pool-rail-component',incoming:speed,angle,component,unit:'%',reference:null,
      published:100*(component==='normal'?fit.postRollNormalRatio:fit.postRollTangentialRatio),
      publishedKind:'composante déduite de deux régressions sur 1 217 impacts',
      source:'Nierhoff, Heunisch & Hirche · équations 12–14 & 19–20',
      sourceUrl:TUM_POOL_RAIL.url,
      detail:'Rapport composante sortante/entrante au premier roulement, sans effet. L’enveloppe de frottement effectif est identifiée sur la même régression : correspondance calibrée, et non validation indépendante.'
    });
  })));

const ALCIATORE_POOL_CASE=Object.freeze({
  id:'alciatore-pool-normal-1-6',name:'Pool US · perte normale indicative',
  family:'pool-rail',incoming:1.6,unit:'%',reference:null,
  published:100*CUSHION_PROFILES.pool.postSlipRatioTarget,
  publishedKind:'ordre de grandeur indicatif (ni vitesse ni table précisément publiées)',
  source:'Alciatore · HSV B.15 / TP B.6',sourceUrl:CUSHION_PROFILES.pool.proofUrl,
  detail:'Environ 50 % de vitesse conservée après le glissement sur une bande de pool quasiment perpendiculaire.'});

export const CALIBRATION_CASES=Object.freeze([
  ...CUTS_STUN.map(cut=>Object.freeze({id:`stun-${cut}`,name:`Arrêt · coupe ${cut}°`,
    family:'stun',cut,unit:'°',reference:90-cut,source:'Tangente idéale (90°)',
    detail:'Blanche glissante à 2,5 m/s ; angle immédiatement après la collision.'})),
  ...CUTS_ROLL.map(cut=>Object.freeze({id:`roll-${cut}`,name:`Roulement · coupe ${cut}°`,
    family:'roll',cut,unit:'°',reference:30,source:'Règle approchée des 30°',
    detail:'Blanche en roulement à 2,5 m/s ; direction après 0,25 s.'})),
  Object.freeze({id:'cloth-050',name:'Tapis · roulement libre',family:'cloth',
    unit:'cm',reference:null,source:'À mesurer',
    detail:'Distance d’arrêt, vitesse initiale de 0,50 m/s, sans bande.'}),
  ...[-0.4,0,0.4].map((z,i)=>Object.freeze({id:`break-${i}`,
    name:`Casse · ${i===0?'haut':i===1?'centre':'bas'}`,family:'break',z,
    unit:'billes',reference:null,source:'À mesurer',
    detail:'Nombre de billes ayant parcouru au moins 20 cm après 0,75 s de casse à 100 %.'})),
  ...PUBLISHED_CASES,
  Object.freeze({id:'mathavan-rolling',name:'Mathavan · résistance du tapis',
    family:'published-cloth',unit:'m/s²',reference:null,published:0.125,
    publishedKind:'milieu de la plage mesurée',
    source:'Mathavan et al., 2009 · figure 6',sourceUrl:MATHAVAN_2009_PDF,
    detail:'Décélération au roulement mesurée : 0,124–0,126 m/s² sur un tapis de snooker.'}),
  ...POOL_RAIL_CASES,
  ...POOL_OBLIQUE_CASES,
  ALCIATORE_POOL_CASE,
  ...SNOOKER_RAIL_CASES
]);

function cutAngle(test) {
  const radians=test.cut*Math.PI/180;
  const cue=makePhysicsBody(0,-2*RADIUS*Math.cos(radians),-2*RADIUS*Math.sin(radians));
  const target=makePhysicsBody(1,0,0);
  cue.vx=2.5;
  if(test.family==='roll')cue.wz=-cue.vx/RADIUS;
  const contactSpeed=resolveBallCollision(cue,target);
  if(contactSpeed<=0)throw new Error(`Contact manquant : ${test.id}`);
  if(test.family==='roll')for(let i=0;i<60;i++)simulatePhysics([cue,target],STEP);
  return Math.abs(Math.atan2(cue.vz,cue.vx)*180/Math.PI);
}

function clothDistance() {
  const cue=makePhysicsBody(0,-0.9,0);
  cue.vx=0.5;cue.wz=-cue.vx/RADIUS;
  const start=cue.x;
  for(let i=0;i<1800&&isMoving(cue);i++)simulatePhysics([cue],STEP);
  return (cue.x-start)*100;
}

function breakSpread(test,cushionModel='empirical') {
  const balls=[makePhysicsBody(0,-0.93,test.z)];
  for(let row=0,num=1;row<5;row++)for(let j=0;j<=row;j++) {
    const x=0.49+row*(Math.sqrt(3)*RADIUS+0.00006);
    const z=(j-row/2)*(2*RADIUS+0.00012);
    balls.push(makePhysicsBody(num++,x,z));
  }
  const start=balls.slice(1).map(b=>({x:b.x,z:b.z}));
  const length=Math.hypot(1.42,-test.z);
  strikeBall(balls[0],{x:1.42/length,z:-test.z/length},powerToCueSpeed(100));
  for(let i=0;i<180;i++)simulatePhysics(balls,STEP,{cushionModel});
  return balls.slice(1).filter((b,i)=>Math.hypot(b.x-start[i].x,b.z-start[i].z)>=0.2).length;
}

export function runCalibration({cushionModel='empirical'}={}) {
  const collisionCache=PUBLISHED_COLLISIONS.map(measurePostSlipCollision);
  const obliqueCache=new Map();
  return CALIBRATION_CASES.map(test=>({
    ...test,
    simulated:test.family==='cloth'?clothDistance():
      test.family==='break'?breakSpread(test,cushionModel):
      test.family==='published-ball'?collisionCache[test.index][test.ball]:
      test.family==='pool-rail'?100*measurePostSlideRailRebound(test.incoming,'pool',cushionModel)/test.incoming:
      test.family==='pool-rail-component'?(()=>{
        const key=`${test.incoming}-${test.angle}`;
        if(!obliqueCache.has(key))obliqueCache.set(key,
          measurePoolObliqueRailRebound({incoming:test.incoming,
            angleDeg:test.angle,cushionModel}));
        const row=obliqueCache.get(key);
        return 100*(test.component==='normal'?
          row.postRollNormal/row.incomingNormal:
          row.postRollTangent/row.incomingTangent);
      })():
      test.family==='snooker-rail'?measureRailRebound(test.incoming,'snooker'):
      test.family==='published-cloth'?measureRollingDeceleration():cutAngle(test)
  }));
}

export function signedDeviation(simulated, reference) {
  return Number.isFinite(reference)?simulated-reference:null;
}

export function calibrationToCSV(rows, measurements={}) {
  const lines=['id,scenario,unit,simulated,theory_reference,measured_reference,delta_to_theory,delta_to_measured,reference_kind,published_reference,delta_to_published,published_kind,source_url'];
  for(const row of rows) {
    const actual=measurements[row.id];
    const measured=Number.isFinite(actual)?actual:null;
    const theoretical=Number.isFinite(row.reference)?row.reference:null;
    const escape=value=>`"${String(value).replaceAll('"','""')}"`;
    lines.push([row.id,escape(row.name),escape(row.unit),row.simulated.toFixed(4),
      theoretical===null?'':theoretical.toFixed(4),
      measured===null?'':measured.toFixed(4),
      theoretical===null?'':(row.simulated-theoretical).toFixed(4),
      measured===null?'':(row.simulated-measured).toFixed(4),
      escape(row.source),
      Number.isFinite(row.published)?row.published.toFixed(4):'',
      Number.isFinite(row.published)?(row.simulated-row.published).toFixed(4):'',
      escape(row.publishedKind||''),escape(row.sourceUrl||'')].join(','));
  }
  return lines.join('\n')+'\n';
}
