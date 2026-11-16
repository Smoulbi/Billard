import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveSphereImpulse} from '../dist/sphere-collision.js';
import {makePhysicsBody,simulatePhysics,PHYSICS,RADIUS,ballContactFriction} from '../dist/physics.js';
const m=PHYSICS.mass,R=RADIUS,I=.4*m*R*R;
const params={mass:m,radius:R,restitution:PHYSICS.ballRestitution,friction:ballContactFriction};
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const v=b=>[b.vx,b.vy,b.vz],w=b=>[b.wx,b.wy,b.wz];
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),norm=a=>Math.hypot(...a);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const energy=b=>.5*m*dot(v(b),v(b))+.5*I*dot(w(b),w(b));
const body=(num,velocity,spin)=>Object.assign(makePhysicsBody(num,0,0),{vx:velocity[0],vy:velocity[1],vz:velocity[2],wx:spin[0],wy:spin[1],wz:spin[2]});
const rotate=x=>{const n=mul([1,2,3],1/Math.sqrt(14)),t=.713;return add(add(mul(x,Math.cos(t)),mul(cross(n,x),Math.sin(t))),mul(n,dot(n,x)*(1-Math.cos(t))));};
test('production free-sphere impulses reproduce the independently recorded v0.94 research cases',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('../docs/data/airborne-friction-v094-cases.json',import.meta.url))).cases;
 for(const fixture of fixtures){
  const {input,state}=fixture,a=body(0,input.va,input.wa),b=body(1,input.vb,input.wb);
  const result=resolveSphereImpulse(a,b,input.n,params);
  for(const [actual,expected]of [[v(a),state.va],[v(b),state.vb],[w(a),state.wa],[w(b),state.wb]])actual.forEach((x,i)=>close(x,expected[i]));
  close(result.normalImpulse,fixture.jn);result.tangentImpulse.forEach((x,i)=>close(x,fixture.jt[i]));
 }
});
test('free contacts conserve momentum and total angular momentum, dissipate energy and respect spatial covariance',()=>{
 for(let i=1;i<=150;i++){
  const n0=[Math.sin(i*.9),Math.cos(i*.3),Math.sin(i*.2)],n=mul(n0,1/norm(n0));
  const a=body(0,[3*Math.cos(i),2*Math.sin(i*.7),Math.cos(i*.4)],[100*Math.sin(i*.2),80*Math.cos(i*.9),60*Math.sin(i*.7)]);
  const b=body(1,[Math.sin(i*.8),Math.cos(i*.5),Math.sin(i*.6)],[60*Math.cos(i*.8),90*Math.sin(i*.3),70*Math.cos(i*.4)]);
  const un=dot(sub(v(b),v(a)),n);if(un>=-.1){const va=add(v(a),mul(n,un+.5));[a.vx,a.vy,a.vz]=va;}
  const momentum=()=>mul(add(v(a),v(b)),m);
  const angular=()=>add(mul(add(w(a),w(b)),I),mul(add(cross(mul(n,-R),v(a)),cross(mul(n,R),v(b))),m));
  const before={p:momentum(),l:angular(),e:energy(a)+energy(b)};
  const ar=body(0,rotate(v(a)),rotate(w(a))),br=body(1,rotate(v(b)),rotate(w(b)));
  const result=resolveSphereImpulse(a,b,n,params);resolveSphereImpulse(ar,br,rotate(n),params);
  assert.ok(norm(sub(momentum(),before.p))<1e-10);assert.ok(norm(sub(angular(),before.l))<1e-10);
  assert.ok(energy(a)+energy(b)<=before.e+1e-10);
  assert.ok(norm(result.tangentImpulse)<=ballContactFriction(0)*result.normalImpulse+1e-10);
  for(const [actual,expected]of [[v(ar),rotate(v(a))],[v(br),rotate(v(b))],[w(ar),rotate(w(a))],[w(br),rotate(w(b))]])assert.ok(norm(sub(actual,expected))<1e-10);
 }
});
test('friction saturation stops contact slip instead of reversing it',()=>{
 const a=body(0,[2,.01,.02],[0,0,0]),b=body(1,[0,0,0],[0,0,0]),n=[1,0,0];
 resolveSphereImpulse(a,b,n,{...params,friction:.2});
 const u=sub(sub(v(b),v(a)),mul(cross(add(w(a),w(b)),n),R));close(u[1],0);close(u[2],0);
});
test('normal support keeps a grounded target on the cloth while transferring the safe horizontal tangent and accounting for table reaction',()=>{
 const a=body(0,[2,-1,1],[30,40,-20]),b=body(1,[0,0,0],[0,0,0]),n=[Math.SQRT1_2,-Math.SQRT1_2,0];
 const p0=mul(add(v(a),v(b)),m),e0=energy(a)+energy(b);
 const result=resolveSphereImpulse(a,b,n,{...params,freeB:false});
 assert.equal(b.vy,0);assert.ok(result.supportB>0);close(result.tangentImpulse[1],0);
 close(m*(a.vx+b.vx),p0[0]);close(m*(a.vz+b.vz),p0[2]);close(m*(a.vy+b.vy)-p0[1],result.supportB);
 assert.ok(norm(w(b))>0);assert.ok(energy(a)+energy(b)<=e0+1e-10);
});
test('supported contacts are dissipative over a range of normals and spin',()=>{
 for(let i=1;i<=150;i++){
  const n0=[.2+Math.sin(i)**2,-(.1+Math.cos(i)**2),.3*Math.sin(i*.8)],n=mul(n0,1/norm(n0));
  const a=body(0,mul(n,1+i/100),[70*Math.sin(i),50*Math.cos(i),80*Math.sin(i*.7)]),b=body(1,[0,0,0],[0,0,0]);
  const e=energy(a)+energy(b),result=resolveSphereImpulse(a,b,n,{...params,freeB:false});
  assert.ok(energy(a)+energy(b)<=e+1e-10);assert.equal(b.vy,0);assert.ok(result.supportB>=0);assert.ok(result.impactSpeed>0);
 }
});
test('separating spheres get no impulse',()=>{
 const a=body(0,[-1,0,0],[0,50,0]),b=body(1,[1,0,0],[0,0,0]),before=JSON.stringify([a,b]);
 assert.equal(resolveSphereImpulse(a,b,[1,0,0],params).impactSpeed,0);assert.equal(JSON.stringify([a,b]),before);
});
test('real flight integration transfers vertical motion and rotation between two airborne balls',()=>{
 const a=Object.assign(makePhysicsBody(0,-.04,0),{y:.2,vx:2,wz:30}),b=Object.assign(makePhysicsBody(1,.04,0),{y:.2});
 let hits=0;for(let i=0;i<5;i++)simulatePhysics([a,b],1/240,{onBallContact:()=>hits++});
 assert.ok(hits>0);assert.ok(Math.abs(b.wz)>0);assert.ok(Math.abs(a.vy-b.vy)>.01);assert.ok(a.y>R&&b.y>R);
});
test('a nearly vertical supported hit does not lift the airborne centre as an overlap correction',()=>{
 const a=Object.assign(makePhysicsBody(0,0,0),{y:R+2*R-1e-5,vy:-1}),b=makePhysicsBody(1,0,0),height=a.y;
 simulatePhysics([a,b],1e-5);
 assert.ok(a.y<=height);assert.equal(b.y,R);assert.equal(b.vy,0);assert.ok(a.vy>0);
});
