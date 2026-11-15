import * as THREE from './vendor/three.module.js';

// Metres. +X points towards the ball; the centre of the tip stays at -.035.
export const CUE_FRONT_X=-.035;
export const CUE_REAR_X=-1.505;

export function createCueModel(materials) {
  const group=new THREE.Group();
  group.name='playing-cue';
  function add(name,geometry,material,shadow=true){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=name;mesh.castShadow=shadow;mesh.receiveShadow=true;group.add(mesh);
    return mesh;
  }
  // A profile of [x,radius], with UV v increasing towards the ball.
  function turned(name,profile,material){
    const geometry=new THREE.LatheGeometry(profile.map(([x,r])=>new THREE.Vector2(r,x)),64);
    geometry.rotateZ(-Math.PI/2);
    return add(name,geometry,material);
  }
  function cylinder(name,rear,front,rearRadius,frontRadius,material){
    const geometry=new THREE.CylinderGeometry(frontRadius,rearRadius,front-rear,64);
    geometry.rotateZ(-Math.PI/2);geometry.translate((rear+front)/2,0,0);
    return add(name,geometry,material);
  }
  cylinder('maple-shaft',-.785,-.049,.0105,.0063,materials.shaft);
  cylinder('ivory-ferrule',-.049,-.0377,.0063,.0063,materials.ferrule);
  // A spherical leather cap: the forwardmost vertex is exactly the old anchor.
  const capHeight=.0027,tipRadius=.0063;
  const sphereRadius=(tipRadius*tipRadius+capHeight*capHeight)/(2*capHeight);
  const capCentre=CUE_FRONT_X-sphereRadius;
  const cap=[[-.0377,0],[-.0377,tipRadius]];
  for(let i=1;i<=10;i++){
    const x=-.0377+capHeight*i/10;
    cap.push([x,i===10?0:Math.sqrt(Math.max(0,sphereRadius*sphereRadius-(x-capCentre)**2))]);
  }
  turned('blue-leather-tip',cap,materials.tip);
  cylinder('joint-ring',-.787,-.785,.0105,.0105,materials.metal);
  cylinder('dark-wood-forearm',-1.075,-.787,.014,.0105,materials.butt);
  cylinder('wrap-front-ring',-1.077,-1.075,.014,.014,materials.metal);
  cylinder('woven-grip',-1.345,-1.077,.015,.014,materials.wrap);
  cylinder('wrap-rear-ring',-1.347,-1.345,.015,.015,materials.metal);
  cylinder('dark-wood-sleeve',-1.478,-1.347,.0156,.015,materials.butt);
  cylinder('butt-ring',-1.480,-1.478,.0156,.0156,materials.metal);
  turned('rubber-bumper',[[CUE_REAR_X,0],[CUE_REAR_X,.0125],[-1.502,.0145],[-1.496,.0156],[-1.480,.0156]],materials.bumper);

  // Thin curved veneers follow the conical forearm rather than flat diamond fins.
  // Their 15-micron clearance avoids intersections with the polygonal wood;
  // they do not cast an additional shadow onto that same surface.
  for(let quarter=0;quarter<4;quarter++){
    const positions=[],uv=[],indices=[];
    const rows=24,columns=8;
    for(let i=0;i<=rows;i++){
      const t=i/rows,x=-1.060+.240*t;
      const radius=.0105+(.014-.0105)*(-.787-x)/.288+.000015;
      const halfWidth=.115*Math.sin(Math.PI*t)**.7;
      for(let j=0;j<=columns;j++){
        const angle=quarter*Math.PI/2+(j/columns*2-1)*halfWidth;
        positions.push(x,radius*Math.cos(angle),radius*Math.sin(angle));uv.push(j/columns,t);
      }
    }
    for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){
      const a=i*(columns+1)+j,b=a+columns+1;
      // The end rows collapse to a point: emit only their fan triangle.
      if(i>0)indices.push(a,a+1,b);
      if(i<rows-1)indices.push(b,a+1,b+1);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    add(`curved-inlay-${quarter+1}`,geometry,materials.inlay,false);
  }
  return group;
}
