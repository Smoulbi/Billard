// Pooltool-inspired layout imperfections: https://github.com/ekiefl/pooltool/blob/main/pooltool/layouts.py
// This is a simulation convention, not an experimentally measured gap distribution.
const SPACING_FACTOR=1e-3;

export function imperfectRack(rows,numbers,radius,random=Math.random) {
  const virtualRadius=radius*(1+SPACING_FACTOR);
  const jitter=radius*SPACING_FACTOR;
  let index=0;
  return rows.flatMap((count,row)=>Array.from({length:count},(_,col)=>{
    const num=numbers[index++];
    // Keep the apex exactly on the foot spot. Every other ball can move within
    // its virtual circle; two such circles cannot produce overlapping balls.
    const angle=2*Math.PI*random(),offset=row===0?0:jitter*random();
    return {num,x:.49+row*Math.sqrt(3)*virtualRadius+offset*Math.cos(angle),
      z:(col-(count-1)/2)*2*virtualRadius+offset*Math.sin(angle)};
  }));
}
