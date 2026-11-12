import * as THREE from './vendor/three.module.js';

// A small, static studio capture supplies recognisable overhead reflections.
// It is generated once from local geometry, never fetched or recaptured per frame.
function createRoomEnvironment(renderer) {
  const room=new THREE.Scene();
  room.background=new THREE.Color().setRGB(.12,.14,.15);
  const shell=new THREE.Mesh(new THREE.BoxGeometry(12,7,10),
    new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(.18,.20,.21),side:THREE.BackSide}));
  room.add(shell);
  for(const z of [-1.15,1.15]){
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.8,.68),
      new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(6.0,5.8,5.3),side:THREE.DoubleSide}));
    panel.rotation.x=Math.PI/2;panel.position.set(0,3.2,z);room.add(panel);
  }
  const bounce=new THREE.Mesh(new THREE.PlaneGeometry(4,2.2),
    new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(.6,.7,.74),side:THREE.DoubleSide}));
  bounce.position.set(-4,1,0);bounce.rotation.y=Math.PI/2;room.add(bounce);
  const generator=new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(room,.035,.1,20,{size:128});
  } finally {
    generator.dispose();
    room.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});
  }
}

export function configureSceneLighting(renderer,scene) {
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;
  // PCF uses shadow.radius, unlike PCFSoft's fixed footprint. Keep one shadow map.
  renderer.shadowMap.type=THREE.PCFShadowMap;
  const environment=createRoomEnvironment(renderer);
  scene.environment=environment.texture;
  scene.environmentIntensity=.5;

  const hemisphere=new THREE.HemisphereLight(0xe4edf1,0x39413d,1.15);
  scene.add(hemisphere);
  const main=new THREE.DirectionalLight(0xfff8ec,2.4);
  main.position.set(-.9,5.2,1.1);main.castShadow=true;
  main.shadow.mapSize.set(2048,2048);
  main.shadow.camera.left=-2.7;main.shadow.camera.right=2.7;
  main.shadow.camera.top=2.7;main.shadow.camera.bottom=-2.7;
  main.shadow.camera.near=.5;main.shadow.camera.far=12;
  main.shadow.normalBias=.0015;main.shadow.bias=-.00006;
  main.shadow.radius=3.2;
  scene.add(main);
  const fill=new THREE.DirectionalLight(0xd8e6ed,.65);
  fill.position.set(2,1.8,3);scene.add(fill);
  const edge=new THREE.DirectionalLight(0xe2e9eb,.25);
  edge.position.set(.7,1.8,-2.8);scene.add(edge);

  // The PMREM target intentionally lives as long as the scene; only the capture
  // geometries and generator are temporary. Call this when replacing the scene.
  return {dispose(){scene.environment=null;environment.dispose();
    for(const light of [hemisphere,main,fill,edge]){scene.remove(light);light.dispose?.();}}};
}
