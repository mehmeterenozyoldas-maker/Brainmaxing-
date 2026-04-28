import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

// --- Scene Setup ---
const container = document.getElementById('brain3d-root');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf5f0eb, 0.05);

// Background shader
const bgGeometry = new THREE.PlaneGeometry(2, 2);
const bgMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    color1: { value: new THREE.Color('#f5f0eb') },
    color2: { value: new THREE.Color('#e8dfd5') }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;
    
    // Hash function for noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      // Radial gradient
      vec2 center = vec2(0.5, 0.6);
      float dist = distance(vUv, center);
      float vignette = smoothstep(0.8, 0.2, dist);
      
      vec3 bg = mix(color2, color1, vignette);
      
      // Film grain
      float noise = (hash(vUv + time) - 0.5) * 0.03;
      
      gl_FragColor = vec4(bg + noise, 1.0);
    }
  `,
  depthWrite: false,
  depthTest: false
});
const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
bgMesh.renderOrder = -1;
const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
bgScene.add(bgMesh);

// Main Camera
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1, 6);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

// AR Button
const arButton = ARButton.createButton(renderer, { 
  requiredFeatures: ['hit-test'],
  optionalFeatures: ['dom-overlay'],
  domOverlay: { root: document.querySelector('#brain3d-panel .ui-overlay') }
});
arButton.style.position = 'absolute';
arButton.style.bottom = '20px';
arButton.style.left = '20px';
arButton.style.zIndex = '1000';
arButton.style.background = 'rgba(0, 0, 0, 0.5)';
arButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
arButton.style.color = '#fff';
arButton.style.padding = '10px 20px';
arButton.style.borderRadius = '8px';
arButton.style.cursor = 'pointer';
arButton.id = 'ar-button';
document.body.appendChild(arButton);

// Reticle for AR placement
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

let hitTestSource = null;
let hitTestSourceRequested = false;

// XR Controllers for selection
for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  controller.addEventListener('select', onSelectXR);
  scene.add(controller);

  // Controller visual
  const controllerGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const controllerMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const controllerLine = new THREE.Line(controllerGeo, controllerMat);
  controllerLine.scale.z = 5;
  controller.add(controllerLine);
}

let baseScale = 1.0;

function onSelectXR(event) {
  const controller = event.target;
  if (reticle.visible) {
    // Place brain at reticle
    brainGroup.position.setFromMatrixPosition(reticle.matrix);
    baseScale = 0.2; // Scale down for AR
    reticle.visible = false;
  } else {
    // Try to select brain parts
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      selectMesh(intersects[0].object);
    } else {
      selectMesh(null);
    }
  }
}

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.minDistance = 3;
controls.maxDistance = 10;
controls.target.set(0, 0.5, 0);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xf0e8e0, 0.5);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xf5ede5, 0xc0b0a0, 0.4);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff5ee, 2.2);
keyLight.position.set(3, 5, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -3;
keyLight.shadow.camera.right = 3;
keyLight.shadow.camera.top = 3;
keyLight.shadow.camera.bottom = -3;
keyLight.shadow.bias = -0.001;
keyLight.shadow.normalBias = 0.02;
keyLight.shadow.radius = 3;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xe0d5c8, 0.6);
fillLight.position.set(-4, 2, -2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xd4a89a, 1.0);
rimLight.position.set(-2, 3, -5);
scene.add(rimLight);

const bounceLight = new THREE.PointLight(0xc0b0a0, 0.8, 10);
bounceLight.position.set(0, -3, 1);
scene.add(bounceLight);

const sssLight = new THREE.PointLight(0xff9080, 0.4, 5);
scene.add(sssLight);

const accentLight = new THREE.PointLight(0xc9a96e, 0.5, 8);
scene.add(accentLight);

// --- Environment Map ---
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const envScene = new THREE.Scene();
const envKey = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0xf5ede5 }));
envKey.position.set(5, 8, 5);
envKey.lookAt(0,0,0);
envScene.add(envKey);

const envFillWarm = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0xd4b8a0 }));
envFillWarm.position.set(-5, 2, 2);
envFillWarm.lookAt(0,0,0);
envScene.add(envFillWarm);

const envFillCool = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: 0xc0c8d0 }));
envFillCool.position.set(5, 2, -5);
envFillCool.lookAt(0,0,0);
envScene.add(envFillCool);

const envSpec = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff8ee }));
envSpec.position.set(0, 5, 2);
envScene.add(envSpec);

const envGround = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ color: 0xd8d0c8 }));
envGround.position.set(0, -5, 0);
envGround.rotation.x = -Math.PI / 2;
envScene.add(envGround);

const envMap = pmremGenerator.fromScene(envScene, 0.02).texture;
scene.environment = envMap;

// --- Procedural Textures ---
function createNoiseTexture(size, base, range, freq) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    
    // Fractal noise for more organic texture
    let noise = 0;
    let amp = 1;
    let f = freq;
    for(let o = 0; o < 4; o++) {
      // Add some phase shift based on coordinates to break up grid patterns
      let phaseX = Math.sin(y * f * 0.5);
      let phaseY = Math.cos(x * f * 0.5);
      noise += Math.sin((x * f) + phaseX) * Math.cos((y * f) + phaseY) * amp;
      amp *= 0.5;
      f *= 2.1;
    }
    
    // Normalize noise roughly to -1..1 then map
    noise = noise * 0.5;
    
    const val = Math.floor((base + noise * range) * 255);
    const clamped = Math.max(0, Math.min(255, val));
    
    data[i * 4] = clamped;
    data[i * 4 + 1] = clamped;
    data[i * 4 + 2] = clamped;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const roughnessMap = createNoiseTexture(1024, 0.45, 0.25, 0.03);
const aoMap = createNoiseTexture(512, 0.8, 0.2, 0.015);

// --- Materials ---
function createMaterial(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness || 0.35,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
    sheen: 1.0,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(opts.sheenColor || 0xffffff),
    roughnessMap: roughnessMap,
    aoMap: aoMap,
    aoMapIntensity: 0.8,
    envMap: envMap,
    envMapIntensity: 1.0,
    transmission: opts.transmission || 0.25,
    thickness: 2.5,
    ior: 1.38,
    attenuationColor: new THREE.Color(opts.attenuationColor || '#cc4444'),
    attenuationDistance: 3.0,
    transparent: true,
    opacity: 1.0,
    depthWrite: true,
  });
}

const matFrontal = createMaterial('#b44b46', { sheenColor: '#ff8888' });
const matParietal = createMaterial('#7a8a9a', { sheenColor: '#aaccff', roughness: 0.5 });
const matTemporal = createMaterial('#c9a96e', { sheenColor: '#ffeeaa', roughness: 0.4 });
const matOccipital = createMaterial('#8a7b6b', { sheenColor: '#ccbbaa', roughness: 0.4 });
const matCerebellum = createMaterial('#c47a5a', { sheenColor: '#ffaa88', roughness: 0.5 });
const matBrainstem = createMaterial('#9a6858', { sheenColor: '#cc9988', roughness: 0.6 });

const materials = [matFrontal, matParietal, matTemporal, matOccipital, matCerebellum, matBrainstem];
materials.forEach(mat => {
  mat.userData.origOpacity = mat.opacity;
  mat.userData.origDepthWrite = mat.depthWrite;
  mat.userData.origTransmission = mat.transmission;
  mat.userData.origClearcoat = mat.clearcoat;
  mat.userData.origRoughness = mat.roughness;
  
  // Feature 2: Real-time Fluid Shader Dynamics
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uHoverState = { value: 0 };
    mat.userData.shader = shader;
    
    shader.vertexShader = `
      uniform float uTime;
      uniform float uHoverState;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
      
      // Fluid ripple effect
      float ripple = sin(position.y * 15.0 + uTime * 4.0) * cos(position.x * 15.0 + uTime * 3.0);
      float breathe = sin(uTime * 2.0) * 0.015;
      
      // Apply only when hovered/selected
      transformed += normal * (ripple * 0.02 + breathe) * uHoverState;
      `
    );
  };
});

// --- Geometry ---
const brainGroup = new THREE.Group();
brainGroup.position.y = 0.5;
scene.add(brainGroup);

const meshes = [];

// Helper to create deformed brain lobes
function createLobe(radius, x, y, z, sx, sy, sz, mat, name, desc) {
  const geo = new THREE.SphereGeometry(radius, 128, 128);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    // Deform
    v.x *= sx;
    v.y *= sy;
    v.z *= sz;
    
    // Advanced Gyri/Sulci displacement
    let f = 7.0; // Base frequency
    // Layer 1: Main folds
    let n1 = Math.sin(v.x*f + Math.cos(v.y*f)) * Math.cos(v.y*f + Math.sin(v.z*f)) * Math.sin(v.z*f + Math.cos(v.x*f));
    // Layer 2: Secondary details
    f *= 2.1;
    let n2 = Math.sin(v.x*f + Math.cos(v.y*f)) * Math.cos(v.y*f + Math.sin(v.z*f)) * Math.sin(v.z*f + Math.cos(v.x*f));
    
    let noise = n1 * 0.75 + n2 * 0.25;
    // Math.pow(1.0 - Math.abs(noise), 1.5) creates rounded ridges (gyri) and sharp, deep valleys (sulci)
    let displacement = Math.pow(1.0 - Math.abs(noise), 1.5) * 0.06;
    
    // Add some micro-bumpiness
    let micro = (Math.sin(v.x * 40) * Math.cos(v.y * 40) * Math.sin(v.z * 40)) * 0.002;
    
    v.addScaledVector(v.clone().normalize(), displacement + micro);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { name, desc, origPos: mesh.position.clone() };
  brainGroup.add(mesh);
  meshes.push(mesh);
  return mesh;
}

// Frontal Lobe
const frontal = createLobe(0.8, 0, 0.4, 0.6, 0.9, 0.9, 1.1, matFrontal, "Frontal Lobe", "Responsible for higher-level cognitive functions, voluntary movement, and expressive language.");
frontal.userData.explodeDir = new THREE.Vector3(0, 0.5, 1).normalize();

// Parietal Lobe
const parietal = createLobe(0.7, 0, 0.8, -0.2, 0.9, 0.8, 0.9, matParietal, "Parietal Lobe", "Processes sensory information including touch, temperature, and pain from the body.");
parietal.userData.explodeDir = new THREE.Vector3(0, 1, -0.5).normalize();

// Temporal Lobe
const temporal = createLobe(0.6, 0, 0.1, 0, 1.2, 0.7, 1.0, matTemporal, "Temporal Lobe", "Crucial for processing auditory information and encoding memory.");
temporal.userData.explodeDir = new THREE.Vector3(1, -0.2, 0).normalize();

// Occipital Lobe
const occipital = createLobe(0.6, 0, 0.3, -0.8, 0.8, 0.8, 0.8, matOccipital, "Occipital Lobe", "The visual processing center of the mammalian brain.");
occipital.userData.explodeDir = new THREE.Vector3(0, 0, -1).normalize();

// Cerebellum
const cerebellum = createLobe(0.5, 0, -0.4, -0.6, 1.1, 0.6, 0.8, matCerebellum, "Cerebellum", "Coordinates voluntary movements such as posture, balance, coordination, and speech.");
cerebellum.userData.explodeDir = new THREE.Vector3(0, -1, -0.5).normalize();

// Brainstem
const stemGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.8, 64, 32);
const stemPos = stemGeo.attributes.position;
for (let i = 0; i < stemPos.count; i++) {
  const v = new THREE.Vector3().fromBufferAttribute(stemPos, i);
  // Vertical striations for brainstem
  const striations = Math.sin(Math.atan2(v.x, v.z) * 15) * 0.005;
  const noise = (Math.sin(v.x * 25) * Math.cos(v.y * 25) * Math.sin(v.z * 25)) * 0.003;
  v.addScaledVector(new THREE.Vector3(v.x, 0, v.z).normalize(), striations + noise);
  stemPos.setXYZ(i, v.x, v.y, v.z);
}
stemGeo.computeVertexNormals();
const brainstem = new THREE.Mesh(stemGeo, matBrainstem);
brainstem.position.set(0, -0.5, -0.2);
brainstem.rotation.x = Math.PI * 0.1;
brainstem.castShadow = true;
brainstem.receiveShadow = true;
brainstem.userData = { name: "Brainstem", desc: "Controls the flow of messages between the brain and the rest of the body.", origPos: brainstem.position.clone() };
brainstem.userData.explodeDir = new THREE.Vector3(0, -1, 0).normalize();
brainGroup.add(brainstem);
meshes.push(brainstem);

// --- Lobe Connections ---
const lobeConnectionsGroup = new THREE.Group();
brainGroup.add(lobeConnectionsGroup);

const lobeConnectionData = [];

for (let i = 0; i < meshes.length; i++) {
  for (let j = i + 1; j < meshes.length; j++) {
    const material = new THREE.LineBasicMaterial({
      color: 0xaa55ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Geometry will be updated in animate loop
    const geometry = new THREE.BufferGeometry();
    const line = new THREE.Line(geometry, material);
    lobeConnectionsGroup.add(line);
    
    lobeConnectionData.push({
      line: line,
      lobe1: meshes[i],
      lobe2: meshes[j]
    });
  }
}

// Shadow Ground
const groundGeo = new THREE.PlaneGeometry(10, 10);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.08 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
ground.receiveShadow = true;
scene.add(ground);

// --- Neuron Texture Generator ---
function createNeuronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const cx = 64;
  const cy = 64;
  
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.2;
    const length = 20 + Math.random() * 30;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const cp1x = cx + Math.cos(angle - 0.2) * length * 0.5;
    const cp1y = cy + Math.sin(angle - 0.2) * length * 0.5;
    const endx = cx + Math.cos(angle) * length;
    const endy = cy + Math.sin(angle) * length;
    ctx.quadraticCurveTo(cp1x, cp1y, endx, endy);
    ctx.stroke();
    if (Math.random() > 0.5) {
      const branchAngle = angle + (Math.random() > 0.5 ? 0.5 : -0.5);
      const branchLen = length * 0.5;
      const bx = endx + Math.cos(branchAngle) * branchLen;
      const by = endy + Math.sin(branchAngle) * branchLen;
      ctx.beginPath();
      ctx.moveTo(endx, endy);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }
  return new THREE.CanvasTexture(canvas);
}
const neuronTexture = createNeuronTexture();

// Ambient Particles
const particlesGeo = new THREE.BufferGeometry();
const particleCount = 150;
const pPos = new Float32Array(particleCount * 3);
const pPhase = new Float32Array(particleCount);
for(let i=0; i<particleCount; i++) {
  pPos[i*3] = (Math.random() - 0.5) * 8;
  pPos[i*3+1] = (Math.random() - 0.5) * 8;
  pPos[i*3+2] = (Math.random() - 0.5) * 8;
  pPhase[i] = Math.random() * Math.PI * 2;
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
particlesGeo.setAttribute('phase', new THREE.BufferAttribute(pPhase, 1));

const particlesMat = new THREE.PointsMaterial({
  color: 0xc9a96e,
  size: 0.15,
  map: neuronTexture,
  transparent: true,
  opacity: 0.3,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

// --- Neural Network ---
const neuronsGroup = new THREE.Group();
brainGroup.add(neuronsGroup);
neuronsGroup.visible = false;

const neuronCount = 2000; // Increased count
const neuronPositions = [];
const neuronPhases = [];
const neuronLobeIndices = []; // Track lobe for clustering

// Sample points from each lobe mesh
const tempNeurons = [];
meshes.forEach((mesh, lobeIdx) => {
  if (mesh.geometry) {
    const sampler = new MeshSurfaceSampler(mesh).build();
    for (let i = 0; i < neuronCount / meshes.length; i++) {
      const pos = new THREE.Vector3();
      sampler.sample(pos);
      // Offset inwards slightly to fill volume
      pos.add(pos.clone().normalize().multiplyScalar(-0.03));
      // Transform to brainGroup space
      pos.add(mesh.position);
      
      tempNeurons.push({ pos, phase: Math.random() * Math.PI * 2, lobeIdx });
    }
  }
});

// Shuffle neurons to ensure uniform culling
for (let i = tempNeurons.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [tempNeurons[i], tempNeurons[j]] = [tempNeurons[j], tempNeurons[i]];
}

tempNeurons.forEach(n => {
  neuronPositions.push(n.pos.x, n.pos.y, n.pos.z);
  neuronPhases.push(n.phase);
  neuronLobeIndices.push(n.lobeIdx);
});

const neuronGeo = new THREE.BufferGeometry();
neuronGeo.setAttribute('position', new THREE.Float32BufferAttribute(neuronPositions, 3));
neuronGeo.setAttribute('phase', new THREE.Float32BufferAttribute(neuronPhases, 1));

const neuronMat = new THREE.PointsMaterial({
  color: 0x00ffff,
  size: 0.08,
  map: neuronTexture,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const neurons = new THREE.Points(neuronGeo, neuronMat);
neuronsGroup.add(neurons);

// Connections (Lines)
const connections = [];
const connectionLobes = []; // Track lobes for synapse trails
const tempConnections = [];
for (let i = 0; i < neuronCount; i++) {
  const p1 = new THREE.Vector3(neuronPositions[i*3], neuronPositions[i*3+1], neuronPositions[i*3+2]);
  for (let j = i + 1; j < neuronCount; j++) {
    const p2 = new THREE.Vector3(neuronPositions[j*3], neuronPositions[j*3+1], neuronPositions[j*3+2]);
    
    // Organic connection logic: closer neurons, higher chance in same lobe
    const dist = p1.distanceTo(p2);
    if (dist < 0.18) {
      const sameLobe = neuronLobeIndices[i] === neuronLobeIndices[j];
      const prob = sameLobe ? 0.08 : 0.01; // Lower probability for sparse, organic look
      if (Math.random() < prob) {
        tempConnections.push({
          p1x: p1.x, p1y: p1.y, p1z: p1.z,
          p2x: p2.x, p2y: p2.y, p2z: p2.z,
          l1: neuronLobeIndices[i], l2: neuronLobeIndices[j]
        });
      }
    }
  }
}

// Shuffle connections
for (let i = tempConnections.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [tempConnections[i], tempConnections[j]] = [tempConnections[j], tempConnections[i]];
}

tempConnections.forEach(c => {
  connections.push(c.p1x, c.p1y, c.p1z, c.p2x, c.p2y, c.p2z);
  connectionLobes.push(c.l1, c.l2);
});

const linesGeo = new THREE.BufferGeometry();
linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(connections, 3));
const linesMat = new THREE.LineBasicMaterial({
  color: 0x00aaff,
  transparent: true,
  opacity: 0.08, // Thinner, more subtle lines
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const lines = new THREE.LineSegments(linesGeo, linesMat);
neuronsGroup.add(lines);

// Signals (moving dots along lines)
const signalCount = 200;
const signalPositions = new Float32Array(signalCount * 3);
const signalProgress = new Float32Array(signalCount);
const signalLines = [];

for (let i = 0; i < signalCount; i++) {
  const lineIdx = Math.floor(Math.random() * (connections.length / 6)) * 6;
  signalLines.push(lineIdx);
  signalProgress[i] = Math.random();
}

const signalsGeo = new THREE.BufferGeometry();
signalsGeo.setAttribute('position', new THREE.BufferAttribute(signalPositions, 3));
const signalsMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.1,
  map: neuronTexture,
  transparent: true,
  opacity: 1.0,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const signals = new THREE.Points(signalsGeo, signalsMat);
neuronsGroup.add(signals);

// --- AI Shadow Network ---
const aiShadowGroup = new THREE.Group();
brainGroup.add(aiShadowGroup);
aiShadowGroup.visible = false;

const aiNeuronMat = new THREE.PointsMaterial({
  color: 0x00aaff, // Blue
  size: 0.1,
  map: neuronTexture,
  transparent: true,
  opacity: 0.4,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const aiNeurons = new THREE.Points(neuronGeo, aiNeuronMat);
aiShadowGroup.add(aiNeurons);

// AI Connections (Lines)
const aiConnections = [];
const aiConnectionLobes = [];
const tempAiConnections = [];
for (let i = 0; i < neuronCount; i++) {
  const p1 = new THREE.Vector3(neuronPositions[i*3], neuronPositions[i*3+1], neuronPositions[i*3+2]);
  for (let j = i + 1; j < neuronCount; j++) {
    const p2 = new THREE.Vector3(neuronPositions[j*3], neuronPositions[j*3+1], neuronPositions[j*3+2]);
    
    const dist = p1.distanceTo(p2);
    if (dist < 0.2) {
      const sameLobe = neuronLobeIndices[i] === neuronLobeIndices[j];
      const prob = sameLobe ? 0.12 : 0.02; // Denser than human connections
      if (Math.random() < prob) {
        tempAiConnections.push({
          p1x: p1.x, p1y: p1.y, p1z: p1.z,
          p2x: p2.x, p2y: p2.y, p2z: p2.z,
          l1: neuronLobeIndices[i], l2: neuronLobeIndices[j]
        });
      }
    }
  }
}

// Shuffle AI connections
for (let i = tempAiConnections.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [tempAiConnections[i], tempAiConnections[j]] = [tempAiConnections[j], tempAiConnections[i]];
}

tempAiConnections.forEach(c => {
  aiConnections.push(c.p1x, c.p1y, c.p1z, c.p2x, c.p2y, c.p2z);
  aiConnectionLobes.push(c.l1, c.l2);
});

const aiLinesGeo = new THREE.BufferGeometry();
aiLinesGeo.setAttribute('position', new THREE.Float32BufferAttribute(aiConnections, 3));
const aiLinesMat = new THREE.LineBasicMaterial({
  color: 0x0055ff,
  transparent: true,
  opacity: 0.05,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const aiLines = new THREE.LineSegments(aiLinesGeo, aiLinesMat);
aiShadowGroup.add(aiLines);

// AI Signals
const aiSignalCount = 300;
const aiSignalPositions = new Float32Array(aiSignalCount * 3);
const aiSignalProgress = new Float32Array(aiSignalCount);
const aiSignalLines = [];

for (let i = 0; i < aiSignalCount; i++) {
  const lineIdx = Math.floor(Math.random() * (aiConnections.length / 6)) * 6;
  aiSignalLines.push(lineIdx);
  aiSignalProgress[i] = Math.random();
}

const aiSignalsGeo = new THREE.BufferGeometry();
aiSignalsGeo.setAttribute('position', new THREE.BufferAttribute(aiSignalPositions, 3));
const aiSignalsMat = new THREE.PointsMaterial({
  color: 0xaaaaff,
  size: 0.12,
  map: neuronTexture,
  transparent: true,
  opacity: 1.0,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const aiSignals = new THREE.Points(aiSignalsGeo, aiSignalsMat);
aiShadowGroup.add(aiSignals);

// --- Activity Map ---
const activityGroup = new THREE.Group();
neuronsGroup.add(activityGroup);

const activityNodes = [];
const activityColors = [0xff4444, 0xffaa00, 0xffff00]; // Red, Orange, Yellow

for (let i = 0; i < 12; i++) {
  const clusterGroup = new THREE.Group();
  
  const clusterGeo = new THREE.BufferGeometry();
  const clusterCount = 30;
  const clusterPos = new Float32Array(clusterCount * 3);
  for(let j=0; j<clusterCount; j++) {
    const r = Math.random() * 0.15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    clusterPos[j*3] = r * Math.sin(phi) * Math.cos(theta);
    clusterPos[j*3+1] = r * Math.sin(phi) * Math.sin(theta);
    clusterPos[j*3+2] = r * Math.cos(phi);
  }
  clusterGeo.setAttribute('position', new THREE.BufferAttribute(clusterPos, 3));
  
  const mat = new THREE.PointsMaterial({
    color: activityColors[Math.floor(Math.random() * activityColors.length)],
    size: 0.1,
    map: neuronTexture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const points = new THREE.Points(clusterGeo, mat);
  clusterGroup.add(points);
  
  // Add some connecting lines within the cluster
  const clusterLinesGeo = new THREE.BufferGeometry();
  const clusterLinesPos = [];
  for(let j=0; j<clusterCount; j++) {
    for(let k=j+1; k<clusterCount; k++) {
      if(Math.random() < 0.08) {
        clusterLinesPos.push(clusterPos[j*3], clusterPos[j*3+1], clusterPos[j*3+2]);
        clusterLinesPos.push(clusterPos[k*3], clusterPos[k*3+1], clusterPos[k*3+2]);
      }
    }
  }
  clusterLinesGeo.setAttribute('position', new THREE.Float32BufferAttribute(clusterLinesPos, 3));
  const clusterLinesMat = new THREE.LineBasicMaterial({
    color: mat.color,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const clusterLines = new THREE.LineSegments(clusterLinesGeo, clusterLinesMat);
  clusterGroup.add(clusterLines);
  
  // Position randomly inside brain volume
  clusterGroup.position.set(
    (Math.random() - 0.5) * 1.2,
    (Math.random() - 0.5) * 1.0 + 0.3,
    (Math.random() - 0.5) * 1.2
  );
  
  activityGroup.add(clusterGroup);
  activityNodes.push(clusterGroup);
}

// --- Hotspots ---
const hotspots = [
  { name: 'Frontal Lobe', mesh: frontal, offset: new THREE.Vector3(0, 0.4, 0.8), color: '#b44b46' },
  { name: 'Parietal Lobe', mesh: parietal, offset: new THREE.Vector3(0, 0.7, 0), color: '#7a8a9a' },
  { name: 'Temporal Lobe', mesh: temporal, offset: new THREE.Vector3(0.6, 0, 0), color: '#c9a96e' },
  { name: 'Occipital Lobe', mesh: occipital, offset: new THREE.Vector3(0, 0, -0.6), color: '#8a7b6b' },
  { name: 'Cerebellum', mesh: cerebellum, offset: new THREE.Vector3(0, -0.2, -0.5), color: '#c47a5a' }
];

const hotspotElements = [];
const overlay = document.querySelector('#brain3d-panel .ui-overlay');

hotspots.forEach(hs => {
  const el = document.createElement('div');
  el.className = 'hotspot';
  el.innerHTML = `
    <div class="hotspot-dot" style="background-color: ${hs.color};"></div>
    <div class="hotspot-label">${hs.name}</div>
  `;
  overlay.appendChild(el);
  
  // Click event for hotspot
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectMesh(hs.mesh);
  });
  
  hotspotElements.push({ data: hs, el: el });
});

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedMesh = null;

const titleEl = document.getElementById('brain-title');
const descEl = document.getElementById('brain-desc');
const infoPanel = document.getElementById('brain-info');

function selectMesh(mesh) {
  if (selectedMesh === mesh) {
    // Deselect
    selectedMesh = null;
    meshes.forEach(m => {
      m.material.emissive.setHex(0x000000);
      m.material.opacity = xrayMode ? 0.25 : (m.material && m.material.userData ? m.material.userData.origOpacity : 1.0);
    });
    infoPanel.classList.remove('visible');
  } else {
    // Select
    selectedMesh = mesh;
    meshes.forEach(m => {
      if (m === mesh) {
        m.material.emissive.setHex(0x1a1410);
        m.material.emissiveIntensity = 0.25;
        m.material.opacity = 1.0;
      } else {
        m.material.emissive.setHex(0x000000);
        m.material.opacity = 0.15;
      }
    });
    titleEl.innerText = mesh.userData.name;
    descEl.innerText = mesh.userData.desc;
    infoPanel.classList.add('visible');
  }
}

container.addEventListener('click', (e) => {
  const rect = container.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(meshes);
  
  if (intersects.length > 0) {
    selectMesh(intersects[0].object);
  } else {
    selectMesh(null);
  }
});

// UI Buttons
let xrayMode = false;
document.getElementById('btn-xray-brain').addEventListener('click', (e) => {
  xrayMode = !xrayMode;
  e.target.classList.toggle('active');
  
  materials.forEach(mat => {
    if (xrayMode) {
      mat.opacity = 0.25;
      mat.depthWrite = false;
      mat.transmission = 0.3;
      mat.clearcoat = 0.9;
      mat.roughness = 0.2;
    } else {
      mat.opacity = mat.userData.origOpacity;
      mat.depthWrite = mat.userData.origDepthWrite;
      mat.transmission = mat.userData.origTransmission;
      mat.clearcoat = mat.userData.origClearcoat;
      mat.roughness = mat.userData.origRoughness;
    }
  });
  if (selectedMesh) selectMesh(null);
});

let explodeMode = false;
let explodeLerp = 0;
document.getElementById('btn-explode').addEventListener('click', (e) => {
  explodeMode = !explodeMode;
  e.target.classList.toggle('active');
});

let neuronsMode = false;
let aiShadowMode = false;

// Global Cognitive State listener
let currentHumanLevel = 75;
let currentAiLevel = 25;
let globalActiveLobe = null;
let globalDailyActivations = {};

window.addEventListener('lobeActivityUpdate', (e) => {
  if (e.detail) {
    globalActiveLobe = e.detail.activeLobe;
    globalDailyActivations = e.detail.dailyActivations || {};
  }
});

window.addEventListener('cognitiveStateChanged', (e) => {
  if (e.detail) {
    currentHumanLevel = e.detail.human;
    currentAiLevel = e.detail.ai;
  }
});

// Add listener for DMI indexing flashes
window.addEventListener('dmiIndexed', (e) => {
  if (e.detail && e.detail.lobe) {
    const lobeName = e.detail.lobe;
    
    // Find the corresponding mesh
    let targetMesh = null;
    if (lobeName === 'Frontal') targetMesh = frontal;
    else if (lobeName === 'Temporal') targetMesh = temporal;
    else if (lobeName === 'Parietal') targetMesh = parietal;
    else if (lobeName === 'Occipital') targetMesh = occipital;
    
    if (targetMesh && targetMesh.material) {
      // Create a flash effect
      const originalColor = targetMesh.material.color.clone();
      const originalEmissive = targetMesh.material.emissive.clone();
      const originalEmissiveIntensity = targetMesh.material.emissiveIntensity;
      
      // Flash purple
      targetMesh.material.color.setHex(0xa855f7); // purple-500
      targetMesh.material.emissive.setHex(0xa855f7);
      targetMesh.material.emissiveIntensity = 1.5;
      
      // Animate back to original
      let progress = 0;
      const animateFlash = () => {
        progress += 0.02; // Speed of fade
        if (progress >= 1) {
          targetMesh.material.color.copy(originalColor);
          targetMesh.material.emissive.copy(originalEmissive);
          targetMesh.material.emissiveIntensity = originalEmissiveIntensity;
          return;
        }
        
        targetMesh.material.color.lerpColors(new THREE.Color(0xa855f7), originalColor, progress);
        targetMesh.material.emissive.lerpColors(new THREE.Color(0xa855f7), originalEmissive, progress);
        targetMesh.material.emissiveIntensity = THREE.MathUtils.lerp(1.5, originalEmissiveIntensity, progress);
        
        requestAnimationFrame(animateFlash);
      };
      
      animateFlash();
    }
  }
});

document.getElementById('btn-neurons').addEventListener('click', (e) => {
  neuronsMode = !neuronsMode;
  e.target.classList.toggle('active');
  neuronsGroup.visible = neuronsMode;
  
  if (neuronsMode && !xrayMode) {
    document.getElementById('btn-xray-brain').click();
  }
});

document.getElementById('btn-ai-shadow').addEventListener('click', (e) => {
  aiShadowMode = !aiShadowMode;
  e.target.classList.toggle('active');
  aiShadowGroup.visible = aiShadowMode;
  
  if (aiShadowMode && !xrayMode) {
    document.getElementById('btn-xray-brain').click();
  }
});

document.getElementById('btn-reset-brain').addEventListener('click', () => {
  controls.reset();
  selectMesh(null);
  if (xrayMode) document.getElementById('btn-xray-brain').click();
  if (explodeMode) document.getElementById('btn-explode').click();
  if (neuronsMode) document.getElementById('btn-neurons').click();
  if (aiShadowMode) document.getElementById('btn-ai-shadow').click();
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  controls.update();
  
  // Adjust brightness for AR mode
  const arBrightnessFactor = renderer.xr.isPresenting ? 0.35 : 1.0;
  
  // Update opacities based on levels and AR mode
  neuronMat.opacity = 0.6 * (currentHumanLevel / 100) * arBrightnessFactor;
  linesMat.opacity = 0.08 * (currentHumanLevel / 100) * arBrightnessFactor;
  signalsMat.opacity = 1.0 * (currentHumanLevel / 100) * arBrightnessFactor;
  
  aiNeuronMat.opacity = 0.4 * (currentAiLevel / 100) * arBrightnessFactor;
  aiLinesMat.opacity = 0.05 * (currentAiLevel / 100) * arBrightnessFactor;
  aiSignalsMat.opacity = 1.0 * (currentAiLevel / 100) * arBrightnessFactor;
  
  // Background shader
  bgMaterial.uniforms.time.value = elapsed;
  
  // Pulsation animation
  const pulse = baseScale + Math.sin(elapsed * Math.PI * 1.2) * 0.003 * baseScale; // ~72 BPM
  brainGroup.scale.set(pulse, pulse, pulse);
  
  // Lighting animation
  sssLight.position.copy(camera.position);
  accentLight.position.set(Math.sin(elapsed * 0.5) * 5, 3, Math.cos(elapsed * 0.5) * 5);
  
  // Explode animation
  if (explodeMode && explodeLerp < 1) {
    explodeLerp += delta * 2;
    if (explodeLerp > 1) explodeLerp = 1;
  } else if (!explodeMode && explodeLerp > 0) {
    explodeLerp -= delta * 2;
    if (explodeLerp < 0) explodeLerp = 0;
  }
  
  if (explodeLerp > 0 || explodeLerp < 1) {
    meshes.forEach(mesh => {
      const orig = mesh && mesh.userData ? mesh.userData.origPos : new THREE.Vector3();
      const dir = mesh && mesh.userData ? mesh.userData.explodeDir : new THREE.Vector3(0,0,0);
      const target = orig.clone().add(dir.clone().multiplyScalar(0.6));
      mesh.position.lerpVectors(orig, target, explodeLerp);
    });
  }
  
  // Ambient particles
  const pPos = particlesGeo.attributes.position.array;
  const pPhase = particlesGeo.attributes.phase.array;
  for(let i=0; i<particleCount; i++) {
    pPos[i*3+1] += Math.sin(elapsed + pPhase[i]) * 0.002;
  }
  particlesGeo.attributes.position.needsUpdate = true;

  // Update neuron positions based on exploded lobes
  const nPos = neurons.geometry.attributes.position.array;
  const aiNPos = aiNeurons.geometry.attributes.position.array;
  for (let i = 0; i < neuronCount; i++) {
    const lobeIdx = neuronLobeIndices[i];
    const mesh = meshes[lobeIdx];
    const offset = mesh.position.clone().sub(mesh.userData.origPos);
    
    nPos[i*3] = neuronPositions[i*3] + offset.x;
    nPos[i*3+1] = neuronPositions[i*3+1] + offset.y;
    nPos[i*3+2] = neuronPositions[i*3+2] + offset.z;
    
    aiNPos[i*3] = neuronPositions[i*3] + offset.x;
    aiNPos[i*3+1] = neuronPositions[i*3+1] + offset.y;
    aiNPos[i*3+2] = neuronPositions[i*3+2] + offset.z;
  }
  neurons.geometry.attributes.position.needsUpdate = true;
  aiNeurons.geometry.attributes.position.needsUpdate = true;

  // Update connections
  const lPos = lines.geometry.attributes.position.array;
  for (let i = 0; i < connections.length / 6; i++) {
    const l1 = connectionLobes[i*2];
    const l2 = connectionLobes[i*2+1];
    const off1 = meshes[l1].position.clone().sub(meshes[l1].userData.origPos);
    const off2 = meshes[l2].position.clone().sub(meshes[l2].userData.origPos);
    
    lPos[i*6] = connections[i*6] + off1.x;
    lPos[i*6+1] = connections[i*6+1] + off1.y;
    lPos[i*6+2] = connections[i*6+2] + off1.z;
    lPos[i*6+3] = connections[i*6+3] + off2.x;
    lPos[i*6+4] = connections[i*6+4] + off2.y;
    lPos[i*6+5] = connections[i*6+5] + off2.z;
  }
  lines.geometry.attributes.position.needsUpdate = true;

  // Update AI connections
  const aiLPos = aiLines.geometry.attributes.position.array;
  for (let i = 0; i < aiConnections.length / 6; i++) {
    const l1 = aiConnectionLobes[i*2];
    const l2 = aiConnectionLobes[i*2+1];
    const off1 = meshes[l1].position.clone().sub(meshes[l1].userData.origPos);
    const off2 = meshes[l2].position.clone().sub(meshes[l2].userData.origPos);
    
    aiLPos[i*6] = aiConnections[i*6] + off1.x;
    aiLPos[i*6+1] = aiConnections[i*6+1] + off1.y;
    aiLPos[i*6+2] = aiConnections[i*6+2] + off1.z;
    aiLPos[i*6+3] = aiConnections[i*6+3] + off2.x;
    aiLPos[i*6+4] = aiConnections[i*6+4] + off2.y;
    aiLPos[i*6+5] = aiConnections[i*6+5] + off2.z;
  }
  aiLines.geometry.attributes.position.needsUpdate = true;
  
  // Neural Activity
  if (neuronsMode && connections.length > 0) {
    // Feature 3: Procedural Neuron Growth
    const maxNeurons = neuronPositions.length / 3;
    const activeNeurons = Math.floor(maxNeurons * (currentHumanLevel / 100));
    neurons.geometry.setDrawRange(0, activeNeurons);
    
    const maxLines = connections.length / 3;
    const activeLines = Math.floor((connections.length / 6) * (currentHumanLevel / 100)) * 2;
    lines.geometry.setDrawRange(0, activeLines);

    const activeSignalCount = Math.floor(signalCount * (currentHumanLevel / 100));
    signals.geometry.setDrawRange(0, activeSignalCount);

    const positions = signalsGeo.attributes.position.array;
    let humanSpeedMultiplier = 0.5 + (currentHumanLevel / 100) * 1.5; // Speed scales with human level
    if (selectedMesh) humanSpeedMultiplier *= 2.5; // Boost speed when a lobe is selected
    
    for (let i = 0; i < activeSignalCount; i++) {
      signalProgress[i] += delta * humanSpeedMultiplier; // speed
      if (signalProgress[i] >= 1.0) {
        signalProgress[i] = 0;
        
        // Feature 1: Synapse Trails - route signals through selected lobe
        let nextLineIdx = Math.floor(Math.random() * Math.max(1, activeLines / 2));
        if (selectedMesh && activeLines > 0) {
           const selectedLobeIdx = meshes.indexOf(selectedMesh);
           for(let attempt=0; attempt<15; attempt++) {
              const testIdx = Math.floor(Math.random() * (activeLines / 2));
              if (connectionLobes[testIdx*2] === selectedLobeIdx || connectionLobes[testIdx*2+1] === selectedLobeIdx) {
                 nextLineIdx = testIdx;
                 break;
              }
           }
        }
        signalLines[i] = nextLineIdx * 6;
      }
      
      const idx = signalLines[i];
      const p1x = lPos[idx];
      const p1y = lPos[idx+1];
      const p1z = lPos[idx+2];
      const p2x = lPos[idx+3];
      const p2y = lPos[idx+4];
      const p2z = lPos[idx+5];
      
      const prog = signalProgress[i];
      positions[i*3] = p1x + (p2x - p1x) * prog;
      positions[i*3+1] = p1y + (p2y - p1y) * prog;
      positions[i*3+2] = p1z + (p2z - p1z) * prog;
    }
    signalsGeo.attributes.position.needsUpdate = true;
    
    // Pulse signal size when selected
    if (selectedMesh) {
      signalsMat.size = 0.15 + Math.sin(elapsed * 15) * 0.08; // More pronounced pulse
      signalsMat.color.setHex(0xffffaa);
    } else {
      signalsMat.size = 0.1;
      signalsMat.color.setHex(0xffffff);
    }
  }

  // AI Shadow Activity
  if (aiShadowMode && aiConnections.length > 0) {
    const maxAiNeurons = neuronPositions.length / 3;
    const activeAiNeurons = Math.floor(maxAiNeurons * (currentAiLevel / 100));
    aiNeurons.geometry.setDrawRange(0, activeAiNeurons);
    
    const maxAiLines = aiConnections.length / 3;
    const activeAiLines = Math.floor((aiConnections.length / 6) * (currentAiLevel / 100)) * 2;
    aiLines.geometry.setDrawRange(0, activeAiLines);

    const activeAiSignalCount = Math.floor(aiSignalCount * (currentAiLevel / 100));
    aiSignals.geometry.setDrawRange(0, activeAiSignalCount);

    const aiPositions = aiSignalsGeo.attributes.position.array;
    let aiSpeedMultiplier = 1.0 + (currentAiLevel / 100) * 2.0; // Speed scales with AI level
    if (selectedMesh) aiSpeedMultiplier *= 3.0; // Boost AI speed when a lobe is selected
    
    for (let i = 0; i < activeAiSignalCount; i++) {
      aiSignalProgress[i] += delta * aiSpeedMultiplier; // AI signals speed
      if (aiSignalProgress[i] >= 1.0) {
        aiSignalProgress[i] = 0;
        aiSignalLines[i] = Math.floor(Math.random() * Math.max(1, activeAiLines / 2)) * 6;
      }
      
      const idx = aiSignalLines[i];
      const p1x = aiLPos[idx];
      const p1y = aiLPos[idx+1];
      const p1z = aiLPos[idx+2];
      const p2x = aiLPos[idx+3];
      const p2y = aiLPos[idx+4];
      const p2z = aiLPos[idx+5];
      
      const prog = aiSignalProgress[i];
      aiPositions[i*3] = p1x + (p2x - p1x) * prog;
      aiPositions[i*3+1] = p1y + (p2y - p1y) * prog;
      aiPositions[i*3+2] = p1z + (p2z - p1z) * prog;
    }
    aiSignalsGeo.attributes.position.needsUpdate = true;
    
    // Pulse AI signal size when selected
    if (selectedMesh) {
      aiSignalsMat.size = 0.12 + Math.sin(elapsed * 15) * 0.06;
      aiSignalsMat.color.setHex(0xaaaaff);
    } else {
      aiSignalsMat.size = 0.12;
      aiSignalsMat.color.setHex(0xaaaaff);
    }
  }
  
  // Pulsating activity nodes
  activityNodes.forEach((node, i) => {
    const scale = 1.0 + Math.sin(elapsed * 4 + i) * 0.3;
    node.scale.set(scale, scale, scale);
    const opacity = (0.3 + Math.sin(elapsed * 4 + i) * 0.2) * arBrightnessFactor;
    node.children.forEach(child => {
      if (child.material) {
        child.material.opacity = opacity;
      }
    });
  });
  
  // Lobe pulse effect based on selection or activity
  meshes.forEach(mesh => {
    if (!mesh || !mesh.userData) return;
    const lobeName = mesh.userData.name.split(' ')[0]; // e.g., "Frontal Lobe" -> "Frontal"
    const isSelected = mesh === selectedMesh || lobeName === globalActiveLobe;
    const activationLevel = globalDailyActivations[lobeName] || 0;
    
    // Feature 2: Update Fluid Shader Dynamics
    if (mesh.material && mesh.material.userData && mesh.material.userData.shader) {
      mesh.material.userData.shader.uniforms.uTime.value = elapsed;
      const targetHover = isSelected ? 1.0 : 0.0;
      mesh.material.userData.shader.uniforms.uHoverState.value += (targetHover - mesh.material.userData.shader.uniforms.uHoverState.value) * 0.1;
    }
    
    if (isSelected) {
      // Distinct purple pulse for selected/active lobe
      const pulse = 0.5 + Math.sin(elapsed * 5) * 0.3;
      mesh.material.emissive.setHex(0xa855f7); // Purple flash
      mesh.material.emissiveIntensity = pulse * 1.5;
      mesh.material.opacity = 1.0;
    } else if (selectedMesh || globalActiveLobe) {
      // If something is selected, dim others
      mesh.material.emissive.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
      mesh.material.opacity = 0.15;
    } else if (activationLevel > 0) {
      // Glow based on daily activation level
      const pulse = Math.sin(elapsed * 1.5) * 0.15 * activationLevel;
      mesh.material.emissive.setHex(0x1a1410);
      mesh.material.emissiveIntensity = (0.1 + pulse) * activationLevel;
      mesh.material.opacity = xrayMode ? 0.25 : (mesh.material.userData.origOpacity ?? 1.0);
    } else {
      // Default state
      mesh.material.emissive.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
      mesh.material.opacity = xrayMode ? 0.25 : (mesh.material.userData.origOpacity ?? 1.0);
    }
  });
  
  // Update Lobe Connections
  lobeConnectionData.forEach(data => {
    const p1 = data.lobe1.position;
    const p2 = data.lobe2.position;
    
    const distance = p1.distanceTo(p2);
    const mid = p1.clone().lerp(p2, 0.5);
    mid.y += distance * 0.3;
    
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const points = curve.getPoints(20);
    data.line.geometry.setFromPoints(points);
    
    // Adjust opacity and intensity based on human/ai levels
    const baseOpacity = 0.1 + (currentHumanLevel / 100) * 0.3;
    
    // Check if either connected lobe is active/selected
    const l1Name = data.lobe1?.userData?.name?.split(' ')[0] || '';
    const l2Name = data.lobe2?.userData?.name?.split(' ')[0] || '';
    const isActive = (data.lobe1 === selectedMesh || l1Name === globalActiveLobe) || 
                     (data.lobe2 === selectedMesh || l2Name === globalActiveLobe);
                     
    if (isActive) {
      data.line.material.opacity = baseOpacity + 0.4 + Math.sin(elapsed * 8) * 0.2;
      data.line.material.color.setHex(0xffffff); // Bright pulse
    } else {
      data.line.material.opacity = baseOpacity * (selectedMesh || globalActiveLobe ? 0.2 : 1.0);
      
      // Color shifts based on AI vs Human
      const r = 170 * (currentHumanLevel / 100);
      const g = 85 + 85 * (currentAiLevel / 100);
      const b = 255 * (currentAiLevel / 100) + 100 * (currentHumanLevel / 100);
      data.line.material.color.setRGB(r/255, g/255, b/255);
    }
  });
  
  // Hotspots
  hotspotElements.forEach(item => {
    // Get world position
    const pos = item.data.offset.clone();
    item.data.mesh.localToWorld(pos);
    
    // Project to screen
    pos.project(camera);
    
    if (pos.z > 1) {
      item.el.style.display = 'none';
    } else {
      item.el.style.display = 'flex';
      const x = (pos.x * .5 + .5) * container.clientWidth;
      const y = (pos.y * -.5 + .5) * container.clientHeight;
      item.el.style.left = `${x}px`;
      item.el.style.top = `${y}px`;
    }
  });
  
  // Render
  renderer.clear();
  if (!renderer.xr.isPresenting) {
    renderer.render(bgScene, bgCamera);
    renderer.clearDepth();
  } else {
    // AR Hit Testing
    if (hitTestSourceRequested === false) {
      renderer.xr.getSession().requestReferenceSpace('viewer').then((referenceSpace) => {
        renderer.xr.getSession().requestHitTestSource({ space: referenceSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      renderer.xr.getSession().addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
        brainGroup.position.set(0, 0.5, 0); // Reset position
        baseScale = 1.0; // Reset scale
      });
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const hitTestResults = renderer.xr.getFrame().getHitTestResults(hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle Resize
window.addEventListener('resize', () => {
  if (container.clientWidth === 0) return; // Hidden tab
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// --- Touch Gestures for AR Manipulation ---
let initialPinchDistance = null;
let initialScale = 1.0;
let initialRotation = 0;
let initialTouchAngle = null;
let isDragging = false;
let previousTouchPos = { x: 0, y: 0 };

overlay.addEventListener('touchstart', (e) => {
  if (!renderer.xr.isPresenting || reticle.visible) return; // Only manipulate if placed
  
  if (e.touches.length === 1) {
    isDragging = true;
    previousTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    isDragging = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
    initialScale = baseScale;
    initialTouchAngle = Math.atan2(dy, dx);
    initialRotation = brainGroup.rotation.y;
  }
}, { passive: false });

overlay.addEventListener('touchmove', (e) => {
  if (!renderer.xr.isPresenting || reticle.visible) return;
  
  if (e.touches.length === 1 && isDragging) {
    // Drag to rotate
    const dx = e.touches[0].clientX - previousTouchPos.x;
    const dy = e.touches[0].clientY - previousTouchPos.y;
    
    brainGroup.rotation.y += dx * 0.01;
    brainGroup.rotation.x += dy * 0.01;
    
    previousTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2 && initialPinchDistance !== null) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    
    // Pinch to scale
    const distance = Math.sqrt(dx * dx + dy * dy);
    const scaleFactor = distance / initialPinchDistance;
    baseScale = Math.max(0.05, Math.min(2.0, initialScale * scaleFactor));
    
    // Twist to rotate
    const angle = Math.atan2(dy, dx);
    const angleDiff = angle - initialTouchAngle;
    brainGroup.rotation.y = initialRotation + angleDiff;
  }
}, { passive: false });

overlay.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) {
    initialPinchDistance = null;
    initialTouchAngle = null;
  }
  if (e.touches.length === 0) {
    isDragging = false;
  }
});
