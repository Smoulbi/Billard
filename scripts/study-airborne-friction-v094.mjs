// Research-only rigid free-sphere impulse experiment; never imported by the game.
// Explicit output argument required before writing files. All cases are synthetic.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const m=.170097,R=.028575,I=.4*m*R*R;
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a),unit=a=>mul(a,1/norm(a));
const mu=s=>.009951+.108*Math.exp(-1.088*s);
const slip=s=>{const u=sub(sub(s.vb,s.va),mul(cross(add(s.wa,s.wb),s.n),R));return sub(u,mul(s.n,dot(u,s.n)));};
const energy=s=>.5*m*(dot(s.va,s.va)+dot(s.vb,s.vb))+.5*I*(dot(s.wa,s.wa)+dot(s.wb,s.wb));
const momentum=s=>mul(add(s.va,s.vb),m);
const angular=s=>add(mul(add(s.wa,s.wb),I),mul(add(cross(mul(s.n,-R),s.va),cross(mul(s.n,R),s.vb)),m));
function resolve(input,{restitution=.94,friction}={}){
 const s=structuredClone(input),un=dot(sub(s.vb,s.va),s.n),u=slip(s),speed=norm(u),coefficient=friction??mu(speed);
 const jn=un<0?-(1+restitution)*m*un/2:0;
 const jt=speed>0?mul(u,-Math.min(coefficient*jn,m*speed/7)/speed):[0,0,0];
 const impulse=add(mul(s.n,jn),jt);
 s.va=sub(s.va,mul(impulse,1/m));s.vb=add(s.vb,mul(impulse,1/m));
 const dw=mul(cross(s.n,jt),-R/I);s.wa=add(s.wa,dw);s.wb=add(s.wb,dw);
 return {state:s,jn,jt,mu:coefficient,regime:speed===0?'no slip':Math.abs(norm(jt)-m*speed/7)<1e-12?'slip stopped':'sliding'};
}
const rotate=v=>{const axis=unit([1,2,3]),t=.713,c=Math.cos(t),s=Math.sin(t);return add(add(mul(v,c),mul(cross(axis,v),s)),mul(axis,dot(axis,v)*(1-c)));};
const errors={linear:0,angular:0,rotation:0,energyBalance:0};
for(let i=1;i<=500;i++){
 const input={n:unit([Math.sin(i*.9),Math.cos(i*.3),Math.sin(i*.2)]),va:[3*Math.cos(i),2*Math.sin(i*.7),Math.cos(i*.4)],vb:[Math.sin(i*.8),Math.cos(i*.5),Math.sin(i*.6)],wa:[100*Math.sin(i*.2),80*Math.cos(i*.9),60*Math.sin(i*.7)],wb:[60*Math.cos(i*.8),90*Math.sin(i*.3),70*Math.cos(i*.4)]};
 const un=dot(sub(input.vb,input.va),input.n);if(un>=-.1)input.va=add(input.va,mul(input.n,un+.5));
 const output=resolve(input),s=output.state;
 errors.linear=Math.max(errors.linear,norm(sub(momentum(s),momentum(input))));
 errors.angular=Math.max(errors.angular,norm(sub(angular(s),angular(input))));
 assert.ok(energy(s)<=energy(input)+1e-10);
 const u=slip(input),v=slip(s);assert.ok(dot(u,v)>=-1e-10);
 const vn=dot(sub(input.vb,input.va),input.n);
 const expectedLoss=-m/4*(1-.94**2)*vn**2+dot(output.jt,u)+.5*(7/m)*dot(output.jt,output.jt);
 errors.energyBalance=Math.max(errors.energyBalance,Math.abs((energy(s)-energy(input))-expectedLoss));
 const rotated=resolve(Object.fromEntries(Object.entries(input).map(([key,value])=>[key,rotate(value)]))).state;
 for(const key of ['va','vb','wa','wb'])errors.rotation=Math.max(errors.rotation,norm(sub(rotated[key],rotate(s[key]))));
}
assert.ok(errors.linear<1e-10&&errors.angular<1e-10&&errors.energyBalance<1e-10&&errors.rotation<1e-10);
const fixtures=[
 {name:'centred, no spin',n:[1,0,0],va:[2,0,0],vb:[0,0,0],wa:[0,0,0],wb:[0,0,0]},
 {name:'oblique tangent motion',n:[1,0,0],va:[2,1,0],vb:[0,0,0],wa:[0,0,0],wb:[0,0,0]},
 {name:'vertical contact with spin, both spheres free',n:[0,-1,0],va:[1,-2,.4],vb:[0,0,0],wa:[30,10,-20],wb:[0,0,0]},
 {name:'equal and opposite spin cancels surface slip',n:[1,0,0],va:[2,0,0],vb:[0,0,0],wa:[0,50,0],wb:[0,-50,0]}
];
const cases=fixtures.map(({name,...input})=>{const result=resolve(input);return {name,input,...result,initialTangentialSpeed:norm(slip(input)),finalTangentialSpeed:norm(slip(result.state)),energyBefore:energy(input),energyAfter:energy(result.state)};});
const sensitivity=[.03,.05,.08].map(friction=>({friction,...resolve(fixtures[1],{friction})}));
const report={warning:'Synthetic checks of an instantaneous rigid free-sphere model, not empirical validation or code integrated into the game.',parameters:{massKg:m,radiusM:R,normalRestitution:.94,frictionLaw:'0.009951 + 0.108 exp(-1.088 * initial_surface_slip_m_s)'},syntheticCasesChecked:500,maximumErrors:errors,cases,sensitivity};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({syntheticCasesChecked:500,maximumErrors:errors,cases:cases.map(c=>({name:c.name,mu:c.mu,regime:c.regime,spinChange:norm(sub(c.state.wa,c.input.wa))}))}));
