// Independent rail profiles: American pool is the playable default; the
// Mathavan 2009 snooker calibration is retained intact for later development.
// The full game currently uses WPA 57.15-mm pool balls and pool table geometry.
export const DEFAULT_CUSHION_PROFILE = 'pool';

// Nierhoff, Heunisch & Hirche, "Strategic play for a pool-playing robot",
// TU München, Section IV, Eqs. (19)-(20): regression from 1,217 recorded
// contacts on an actual POOL table. The angles are measured from the cushion
// normal (radians); the incoming centre-of-mass speed is in m/s.
// Their simplified, naturally-rolling, no-sidespin model uses e_bc to set the
// REBOUND DIRECTION, then normalizes the outgoing velocity and scales its
// TOTAL MAGNITUDE to delta_v * incident speed (Eq. 14). Delta_v does NOT
// multiply each component independently. Confirmed in the rendered PDF.
export const TUM_POOL_RAIL = Object.freeze({
  source:'Nierhoff, Heunisch & Hirche — Strategic play for a pool-playing robot',
  url:'https://mediatum.ub.tum.de/doc/1155344/988748.pdf',
  contactCount:1217,
  maxCalibratedSpeed:3.0, // conservative numerical bound; not a reported fit range
  // A numerical safety cap for the inverse-identified coefficient, NOT a
  // measured value of phenolic-ball-on-rubber friction.
  maxEffectiveTangentialFriction:0.90,
});

export function poolRailReference(incomingSpeed, incidenceAngleRad=0) {
  // Avoid extrapolating an affine fit into negative coefficients at break
  // speeds. The paper does not publish exact bounds of the fitted samples:
  // 3 m/s is a model safety limit, NOT an experimental claim.
  const speed=Math.max(0,Math.min(TUM_POOL_RAIL.maxCalibratedSpeed,incomingSpeed));
  const angle=Math.max(0,Math.min(Math.PI/2,incidenceAngleRad));
  const normalRestitution=0.9331-0.0278*speed-0.1051*angle;
  const velocityRetention=0.7366-0.1094*speed+0.1698*angle;
  const normal=Math.cos(angle),tangent=Math.sin(angle);
  const outgoingNorm=Math.hypot(normalRestitution*normal,tangent);
  return {normalRestitution,velocityRetention,
    // Post-rolling components relative to the corresponding incident
    // components; their weighted vector norm is exactly velocityRetention.
    postRollNormalRatio:normalRestitution*velocityRetention/outgoingNorm,
    postRollTangentialRatio:velocityRetention/outgoingNorm};
}

// The TUM pool experiment directly records outgoing linear velocity, NOT
// the material sliding coefficient at the cushion. Given a naturally
// rolling, spin-free ball and our finite-height rail impulse geometry,
// invert its measured tangential post-roll velocity to identify the MINIMUM
// effective friction envelope required to transmit that impulse. This is a
// velocity/angle-dependent operational coefficient, not rubber's static or
// kinetic Coulomb coefficient. It must not be used as a universal material
// constant or claimed as independent validation of the TUM regression.
export function poolEffectiveRailFriction(incomingSpeed,incidenceAngleRad,
  normalImpulseRestitution,noseRatio=0.27,mass=0.170097) {
  const angle=Math.max(0,Math.min(Math.PI/2-1e-6,incidenceAngleRad));
  const speed=Math.max(0,incomingSpeed);
  const incomingNormal=speed*Math.cos(angle);
  const incomingTangent=speed*Math.sin(angle);
  const reference=poolRailReference(speed,angle);
  const normalImpulse=(1+normalImpulseRestitution)*(1+noseRatio)*incomingNormal*
    mass/(1+2.5*noseRatio*noseRatio);
  const postRollGain=5*(1+noseRatio)/(7*mass);
  const requiredTangentialImpulse=Math.abs((reference.postRollTangentialRatio-1)*
    incomingTangent/postRollGain);
  const inferred=requiredTangentialImpulse/Math.max(1e-10,normalImpulse);
  return Math.min(TUM_POOL_RAIL.maxEffectiveTangentialFriction,
    Math.max(CUSHION_PROFILES.pool.friction,inferred*(1+1e-9)));
}

export const CUSHION_PROFILES = Object.freeze({
  pool: Object.freeze({
    name: 'Pool américain',
    // Typical 9-ft pool-table rolling resistance in Alciatore TP B.6.
    rollingFriction: 0.01,
    // Nominal effective impulse coefficient near ~2.2 m/s (Alciatore's
    // ~50%-after-skid benchmark). The LIVE value now varies with both speed
    // and angle based on TUM's 1,217 pool cushion observations, below.
    // This is NOT the intrinsic restitution of the cushion rubber.
    restitution: 0.54,
    friction: 0.20, // Reference floor; effective envelope is inversely calibrated.
    postSlipRatioTarget: 0.50,
    source: 'Nierhoff, Heunisch & Hirche (TU München) ; Alciatore HSV B.15 / TP B.6',
    sourceUrl: TUM_POOL_RAIL.url,
    proofUrl: 'https://drdavepoolinfo.com/technical_proofs/new/TP_B-6.pdf',
    caution: 'Les 1 217 impacts concernent une table de pool particulière et aucun effet latéral. La friction effective est identifiée sur les vitesses, pas mesurée sur un échantillon de caoutchouc.'
  }),
  snooker: Object.freeze({
    name: 'Snooker — référence Mathavan 2009',
    // Retain the v0.14 Mathavan snooker-cloth calibration for this mode.
    rollingFriction: 0.0128,
    restitution: 0.76,
    friction: 0.14,
    source: 'Mathavan, Jackson & Parkin (2009), figure 9 — billes de snooker',
    sourceUrl: 'https://drdavepoolinfo.com/physics_articles/ajp_09_hsv_article.pdf',
    caution: 'Loi mesurée sur snooker, conservée pour un futur modèle avec géométrie de snooker.'
  })
});

export function snookerReboundFit(incoming) {
  return -0.0877*incoming*incoming + 1.131*incoming - 0.0953;
}

export function cushionRestitutionFor(profile, incomingNormalSpeed, noseCoupling,
  incidenceAngleRad=0, incomingTotalSpeed=incomingNormalSpeed, noseRatio=0.27) {
  const properties = CUSHION_PROFILES[profile];
  if (!properties) throw new RangeError(`Profil de bande inconnu : ${profile}`);
  if (profile === 'pool') {
    // The 3D nose impulse converts incoming natural roll into post-rail skid.
    // For a homogeneous sphere, its FIRST post-skid normal velocity is
    // v_n,out / v_n,in = 5*(1+h/R)*noseCoupling*(1+e_impulse)/7 - 1.
    // Invert this exact relation to reproduce the TUM pool regression for
    // naturally rolling balls WITHOUT applying their delta_v a second time.
    // Sidespin still uses the 3D tangent impulse, but extrapolates the pool
    // friction envelope identified only from naturally rolling shots.
    const gain=5*(1+noseRatio)*noseCoupling/7;
    const target=poolRailReference(incomingTotalSpeed,incidenceAngleRad)
      .postRollNormalRatio;
    return Math.max(0.20,Math.min(0.90,(1+target)/gain-1));
  }

  // Preserve the EXACT v0.14 fitted snooker restitution calculation.
  const incoming = Math.max(0.28, Math.min(3.5, incomingNormalSpeed));
  const rebound = snookerReboundFit(incoming);
  const fitted = (1 + rebound/incoming)/noseCoupling - 1;
  return Math.max(0.58, Math.min(0.86,
    fitted + properties.restitution - 0.76));
}
