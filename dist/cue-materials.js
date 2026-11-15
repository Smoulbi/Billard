import * as THREE from './vendor/three.module.js';

// Cylinder UVs: u goes around the cue, v runs along its length. All maps
// are deterministic, local and periodic around u, with no image requests.
function cueTexture(width,height,pixel,seed){
  const data=new Uint8Array(width*height*4);
  let state=seed;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const noise=(state>>>8)/0xffffff-.5;
    const rgb=pixel(x/width,y/height,noise);
    const i=4*(y*width+x);
    for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,Math.round(rgb[c])));
    data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;
  texture.anisotropy=4;
  texture.needsUpdate=true;
  return texture;
}

export function createCueMaterials(){
  const tau=2*Math.PI;
  const maple=cueTexture(128,256,(u,v,n)=>{
    const fibre=tau*16*u+.3*Math.sin(tau*v);
    const grain=2.6*Math.sin(fibre)+1.2*Math.sin(2*fibre)+n*1.8;
    return [224+grain,202+grain*.85,158+grain*.6];
  },0x75a01);
  const darkWood=cueTexture(128,256,(u,v,n)=>{
    const fibre=tau*11*u+.7*Math.sin(tau*v);
    const grain=3*Math.sin(fibre)+1.1*Math.sin(3*fibre)+n*1.7;
    return [62+grain,35+grain*.65,25+grain*.42];
  },0x75a02);
  const weave=cueTexture(128,256,(u,v,n)=>{
    const a=Math.sin(tau*(16*u+32*v)),b=Math.sin(tau*(16*u-32*v));
    const thread=1.7*a+1.7*b+1.1*a*b+n*1.2;
    return [33+thread,38+thread,39+thread];
  },0x75a03);
  const chalk=cueTexture(64,64,(u,v,n)=>{
    const stipple=n*10+Math.sin(tau*12*u)*Math.sin(tau*12*v);
    return [63+stipple*.7,116+stipple*.85,148+stipple];
  },0x75a04);

  return {
    shaft:new THREE.MeshPhysicalMaterial({color:0xffffff,map:maple,
      roughness:.4,clearcoat:.22,clearcoatRoughness:.35}),
    butt:new THREE.MeshPhysicalMaterial({color:0xffffff,map:darkWood,
      roughness:.31,clearcoat:.55,clearcoatRoughness:.22}),
    wrap:new THREE.MeshStandardMaterial({color:0xffffff,map:weave,roughness:.86}),
    metal:new THREE.MeshStandardMaterial({color:0xbcc2bd,metalness:.82,roughness:.3}),
    ferrule:new THREE.MeshStandardMaterial({color:0xeee4c9,roughness:.36}),
    tip:new THREE.MeshStandardMaterial({color:0xffffff,map:chalk,roughness:.92}),
    bumper:new THREE.MeshStandardMaterial({color:0x171b1b,roughness:.94}),
    inlay:new THREE.MeshPhysicalMaterial({color:0xc8b995,roughness:.37,
      clearcoat:.32,clearcoatRoughness:.28,
      polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})
  };
}
