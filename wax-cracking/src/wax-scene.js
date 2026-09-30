import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getSquishySpec, createAccessories } from './squishy-models.js';
import { createPressureState, stepPressure, deformPoint, localStress, advanceFracture, getSquishProfile, deformationFrame } from './wax-physics.js';
const clamp = THREE.MathUtils.clamp, smoothstep = THREE.MathUtils.smoothstep;

// Secondary motion per toy: a lagging spring whose overshoot squashes/stretches the toy.
const WOBBLE = {
  butter: {omega:15, zeta:.2, gain:.36},
  platypus: {omega:10.5, zeta:.13, gain:.44},
  lychee: {omega:21, zeta:.17, gain:.42},
  mangosteen: {omega:8.5, zeta:.3, gain:.3},
};
const WAX_DEFAULTS = {roughness:.4, metalness:0, clearcoat:.38, clearcoatRoughness:.42, sheen:.45, sheenRoughness:.55,
  sheenColor:new THREE.Color('#fff3e6'), specularIntensity:.55, side:THREE.DoubleSide};
const EDGE_DEFAULTS = {roughness:.64, metalness:0, clearcoat:.08, clearcoatRoughness:.6, sheen:.85, sheenRoughness:.8,
  sheenColor:new THREE.Color('#fffaf2'), specularIntensity:.35, side:THREE.DoubleSide};
const CORE_DEFAULTS = {roughness:.46, metalness:0, clearcoat:.28, clearcoatRoughness:.4, sheen:.3, sheenRoughness:.6,
  sheenColor:new THREE.Color('#ffffff'), specularIntensity:.5};
const FLECKS = 40;
const STAMP_FONT = '"DM Sans", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';

function randomGenerator(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function clipPolygon(polygon, nx, ny, limit) {
  const output = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = a[0] * nx + a[1] * ny - limit;
    const db = b[0] * nx + b[1] * ny - limit;
    if (da <= 1e-8) output.push(a);
    if ((da < 0) !== (db < 0)) {
      const t = da / (da - db);
      output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return output;
}

const makeCanvas = (w, h = w) => { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas; };

// The top face maps x→u, z→v; its flat area is roughly x 67–957, y 67–253 of 1024×320.
// A butter-wrapper deboss: double rounded border, spaced lettering and small diamond ornaments.
function drawStampArt(ctx, ink) {
  ctx.save(); ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const rounded = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  const cx = 512, cy = 160;
  ctx.lineWidth = 7; rounded(cx - 408, cy - 70, 816, 140, 46); ctx.stroke();
  ctx.lineWidth = 3; rounded(cx - 390, cy - 52, 780, 104, 30); ctx.stroke();
  for (const s of [-1, 1]) {
    const x = cx + s * 300;
    ctx.beginPath(); ctx.moveTo(x, cy - 11); ctx.lineTo(x + 11, cy); ctx.lineTo(x, cy + 11); ctx.lineTo(x - 11, cy); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + s * 24, cy); ctx.lineTo(x + s * 56, cy); ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 84px ${STAMP_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '16px';
  // Trailing letter spacing shifts the visual centre left; nudge it back.
  ctx.fillText('BUTTER', cx + 8, cy + 5);
  ctx.restore();
}

function makeStamp() {
  const color = makeCanvas(1024, 320), bump = makeCanvas(512, 160);
  const draw = () => {
    let ctx = color.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1024, 320);
    drawStampArt(ctx, '#d3c6ae');
    // Height: white is the wax surface, dark is pressed in.
    ctx = bump.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 160);
    ctx.save(); ctx.scale(.5, .5); if ('filter' in ctx) ctx.filter = 'blur(2px)';
    drawStampArt(ctx, '#1c1c1c'); ctx.restore();
  };
  draw();
  const map = new THREE.CanvasTexture(color), bumpMap = new THREE.CanvasTexture(bump);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = bumpMap.anisotropy = 4;
  return {map, bumpMap, redraw() { draw(); map.needsUpdate = true; bumpMap.needsUpdate = true; }};
}

// Tileable lychee tubercles: domed bumps with a tiny spike, darker rosy crevices.
function makeRindTextures() {
  const S = 512, random = randomGenerator(6192);
  const height = makeCanvas(S), color = makeCanvas(S);
  const h = height.getContext('2d'), c = color.getContext('2d');
  h.fillStyle = '#161616'; h.fillRect(0, 0, S, S);
  c.fillStyle = '#c99697'; c.fillRect(0, 0, S, S);
  const cell = S / 8;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const x = (col + (row % 2) * .5) * cell + (random() - .5) * 10, y = row * cell + (random() - .5) * 10;
    const radius = cell * (.44 + random() * .12), tone = .9 + random() * .1, warm = random();
    const top = `rgb(255,${Math.round(236 + warm * 14)},${Math.round(222 + warm * 18)})`;
    const mid = `rgb(${Math.round(244 * tone)},${Math.round(206 * tone)},${Math.round(200 * tone)})`;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      const px = x + dx, py = y + dy;
      if (px < -cell || px > S + cell || py < -cell || py > S + cell) continue;
      let g = h.createRadialGradient(px - 3, py - 3, 1, px, py, radius);
      g.addColorStop(0, '#e6e6e6'); g.addColorStop(.4, '#b0b0b0'); g.addColorStop(.8, '#5a5a5a'); g.addColorStop(1, '#161616');
      h.fillStyle = g; h.beginPath(); h.arc(px, py, radius, 0, Math.PI * 2); h.fill();
      h.fillStyle = '#ffffff'; h.beginPath(); h.arc(px - 1, py - 1, 3.2, 0, Math.PI * 2); h.fill();
      g = c.createRadialGradient(px - 4, py - 4, 1, px, py, radius);
      g.addColorStop(0, top); g.addColorStop(.45, mid); g.addColorStop(1, '#c99697');
      c.fillStyle = g; c.beginPath(); c.arc(px, py, radius, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff6ea'; c.beginPath(); c.arc(px - 1, py - 1, 2.4, 0, Math.PI * 2); c.fill();
    }
  }
  const bump = new THREE.CanvasTexture(height), map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [bump, map]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2.2); t.anisotropy = 4; }
  return {bump, map};
}

function makeContactShadowTexture() {
  const canvas = makeCanvas(128), ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  // Dense core where the toy touches, feathering into a wide penumbra.
  g.addColorStop(0, 'rgba(92,62,52,.78)'); g.addColorStop(.5, 'rgba(92,62,52,.6)'); g.addColorStop(.6, 'rgba(92,62,52,.4)');
  g.addColorStop(.78, 'rgba(92,62,52,.13)'); g.addColorStop(1, 'rgba(92,62,52,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function surfacePoint(point, spec) {
  const half = spec.size;
  let normal;
  if (spec.shape === 'ellipsoid') {
    const unit = new THREE.Vector3(point.x / half[0], point.y / half[1], point.z / half[2]).normalize();
    point.set(unit.x * half[0], unit.y * half[1], unit.z * half[2]);
    normal = new THREE.Vector3(unit.x / half[0], unit.y / half[1], unit.z / half[2]).normalize();
    if (spec.surface === 'lychee') {
      // Coherent across all six face boundaries; wax has the fruit's fine texture.
      const wave = Math.sin(point.x * 25) * Math.sin(point.y * 25) * Math.sin(point.z * 25);
      point.addScaledVector(normal, 0.018 * wave * wave);
    }
  } else {
    const radius = spec.roundness || 0.29;
    const inside = new THREE.Vector3(...half.map((h, i) => clamp(point.getComponent(i), -h + radius, h - radius)));
    normal = point.clone().sub(inside).normalize();
    point.copy(inside).addScaledVector(normal, radius);
  }
  if (spec.displace) point.addScaledVector(normal, spec.displace(point, normal) || 0);
  return {point, normal};
}

function buildShell(group, materials, spec) {
  const random = randomGenerator(81377);
  const cells = [];
  const half = spec.size;
  const faces = [
    {axis:1,sign:1,u:0,v:2}, {axis:1,sign:-1,u:0,v:2},
    {axis:2,sign:1,u:0,v:1}, {axis:2,sign:-1,u:0,v:1},
    {axis:0,sign:1,u:2,v:1}, {axis:0,sign:-1,u:2,v:1},
  ];
  for (const face of faces) {
    const hu = half[face.u], hv = half[face.v];
    const nx = Math.max(3, Math.round(hu * 4.2)), ny = Math.max(3, Math.round(hv * 4.2));
    const seeds = [];
    for(let i=0;i<nx;i++) for(let j=0;j<ny;j++) seeds.push([
      -hu + (i + .16 + random() * .68) * 2 * hu / nx,
      -hv + (j + .16 + random() * .68) * 2 * hv / ny,
    ]);
    const toSurface = uv => {
      const p = [0,0,0]; p[face.axis] = half[face.axis] * face.sign; p[face.u] = uv[0]; p[face.v] = uv[1];
      return surfacePoint(new THREE.Vector3(...p), spec);
    };
    for (const seed of seeds) {
      let polygon = [[-hu,-hv],[hu,-hv],[hu,hv],[-hu,hv]];
      for(const other of seeds) {
        if(other===seed) continue;
        polygon=clipPolygon(polygon, other[0]-seed[0], other[1]-seed[1], (other[0]**2+other[1]**2-seed[0]**2-seed[1]**2)/2);
        if(!polygon.length) break;
      }
      if(polygon.length<3) continue;
      const boundary=[];
      for(let i=0;i<polygon.length;i++) {
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        const steps=Math.max(2,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.085));
        for(let j=0;j<steps;j++) boundary.push([a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps]);
      }
      const center=toSurface(seed), positions=[], normals=[], uvs=[];
      const push=(s,inset=0,n=s.normal)=>{
        const p=s.point.clone().addScaledVector(s.normal,-inset);
        positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);
        if(spec.stamp)uvs.push((s.point.x/half[0]+1)/2,(1-s.point.z/half[2])/2);
        else uvs.push((s.point.getComponent(face.u)/hu+1)/2,(s.point.getComponent(face.v)/hv+1)/2);
      };
      for(let i=0;i<boundary.length;i++) {
        const a=toSurface(boundary[i]),b=toSurface(boundary[(i+1)%boundary.length]);
        const outward=a.point.clone().sub(center.point).cross(b.point.clone().sub(center.point)).dot(center.normal)>0;
        push(center);push(outward?a:b);push(outward?b:a);
      }
      const frontCount=positions.length/3;
      // Thick fissure walls; the outer rim shades like a rounded, softened wax lip.
      const depth=.046;
      for(let i=0;i<boundary.length;i++) {
        const a=toSurface(boundary[i]),b=toSurface(boundary[(i+1)%boundary.length]);
        const n=b.point.clone().sub(a.point).cross(a.normal).normalize();
        const la=n.clone().add(a.normal).normalize(),lb=n.clone().add(b.normal).normalize();
        push(a,0,la);push(a,depth,n);push(b,0,lb);push(b,0,lb);push(a,depth,n);push(b,depth,n);
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      geometry.addGroup(0,frontCount,0);geometry.addGroup(frontCount,positions.length/3-frontCount,1);
      const mesh=new THREE.Mesh(geometry,[spec.stamp&&face.axis===1&&face.sign===1?materials.top:materials.wax,materials.edge]);
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);
      // A central fracture band branches along irregular adjacent cell boundaries.
      const x=Math.abs(center.point.x/half[0]);
      const threshold=.075+x*.19+random()*.08;
      cells.push({mesh, base:Float32Array.from(positions), normals:Float32Array.from(normals),
        origin:center.point,normal:center.normal, threshold, damage:0, opening:0,
        tilt:(random()-.5)*.36, hinge:new THREE.Vector3(random()-.5,random()-.5,random()-.5).cross(center.normal).normalize(), neighbors:[]});
    }
  }
  // Nearest touching plates transmit stress, encouraging connected fracture fronts.
  for(const cell of cells) {
    cell.neighbors=cells.filter(other=>other!==cell).sort((a,b)=>a.origin.distanceToSquared(cell.origin)-b.origin.distanceToSquared(cell.origin)).slice(0,4);
  }
  return cells;
}

function normalUnderPressure(nx,ny,nz,x,y,z,p,halfX,out,index,profile) {
  const {sx,sy,sz,dsy,bendSlope}=deformationFrame(x,p,halfX,profile);
  const yx=y*dsy+bendSlope,zx=-z*dsy/(sx*sy*sy);
  const a=(nx-yx*ny/sy-zx*nz/sz)/sx,b=ny/sy,c=nz/sz;
  const length=Math.hypot(a,b,c);
  if(length<1e-10){out[index]=0;out[index+1]=1;out[index+2]=0;return;}
  const inverse=1/length;out[index]=a*inverse;out[index+1]=b*inverse;out[index+2]=c*inverse;
}

// Copies optional MeshPhysicalMaterial params from a toy spec, ignoring anything unknown.
function applyOverrides(material,params,skip=[]) {
  if(!params||typeof params!=='object')return;
  for(const [key,value] of Object.entries(params)) {
    if(skip.includes(key)||!(key in material)||value==null)continue;
    const current=material[key];
    if(current?.isColor){if(typeof value==='string'||typeof value==='number'||value?.isColor)current.set(value);}
    else if(typeof current==='number'&&Number.isFinite(Number(value)))material[key]=Number(value);
    else if(typeof current==='boolean')material[key]=Boolean(value);
    else if(Array.isArray(current)&&Array.isArray(value))material[key]=[...value];
  }
  material.needsUpdate=true;
}

const backOut=t=>{const c=1.9;return 1+(c+1)*(t-1)**3+c*(t-1)**2;};

export function createWaxScene(container,{onReady,onError,onCrack}={}) {
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
  catch(error) {onError?.(error);return {setPressure(){},setColor(){},setSquishy(){},setWaxEnabled(){},reset(){},resize(){},dispose(){},getStats:()=>({available:false})};}
  let pixelRatio=Math.min(window.devicePixelRatio||1,2);renderer.setPixelRatio(pixelRatio);renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=.95;
  renderer.domElement.setAttribute('role','img');renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none';container.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,80);
  camera.position.set(5.4,6.5,8.6);camera.lookAt(0,0,0);
  // Soft studio reflections for wax, clearcoat and sheen; the page background stays CSS.
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const envTarget=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  scene.environment=envTarget.texture;scene.environmentIntensity=.62;scene.environmentRotation.y=-.5;
  scene.add(new THREE.HemisphereLight(0xfff6ea,0xd8c2bd,.75));
  const key=new THREE.DirectionalLight(0xffeedb,2.15);key.position.set(-3,7,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;
  key.shadow.normalBias=.03;key.shadow.bias=-.0002;key.shadow.radius=6;scene.add(key);
  const rim=new THREE.DirectionalLight(0xffcfe2,1.7);rim.position.set(4,3.5,-5);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xdfe5ff,.45);fill.position.set(-5,1,-2);scene.add(fill);
  const stage=new THREE.Group();stage.rotation.set(0,-.22,-.035);scene.add(stage);
  const stamp=makeStamp(),rind=makeRindTextures();
  const pristine={wax:new THREE.MeshPhysicalMaterial(WAX_DEFAULTS),edge:new THREE.MeshPhysicalMaterial(EDGE_DEFAULTS),core:new THREE.MeshPhysicalMaterial(CORE_DEFAULTS)};
  const wax=pristine.wax.clone(),top=pristine.wax.clone(),edge=pristine.edge.clone(),coreMaterial=pristine.core.clone(),coreSideMaterial=pristine.core.clone();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x5a4034,opacity:.13}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  // Soft blurred contact shadow that follows the toy's footprint and squash.
  const contactTexture=makeContactShadowTexture();
  const contactRoot=new THREE.Group();scene.add(contactRoot);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false}));
  contact.rotation.x=-Math.PI/2;contact.renderOrder=1;contactRoot.add(contact);
  // Pooled wax flecks that pop off newly cracked plates.
  const fleckGeometry=new THREE.IcosahedronGeometry(1,0);fleckGeometry.scale(1,.42,.78);
  const fleckMaterial=new THREE.MeshStandardMaterial({roughness:.55,flatShading:true});
  const flecks=new THREE.InstancedMesh(fleckGeometry,fleckMaterial,FLECKS);flecks.frustumCulled=false;flecks.visible=false;scene.add(flecks);
  const particles=Array.from({length:FLECKS},()=>({life:0,max:1,size:.04,pos:new THREE.Vector3(),vel:new THREE.Vector3(),rot:new THREE.Euler(),spin:new THREE.Vector3()}));
  let nextParticle=0;
  const tmpMatrix=new THREE.Matrix4(),tmpQuat=new THREE.Quaternion(),tmpScale=new THREE.Vector3(),tmpVec=new THREE.Vector3(),tmpDir=new THREE.Vector3();
  const zeroMatrix=new THREE.Matrix4().makeScale(0,0,0);for(let i=0;i<FLECKS;i++)flecks.setMatrixAt(i,zeroMatrix);
  let framePoints=new Float32Array(0),spec,profile,cells=[],core,coreBase,coreBareBase,coreNormals,accessories=[],toy,footprint={x:1,z:1,cx:0,cz:0};
  let waxEnabled=true,firstLoad=true,toyTextures=null;
  const physics=createPressureState();let target=0,alive=true,raf,lastTime=0,width=0,height=0;
  // Secondary animation state.
  let follow=0,followVelocity=0,enterTime=Infinity,landed=true,eyeOpen=1,appliedEye=1,blinkStart=-1,nextBlink=2.5,doubleBlink=false,clock=0;
  const tilt={x:0,y:0,tx:0,ty:0};
  const initialCamera=camera.position.clone().normalize();
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const random=Math.random;

  function disposeToy() {
    if(!toy)return;
    toy.traverse(obj=>{obj.geometry?.dispose();if(obj.userData.accessory&&obj.material) for(const material of [].concat(obj.material))material.dispose();});
    stage.remove(toy);disposeToyTextures();
  }
  // Plug-in squishies may bring their own shell/top/core textures.
  function disposeToyTextures() {
    if(!toyTextures)return;
    const all=[toyTextures,toyTextures.top,toyTextures.core].filter(Boolean).flatMap(t=>[t.map,t.bumpMap]);
    new Set(all.filter(Boolean)).forEach(t=>t.dispose());toyTextures=null;
  }
  function resetMaterials() {
    wax.copy(pristine.wax);top.copy(pristine.wax);edge.copy(pristine.edge);coreMaterial.copy(pristine.core);
    const lychee=spec.surface==='lychee';
    wax.bumpMap=lychee?rind.bump:null;wax.map=lychee?rind.map:null;wax.bumpScale=1.1;
    top.map=stamp.map;top.bumpMap=stamp.bumpMap;top.bumpScale=1.6;
    if(toyTextures) {
      wax.map=toyTextures.map||null;wax.bumpMap=toyTextures.bumpMap||null;wax.bumpScale=toyTextures.bumpScale??1;
      const face=toyTextures.top||toyTextures;
      top.map=face.map||null;top.bumpMap=face.bumpMap||null;top.bumpScale=face.bumpScale??1;
    }
    applyOverrides(wax,spec.wax,['color','map','bumpMap']);applyOverrides(top,spec.wax,['color','map','bumpMap']);
    // Fissure walls stay matte whatever the surface gloss.
    applyOverrides(edge,spec.wax,['color','map','bumpMap','roughness','emissive','emissiveIntensity','clearcoat','clearcoatRoughness','specularIntensity']);
    applyOverrides(coreMaterial,spec.core,['color','map','bumpMap']);
    for(const m of [wax,top,edge,coreMaterial])m.needsUpdate=true;
  }
  function setSquishy(id) {
    disposeToy();spec=getSquishySpec(id);profile=spec.profile||getSquishProfile(spec.id);toy=new THREE.Group();stage.add(toy);
    toyTextures=spec.textures?.()||null;
    resetMaterials();
    cells=buildShell(toy,{wax,top,edge},spec);
    cells.forEach(cell=>{cell.mesh.visible=waxEnabled;});
    const geo=new THREE.SphereGeometry(1,64,40);
    // Use a dense cube for rounded-box interiors, maintaining matching corners.
    const coreGeo=spec.shape==='ellipsoid'?geo:new THREE.BoxGeometry(spec.size[0]*2,spec.size[1]*2,spec.size[2]*2,36,16,16);
    if(coreGeo!==geo)geo.dispose();
    const pos=coreGeo.attributes.position.array;
    coreBareBase=new Float32Array(pos.length);
    for(let i=0;i<pos.length;i+=3) {
      const point=new THREE.Vector3(pos[i],pos[i+1],pos[i+2]);
      if(spec.shape==='ellipsoid')point.multiply(new THREE.Vector3(...spec.size));
      const surf=surfacePoint(point,spec);
      coreBareBase[i]=surf.point.x;coreBareBase[i+1]=surf.point.y;coreBareBase[i+2]=surf.point.z;
      surf.point.addScaledVector(surf.normal,-.046);
      pos[i]=surf.point.x;pos[i+1]=surf.point.y;pos[i+2]=surf.point.z;
    }
    coreGeo.computeVertexNormals();coreBase=pos.slice();coreNormals=coreGeo.attributes.normal.array.slice();
    // A rounded-box core can keep its bare-toy texture on the top face only (box groups: +x,-x,+y,-y,+z,-z).
    const topOnly=spec.shape!=='ellipsoid'&&toyTextures?.core?.topOnly,side=coreSideMaterial;
    core=new THREE.Mesh(coreGeo,topOnly?[side,side,coreMaterial,side,side,side]:coreMaterial);core.castShadow=true;core.receiveShadow=true;core.frustumCulled=false;toy.add(core);
    const extra=createAccessories(id);extra.updateMatrixWorld(true);accessories=[];
    extra.traverse(obj=>{
      if(!obj.isMesh)return;const geo=obj.geometry.clone();geo.applyMatrix4(obj.matrixWorld);
      const mesh=new THREE.Mesh(geo,obj.material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
      mesh.userData={...obj.userData,accessory:true};toy.add(mesh);
      accessories.push({mesh,base:geo.attributes.position.array.slice(),normals:geo.attributes.normal.array.slice(),role:obj.userData?.role,pivot:obj.userData?.pivot});
    });
    extra.traverse(obj=>obj.geometry?.dispose());
    setupEyes();measureFootprint();
    // A thinned point cloud of the resting toy for camera framing.
    const cloud=[];const addPoints=(array,stride)=>{for(let i=0;i<array.length;i+=3*stride)cloud.push(array[i],array[i+1],array[i+2]);};
    addPoints(coreBareBase,4);for(const a of accessories)addPoints(a.base,Math.max(1,Math.round(a.base.length/600)));
    framePoints=Float32Array.from(cloud);
    setColor(spec.color);
    Object.assign(physics,createPressureState());target=0;follow=0;followVelocity=0;eyeOpen=appliedEye=1;blinkStart=-1;
    renderer.domElement.setAttribute('aria-label',`Interactive 3D wax-coated ${spec.name.toLowerCase()} squishy`);
    ground.position.y=-spec.size[1]-.02;contactRoot.position.y=ground.position.y+.004;
    for(const particle of particles)particle.life=0;
    // Pop in with a little drop and landing squash (not on the very first load).
    if(!firstLoad&&!reducedMotion.matches){enterTime=0;landed=false;}else{enterTime=Infinity;landed=true;}
    firstLoad=false;
    updateGeometry(0);placeToy(0);resize();
  }
  // Eye-like accessories blink and squint about their own pivot (toy space).
  function setupEyes() {
    const isEye=role=>typeof role==='string'&&/^(eye|pupil|glint)/i.test(role);
    const pivots=[];
    for(const a of accessories) {
      if(!isEye(a.role)){a.eye=null;continue;}
      const p=a.pivot;
      if(Array.isArray(p)&&p.length>=3&&p.every(Number.isFinite)){a.eye=[p[0],p[1],p[2]];pivots.push(a.eye);}
      else a.eye='pending';
    }
    for(const a of accessories) if(a.eye==='pending') {
      a.mesh.geometry.computeBoundingBox();const c=a.mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
      a.eye=pivots.length?pivots.reduce((best,p)=>Math.hypot(p[0]-c.x,p[1]-c.y,p[2]-c.z)<Math.hypot(best[0]-c.x,best[1]-c.y,best[2]-c.z)?p:best):[c.x,c.y,c.z];
    }
  }
  function measureFootprint() {
    const box=new THREE.Box3();box.expandByPoint(tmpVec.set(...spec.size));box.expandByPoint(tmpVec.set(-spec.size[0],-spec.size[1],-spec.size[2]));
    for(const a of accessories){const b=a.base;for(let i=0;i<b.length;i+=3)if(b[i+1]<spec.size[1]*.2)box.expandByPoint(tmpVec.set(b[i],b[i+1],b[i+2]));}
    footprint={x:box.max.x-box.min.x,z:box.max.z-box.min.z,cx:(box.max.x+box.min.x)/2,cz:(box.max.z+box.min.z)/2};
  }
  function setColor(hex) {
    const color=new THREE.Color(hex);wax.color.copy(color);top.color.copy(color);
    // Exposed plate edges read as thicker, lighter, slightly translucent wax.
    edge.color.copy(color).lerp(new THREE.Color('#fff7ea'),.3);edge.emissive.copy(color).multiplyScalar(.09);
    fleckMaterial.color.copy(edge.color);
    updateCoreMaterial();
  }
  function updateCoreMaterial() {
    coreMaterial.color.copy(waxEnabled ? new THREE.Color(spec.coreColor) : wax.color);
    coreMaterial.bumpMap=!waxEnabled&&spec.surface==='lychee'?rind.bump:null;
    coreMaterial.map=!waxEnabled&&spec.surface==='lychee'?rind.map:null;
    coreMaterial.bumpScale=.6;
    const bare=!waxEnabled&&toyTextures?.core;
    if(bare){coreMaterial.map=bare.map||null;coreMaterial.bumpMap=bare.bumpMap||null;coreMaterial.bumpScale=bare.bumpScale??.6;}
    coreMaterial.needsUpdate=true;
    coreSideMaterial.copy(coreMaterial);
    if(bare){coreSideMaterial.map=toyTextures.map||null;coreSideMaterial.bumpMap=toyTextures.bumpMap||null;coreSideMaterial.bumpScale=toyTextures.bumpScale??1;}
    coreSideMaterial.needsUpdate=true;
  }
  function setWaxEnabled(value) {
    waxEnabled=Boolean(value);
    for(const cell of cells){cell.mesh.visible=waxEnabled;cell.damage=0;cell.opening=0;}
    updateCoreMaterial();
    updateGeometry(0);
    renderer.domElement.setAttribute('aria-label',`Interactive 3D ${waxEnabled?'wax-coated':'soft'} ${spec.name.toLowerCase()} squishy`);
  }
  function resize() {
    const rect=container.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    renderer.setSize(width,height,false);camera.aspect=width/height;
    if(spec)fitCamera();
  }
  // Fit the toy (body + accessories, with room for stretch/bulge) into the view, both ways.
  function fitCamera() {
    const d=initialCamera,right=tmpVec.set(0,1,0).cross(d).normalize().clone(),up=d.clone().cross(right).normalize();
    // Respect UI overlays: the page may declare safe insets on the container.
    const style=getComputedStyle(container),inset=name=>Math.max(0,parseFloat(style.getPropertyValue(name))||0);
    let safeTop=inset('--scene-safe-top'),safeBottom=inset('--scene-safe-bottom');
    const shrink=Math.min(1,height*.6/Math.max(1,safeTop+safeBottom));safeTop*=shrink;safeBottom*=shrink;
    const usable=(height-safeTop-safeBottom)/height,tanFull=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const tanV=tanFull*usable*.97,tanH=tanFull*camera.aspect*.92;
    const shift=(safeTop-safeBottom)/2;
    if(Math.abs(shift)>.5)camera.setViewOffset(width,height,0,-shift,width,height);else camera.clearViewOffset();
    const rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0,-.22,-.035)),h=spec.size[1];
    const box=new THREE.Box3(),points=[],pressed=.95,drop=-h-(-h+(lowestPoint(pressed)+h)*.7);
    for(let i=0;i<framePoints.length;i+=3) {
      // Resting pose with stretch headroom, and the planted, bulging full squeeze.
      const x=framePoints[i],y=framePoints[i+1],z=framePoints[i+2],sq=deformPoint(x,y,z,pressed,spec.size[0],profile);
      for(const q of [new THREE.Vector3(x*1.04,-h+(y+h)*1.12,z*1.04),new THREE.Vector3(sq[0]*1.04,sq[1]+drop,sq[2]*1.04)]) {
        q.applyMatrix4(rotation);points.push(q);box.expandByPoint(q);
      }
    }
    const target=box.getCenter(new THREE.Vector3());let distance=0;
    for(const q of points) {
      const rel=q.sub(target),along=rel.dot(d);
      distance=Math.max(distance,along+Math.abs(rel.dot(up))/tanV,along+Math.abs(rel.dot(right))/tanH);
    }
    camera.position.copy(target).addScaledVector(d,distance);camera.lookAt(target);camera.updateProjectionMatrix();
  }
  function deformGeometry(mesh,base,normals,eye) {
    const positions=mesh.geometry.attributes.position.array,normalArray=mesh.geometry.attributes.normal.array,p=physics.pressure;
    const s=eye?eyeOpen:1,py=eye?eye[1]:0;
    for(let i=0;i<base.length;i+=3) {
      const x=base[i],y=s===1?base[i+1]:py+(base[i+1]-py)*s,z=base[i+2],d=deformPoint(x,y,z,p,spec.size[0],profile);
      positions[i]=d[0];positions[i+1]=d[1];positions[i+2]=d[2];
      normalUnderPressure(normals[i]*s,normals[i+1],normals[i+2]*s,x,y,z,p,spec.size[0],normalArray,i,profile);
    }
    mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.attributes.normal.needsUpdate=true;
  }
  function deformAccessories(onlyEyes) {
    for(const a of accessories) if(!onlyEyes||a.eye)deformGeometry(a.mesh,a.base,a.normals,a.eye);
    appliedEye=eyeOpen;
  }
  function spawnFlecks(cell) {
    const p=physics.pressure,n=cell.normal,o=cell.origin;
    const d=deformPoint(o.x+n.x*.03,o.y+n.y*.03,o.z+n.z*.03,p,spec.size[0],profile);
    tmpDir.copy(n).transformDirection(toy.matrixWorld);
    const count=1+(random()<.45?1:0);
    for(let k=0;k<count;k++) {
      const q=particles[nextParticle];nextParticle=(nextParticle+1)%FLECKS;
      q.pos.set(d[0],d[1],d[2]);toy.localToWorld(q.pos);
      q.vel.copy(tmpDir).multiplyScalar(1+random()*1.3).add(tmpVec.set((random()-.5)*1.1,1.3+random()*1.4,(random()-.5)*1.1));
      q.rot.set(random()*6,random()*6,random()*6);q.spin.set((random()-.5)*16,(random()-.5)*16,(random()-.5)*16);
      q.size=.028+random()*.03;q.max=1+random()*.6;q.life=q.max;
    }
  }
  function updateFlecks(dt) {
    let any=false;const floor=ground.position.y;
    for(let i=0;i<FLECKS;i++) {
      const q=particles[i];
      if(q.life<=0){if(q.max>0){flecks.setMatrixAt(i,zeroMatrix);q.max=0;any=true;}continue;}
      any=true;q.life-=dt;
      q.vel.y-=7.5*dt;q.pos.addScaledVector(q.vel,dt);
      if(q.pos.y<floor+q.size*.45){q.pos.y=floor+q.size*.45;if(q.vel.y<0)q.vel.y*=-.3;q.vel.x*=.72;q.vel.z*=.72;q.spin.multiplyScalar(.6);}
      q.rot.x+=q.spin.x*dt;q.rot.y+=q.spin.y*dt;q.rot.z+=q.spin.z*dt;
      const age=q.max-q.life,fade=Math.min(1,age/.06)*Math.min(1,Math.max(0,q.life)/(q.max*.35));
      tmpScale.setScalar(q.size*fade);tmpMatrix.compose(q.pos,tmpQuat.setFromEuler(q.rot),tmpScale);flecks.setMatrixAt(i,tmpMatrix);
    }
    flecks.visible=particles.some(q=>q.life>0);
    if(any)flecks.instanceMatrix.needsUpdate=true;
  }
  function updateGeometry(dt) {
    const p=physics.pressure;let newCracks=0;const cracked=[];
    for(const cell of cells) {
      if(!waxEnabled)continue;
      const transmitted=cell.neighbors.reduce((n,c)=>n+c.damage,0)/cell.neighbors.length*.085;
      const stress=localStress(cell.origin.x,cell.origin.y,cell.origin.z,spec.size,p)+transmitted*p;
      if(advanceFracture(cell,stress,p,physics.restTime>.16,dt)){newCracks++;cracked.push(cell);}
      const positions=cell.mesh.geometry.attributes.position.array,normalArray=cell.mesh.geometry.attributes.normal.array;
      const open=cell.opening,base=cell.base,n=cell.normal,origin=cell.origin;
      for(let i=0;i<base.length;i+=3) {
        // Contract only in the shell's tangent plane, exposing a narrow fissure.
        // Every resulting vertex follows the core field; no plate floats away.
        const dx=base[i]-origin.x,dy=base[i+1]-origin.y,dz=base[i+2]-origin.z;
        const radial=dx*n.x+dy*n.y+dz*n.z;
        const buckle=smoothstep(p,.52,1)*cell.damage*cell.tilt;
        const hingeDistance=dx*cell.hinge.x+dy*cell.hinge.y+dz*cell.hinge.z;
        const lift=open*.13+clamp(hingeDistance*buckle,-.014,.055);
        const x=base[i]-(dx-radial*n.x)*open+n.x*lift;
        const y=base[i+1]-(dy-radial*n.y)*open+n.y*lift;
        const z=base[i+2]-(dz-radial*n.z)*open+n.z*lift;
        const d=deformPoint(x,y,z,p,spec.size[0],profile);
        positions[i]=d[0];positions[i+1]=d[1];positions[i+2]=d[2];
        const isFace=cell.normals[i]*n.x+cell.normals[i+1]*n.y+cell.normals[i+2]*n.z>.5;
        const slope=isFace?buckle:0;
        normalUnderPressure(cell.normals[i]-cell.hinge.x*slope,cell.normals[i+1]-cell.hinge.y*slope,cell.normals[i+2]-cell.hinge.z*slope,x,y,z,p,spec.size[0],normalArray,i,profile);
      }
      cell.mesh.geometry.attributes.position.needsUpdate=true;cell.mesh.geometry.attributes.normal.needsUpdate=true;
    }
    deformGeometry(core,waxEnabled?coreBase:coreBareBase,coreNormals);deformAccessories(false);
    if(newCracks) {
      onCrack?.({count:newCracks,strength:Math.min(1,.25+p*.65+newCracks*.018)});
      if(!reducedMotion.matches&&dt>0) {
        for(const cell of cracked.slice(0,10))spawnFlecks(cell);
      }
    }
  }
  // Lowest deformed point of the base, so squeezes press down onto the table.
  function lowestPoint(p) {
    const h=spec.size[1],hx=spec.size[0];let low=Infinity;
    for(const u of [-.85,-.4,0,.4,.85])low=Math.min(low,deformPoint(u*hx,-h,0,p,hx,profile)[1]);
    return low;
  }
  function placeToy(dt) {
    const motion=!reducedMotion.matches,w=spec.wobble||WOBBLE[spec.id]||WOBBLE.butter,p=physics.pressure;
    // Lagging spring: overshoot relative to the pressure field becomes squash & stretch.
    // It only wobbles once the toy is let go; while squeezed any leftover wobble eases out.
    if(motion&&dt>0&&target<.05) {
      let remaining=dt;
      while(remaining>1e-6){const h=Math.min(remaining,1/240);followVelocity+=(w.omega*w.omega*(p-follow)-2*w.zeta*w.omega*followVelocity)*h;follow+=followVelocity*h;remaining-=h;}
    } else if(motion&&dt>0) {follow=p+(follow-p)*Math.exp(-dt*18);followVelocity=0;}
    else {follow=p;followVelocity=0;}
    let squash=clamp((follow-p)*w.gain,-.2,.24);
    if(motion)squash+=Math.sin(clock*1.9)*.009*(1-p);
    let enterScale=1,drop=0;
    if(enterTime<Infinity) {
      enterTime+=dt;const fall=.27;
      drop=enterTime<fall?1.5*(1-(enterTime/fall)**2):0;
      if(!landed&&enterTime>=fall){landed=true;followVelocity+=w.omega*.36;}
      enterScale=.25+.75*backOut(Math.min(1,enterTime/.5));
      if(enterTime>1.4)enterTime=Infinity;
    }
    const sy=(1-squash)*enterScale,sxz=enterScale/Math.sqrt(1-squash);
    toy.scale.set(sxz,sy,sxz);
    // Mostly planted: the squeeze presses down onto the table, leaving a small lift.
    const h=spec.size[1],low=-h+(lowestPoint(p)+h)*.7;
    toy.position.y=-h-sy*low+drop;
    // Contact shadow widens with the squeeze, fades as the toy lifts off.
    const frame=deformationFrame(0,p,spec.size[0],profile),lift=Math.max(0,drop+stage.position.y+(low+h)*.43*sy);
    const spread=(1+(frame.sx-1)*.8)*sxz*(1+lift*.35),z=(1+(frame.sz-1)*.6)*sxz*(1+lift*.35);
    contact.scale.set(footprint.x*1.62*spread,footprint.z*1.75*z,1);contact.position.set(footprint.cx*sxz,0,footprint.cz*sxz);
    contact.material.opacity=clamp((1+p*.25)/(1+lift*3.2),0,1.25)*.95;
    contactRoot.rotation.y=stage.rotation.y;
  }
  function updateBlink(dt) {
    if(!accessories.some(a=>a.eye)){eyeOpen=1;return;}
    let blink=1;
    if(!reducedMotion.matches) {
      if(blinkStart<0&&clock>=nextBlink){blinkStart=clock;doubleBlink=random()<.2;}
      if(blinkStart>=0) {
        const t=clock-blinkStart,dur=.13,total=doubleBlink?dur*2+.09:dur;
        const phase=t<dur?t/dur:doubleBlink&&t>dur+.09&&t<total?(t-dur-.09)/dur:-1;
        if(phase>=0)blink=1-.9*Math.sin(Math.PI*phase);
        if(t>=total){blinkStart=-1;nextBlink=clock+3+random()*3;}
      }
    }
    // Squint a little under a big squeeze (>_<).
    const squint=1-.62*smoothstep(physics.pressure,.45,.95);
    eyeOpen=Math.min(blink,squint);
  }
  function onPointerMove(event) {
    const rect=renderer.domElement.getBoundingClientRect();
    tilt.tx=clamp((event.clientX-rect.left)/rect.width*2-1,-1,1);tilt.ty=clamp((event.clientY-rect.top)/rect.height*2-1,-1,1);
  }
  function onPointerLeave(){tilt.tx=0;tilt.ty=0;}
  renderer.domElement.addEventListener('pointermove',onPointerMove);
  renderer.domElement.addEventListener('pointerleave',onPointerLeave);
  // Weak GPUs: step the pixel ratio down while frames stay slow.
  let slowFrames=0,sampledFrames=0;
  function adaptQuality(ms) {
    if(ms>100||pixelRatio<=1)return;
    sampledFrames++;if(ms>24)slowFrames++;
    if(sampledFrames<90)return;
    if(slowFrames>60){pixelRatio=Math.max(1,pixelRatio-.25);renderer.setPixelRatio(pixelRatio);resize();}
    slowFrames=sampledFrames=0;
  }
  function frame(time) {
    if(!alive)return;
    if(lastTime)adaptQuality(time-lastTime);
    const dt=Math.min(.05,(time-lastTime)/1000||.016);lastTime=time;clock+=dt;
    const motion=!reducedMotion.matches;
    const before=physics.pressure;stepPressure(physics,target,dt,profile);
    updateBlink(dt);
    if(Math.abs(before-physics.pressure)>1e-7||cells.some(cell=>cell.damage>0||cell.opening>1e-6))updateGeometry(dt);
    else if(Math.abs(eyeOpen-appliedEye)>1e-4)deformAccessories(true);
    const ease=1-Math.exp(-dt*4);
    tilt.x+=((motion?tilt.tx:0)-tilt.x)*ease;tilt.y+=((motion?tilt.ty:0)-tilt.y)*ease;
    stage.position.y=motion?(Math.sin(time*.00065)+1)*.014:0;
    stage.rotation.y=-.22+(motion?Math.sin(time*.00026)*.02:0)+tilt.x*.09;
    stage.rotation.x=tilt.y*.035;
    placeToy(dt);updateFlecks(dt);
    renderer.render(scene,camera);raf=requestAnimationFrame(frame);
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
  setSquishy('butter');raf=requestAnimationFrame(frame);onReady?.();
  // Redraw the stamp once the rounded UI font is available.
  document.fonts?.load?.(`700 90px ${STAMP_FONT}`).then(()=>{if(alive)stamp.redraw();},()=>{});
  return {
    setPressure(value){target=Number.isFinite(value)?clamp(value,0,1):0;},setColor,setSquishy,setWaxEnabled,
    reset(){target=0;},resize,
    getStats(){return {available:true,pressure:physics.pressure,targetPressure:target,fragments:cells.length,fractureCount:cells.filter(c=>c.damage>0).length,squishy:spec.id,waxEnabled,width,height,drawCalls:renderer.info.render.calls};},
    dispose(){
      alive=false;cancelAnimationFrame(raf);resizeObserver.disconnect();disposeToy();
      renderer.domElement.removeEventListener('pointermove',onPointerMove);renderer.domElement.removeEventListener('pointerleave',onPointerLeave);
      [ground.geometry,contact.geometry,fleckGeometry].forEach(g=>g.dispose());flecks.dispose();
      [wax,top,edge,coreMaterial,coreSideMaterial,ground.material,contact.material,fleckMaterial,...Object.values(pristine)].forEach(m=>m.dispose());
      [stamp.map,stamp.bumpMap,rind.bump,rind.map,contactTexture].forEach(t=>t.dispose());envTarget.dispose();
      renderer.dispose();renderer.domElement.remove();
    },
  };
}
