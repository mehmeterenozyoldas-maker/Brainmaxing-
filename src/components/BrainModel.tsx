import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCognitive } from "../context/CognitiveContext";

type LobeData = {
  color: string;
  id: string;
};

// Define the lobes of the brain with their colors and IDs
const LOBE_COLORS: Record<string, LobeData> = {
  FrontalL: { color: "#7a8a9a", id: "Frontal" },
  FrontalR: { color: "#7a8a9a", id: "Frontal" },
  ParietalL: { color: "#8a7b6b", id: "Parietal" },
  ParietalR: { color: "#8a7b6b", id: "Parietal" },
  OccipitalL: { color: "#c47a5a", id: "Occipital" },
  OccipitalR: { color: "#c47a5a", id: "Occipital" },
  TemporalL: { color: "#c9a96e", id: "Temporal" },
  TemporalR: { color: "#c9a96e", id: "Temporal" },
  Cerebellum: { color: "#9a6858", id: "Cerebellum" },
  BrainStem: { color: "#d1c4b8", id: "BrainStem" },
};

const LOBE_CENTERS: Record<string, [number, number, number]> = {
  FrontalL: [-0.3, 0.3, 0.6],
  FrontalR: [0.3, 0.3, 0.6],
  ParietalL: [-0.4, 0.6, -0.2],
  ParietalR: [0.4, 0.6, -0.2],
  OccipitalL: [-0.3, 0.2, -0.8],
  OccipitalR: [0.3, 0.2, -0.8],
  TemporalL: [-0.6, -0.2, 0],
  TemporalR: [0.6, -0.2, 0],
  Cerebellum: [0, -0.6, -0.6],
  BrainStem: [0, -0.8, -0.1],
};

const CONNECTIONS = [
  { source: 'FrontalL', target: 'ParietalL' },
  { source: 'FrontalR', target: 'ParietalR' },
  { source: 'FrontalL', target: 'TemporalL' },
  { source: 'FrontalR', target: 'TemporalR' },
  { source: 'ParietalL', target: 'OccipitalL' },
  { source: 'ParietalR', target: 'OccipitalR' },
  { source: 'TemporalL', target: 'OccipitalL' },
  { source: 'TemporalR', target: 'OccipitalR' },
  { source: 'FrontalL', target: 'FrontalR' },
  { source: 'ParietalL', target: 'ParietalR' },
];

function NeuralConnections({ dailyActivations, mode, viewState }: { dailyActivations: Record<string, number>, mode: string, viewState: string }) {
  if (viewState === "open") return null;

  return (
    <group>
      {CONNECTIONS.map((conn, i) => {
        const sourceId = LOBE_COLORS[conn.source].id;
        const targetId = LOBE_COLORS[conn.target].id;
        const sourceAct = dailyActivations[sourceId] || 0;
        const targetAct = dailyActivations[targetId] || 0;
        const strength = (sourceAct + targetAct) / 2;
        
        if (strength < 0.1 && mode !== "simulation") return null;

        const start = new THREE.Vector3(...LOBE_CENTERS[conn.source]);
        const end = new THREE.Vector3(...LOBE_CENTERS[conn.target]);
        
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.y -= 0.1;
        mid.z -= 0.1;
        
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, mode === "simulation" ? 0.005 + strength * 0.02 : 0.005, 8, false);

        return (
          <mesh key={i} geometry={tubeGeo}>
            <meshBasicMaterial 
              color={mode === "simulation" ? "#34d399" : "#3b82f6"} 
              transparent 
              opacity={mode === "simulation" ? 0.3 + strength * 0.7 : 0.2} 
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Advanced procedural generation of a highly realistic medical-grade brain model
function generateBrainGeometries() {
  const geometries: Record<string, THREE.BufferGeometry> = {};
  
  // 1. Generate Cerebrum (Left and Right Hemispheres)
  const segments = 64; // Optimized for VR and mobile rendering
  
  for (const isLeft of [true, false]) {
    const geo = new THREE.SphereGeometry(1, segments, segments);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    
    const indices = geo.getIndex()!.array;
    
    const lobeIndices: Record<string, number[]> = {
      [isLeft ? "FrontalL" : "FrontalR"]: [],
      [isLeft ? "ParietalL" : "ParietalR"]: [],
      [isLeft ? "OccipitalL" : "OccipitalR"]: [],
      [isLeft ? "TemporalL" : "TemporalR"]: [],
    };
    
    // Deform vertices
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      
      // --- Base Anatomical Shaping ---
      v.z *= 1.25; // Elongate front-to-back
      v.x *= 0.8;  // Narrow side-to-side
      v.y *= 0.9;  // Flatten top-to-bottom
      
      // Temporal lobe bulge (sides, lower middle)
      let temporal = Math.exp(-Math.pow(v.z - 0.1, 2) * 4.0 - Math.pow(v.y + 0.3, 2) * 6.0);
      v.x += (isLeft ? -1 : 1) * temporal * 0.35;
      v.y -= temporal * 0.15;
      
      // Frontal lobe taper
      if (v.z > 0) {
        v.x *= (1.0 - v.z * 0.18);
        v.y *= (1.0 - v.z * 0.12);
      }
      
      // Occipital lobe point (back)
      if (v.z < 0) {
        v.y += v.z * 0.15;
        v.x *= (1.0 + v.z * 0.15);
      }
      
      // Medial longitudinal fissure (flatten the inside face)
      let medialDist = Math.abs(v.x);
      if (isLeft && v.x > 0) v.x *= 0.02;
      if (!isLeft && v.x < 0) v.x *= 0.02;
      
      // Move apart slightly
      v.x += isLeft ? -0.02 : 0.02;
      
      // --- Advanced Gyri and Sulci (Folds) ---
      // Domain warping for organic, maze-like folds
      let warpFreq = 5.0;
      let wx = Math.sin(v.y * warpFreq) + Math.cos(v.z * warpFreq);
      let wy = Math.sin(v.z * warpFreq) + Math.cos(v.x * warpFreq);
      let wz = Math.sin(v.x * warpFreq) + Math.cos(v.y * warpFreq);
      
      let foldFreq = 18.0;
      let nx = v.x + wx * 0.15;
      let ny = v.y + wy * 0.15;
      let nz = v.z + wz * 0.15;
      
      let n1 = Math.sin(nx * foldFreq) * Math.cos(ny * foldFreq) * Math.sin(nz * foldFreq);
      
      let foldFreq2 = 32.0;
      let n2 = Math.sin(nx * foldFreq2) * Math.cos(ny * foldFreq2) * Math.sin(nz * foldFreq2);
      
      let noise = n1 * 0.65 + n2 * 0.35;
      
      // Real brains have rounded gyri (peaks) and sharp, deep sulci (valleys).
      // abs(sin) creates a sharp valley at 0 and a rounded peak at 1.
      let displacement = Math.pow(Math.abs(noise), 0.7) * 0.12;
      
      // Sylvian fissure (lateral sulcus) - deep groove
      let sylvianZ = v.z + 0.1;
      let sylvianY = v.y - 0.05 - sylvianZ * 0.4;
      let sylvian = Math.exp(-Math.pow(sylvianY, 2) * 60.0 - Math.pow(sylvianZ, 2) * 3.0);
      let lateralFactor = Math.min(1.0, Math.max(0.0, (Math.abs(v.x) - 0.2) * 5.0));
      let fissureDepth = sylvian * lateralFactor * 0.22;
      
      // Central sulcus (separates frontal and parietal)
      let centralZ = v.z - 0.2 + v.y * 0.3;
      let central = Math.exp(-Math.pow(centralZ, 2) * 80.0) * Math.max(0, v.y);
      fissureDepth += central * 0.12;
      
      // Apply displacement
      let dir = v.clone().normalize();
      
      // Less displacement on the medial surface (inside flat part) and bottom
      let medialFactor = Math.min(1.0, medialDist * 10.0);
      let bottomFactor = Math.min(1.0, Math.max(0.0, v.y + 0.8));
      
      // Micro-bumpiness for organic texture (like MRI voxels)
      let micro = (Math.sin(v.x * 150) * Math.cos(v.y * 150) * Math.sin(v.z * 150)) * 0.003;
      
      v.addScaledVector(dir, (displacement + micro) * medialFactor * bottomFactor);
      
      // Push fissures inwards
      v.addScaledVector(dir, -fissureDepth);
      
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    
    geo.computeVertexNormals();
    
    // Assign faces to lobes
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i+1];
      const c = indices[i+2];
      
      v.fromBufferAttribute(pos, a);
      const center = v.clone();
      v.fromBufferAttribute(pos, b);
      center.add(v);
      v.fromBufferAttribute(pos, c);
      center.add(v).divideScalar(3);
      
      let lobe = "";
      
      // Anatomical parcellation
      let sylvianLine = center.y - 0.05 - (center.z + 0.1) * 0.4;
      
      if (sylvianLine < 0 && center.z > -0.4 && Math.abs(center.x) > 0.2) {
        lobe = isLeft ? "TemporalL" : "TemporalR";
      } else if (center.z < -0.55) {
        lobe = isLeft ? "OccipitalL" : "OccipitalR";
      } else {
        let centralSulcusZ = 0.2 - center.y * 0.3;
        if (center.z > centralSulcusZ) {
          lobe = isLeft ? "FrontalL" : "FrontalR";
        } else {
          lobe = isLeft ? "ParietalL" : "ParietalR";
        }
      }
      
      lobeIndices[lobe].push(a, b, c);
    }
    
    for (const [lobeName, idxs] of Object.entries(lobeIndices)) {
      const lobeGeo = geo.clone();
      lobeGeo.setIndex(idxs);
      geometries[lobeName] = lobeGeo;
    }
  }
  
  // 2. Generate Cerebellum
  const cerebellumGeo = new THREE.SphereGeometry(1, 48, 48);
  const cPos = cerebellumGeo.attributes.position;
  const cv = new THREE.Vector3();
  for (let i = 0; i < cPos.count; i++) {
    cv.fromBufferAttribute(cPos, i);
    
    cv.y *= 0.35;
    cv.x *= 0.75;
    cv.z *= 0.55;
    
    // Horizontal folia (tight parallel folds)
    let foliaFreq = 40.0;
    let folia = Math.pow(1.0 - Math.abs(Math.sin(cv.y * foliaFreq + Math.sin(cv.x * 5.0))), 1.5) * 0.015;
    
    // Vermis (central bulge)
    let vermis = Math.exp(-Math.pow(cv.x, 2) * 20.0) * 0.05;
    cv.z += vermis;
    cv.y -= vermis * 0.5;
    
    cv.addScaledVector(cv.clone().normalize(), folia);
    
    cv.y -= 0.65;
    cv.z -= 0.55;
    
    cPos.setXYZ(i, cv.x, cv.y, cv.z);
  }
  cerebellumGeo.computeVertexNormals();
  geometries["Cerebellum"] = cerebellumGeo;
  
  // 3. Generate Brain Stem
  const stemGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.8, 32, 16);
  stemGeo.translate(0, -0.85, -0.15);
  const sPos = stemGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    cv.fromBufferAttribute(sPos, i);
    
    // Pons bulge
    let pons = Math.exp(-Math.pow(cv.y + 0.65, 2) * 30.0) * 0.08;
    if (cv.z > -0.15) cv.z += pons;
    
    // Medulla taper
    if (cv.y < -0.8) {
      let taper = (cv.y + 0.8) * 0.2;
      cv.x *= (1.0 + taper);
      cv.z *= (1.0 + taper);
    }
    
    // Surface details
    cv.x += Math.sin(cv.y * 30) * 0.003;
    cv.z += Math.cos(cv.y * 30) * 0.003;
    
    sPos.setXYZ(i, cv.x, cv.y, cv.z);
  }
  stemGeo.computeVertexNormals();
  geometries["BrainStem"] = stemGeo;
  
  return geometries;
}

export function BrainModel({
  activeLobe,
  mode = "twin",
  viewState = "normal",
  dailyActivations = {},
  wireframe = false,
  onLobeClick,
}: {
  activeLobe: string | null;
  mode?: "twin" | "simulation";
  viewState?: "normal" | "predicted" | "open";
  dailyActivations?: Record<string, number>;
  wireframe?: boolean;
  onLobeClick?: (lobeId: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const [hoveredLobe, setHoveredLobe] = useState<string | null>(null);
  const [gazeProgress, setGazeProgress] = useState(0);
  const { algorithmicDependency } = useCognitive();

  const handlePointerOver = (lobeId: string) => {
    if (lobeId === "BrainStem") return;
    setHoveredLobe(lobeId);
    setGazeProgress(0);
    
    if (hoverTimer.current) clearInterval(hoverTimer.current);
    
    const startTime = Date.now();
    const duration = 1500;
    
    hoverTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setGazeProgress(progress);
      
      if (progress >= 1) {
        clearInterval(hoverTimer.current!);
        if (onLobeClick) {
          onLobeClick(lobeId);
        }
        setHoveredLobe(null);
        setGazeProgress(0);
      }
    }, 50);
  };

  const handlePointerOut = () => {
    if (hoverTimer.current) clearInterval(hoverTimer.current);
    setHoveredLobe(null);
    setGazeProgress(0);
  };

  // Pre-compute geometries so we don't recalculate displacement every render
  const geometries = useMemo(() => generateBrainGeometries(), []);

  // Gentle floating/breathing animation
  useFrame((state) => {
    if (groupRef.current) {
      // Apply algorithmic dependency glitch shift
      const glitchActive = algorithmicDependency > 0.6 && Math.random() > 0.95;
      const glitchX = glitchActive ? (Math.random() - 0.5) * 0.1 : 0;
      const glitchY = glitchActive ? (Math.random() - 0.5) * 0.1 : 0;

      groupRef.current.position.x = glitchX;
      groupRef.current.position.y = (Math.sin(state.clock.elapsedTime * 1.5) * 0.05) + glitchY;
      
      if (!activeLobe) {
        // Slowly rotate if no lobe is actively being analyzed
        groupRef.current.rotation.y += mode === "simulation" ? 0.005 : 0.005;
      } else {
        // Smoothly return to center rotation when analyzing
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          0,
          0.05,
        );
      }

      // Animate emissive intensity to pulse when active
      const elapsed = state.clock.elapsedTime;
      groupRef.current.children.forEach((child) => {
        if (child.type === 'Mesh') {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const mat = mesh.material as THREE.MeshPhysicalMaterial;
            if (mat.userData && mat.userData.isActive !== undefined) {
              if (mat.userData.isActive) {
                // Rhythmic processing pulse, modulated by AI dependency
                const pulse = Math.sin(elapsed * 6) * 0.5 + 0.5; // 0 to 1
                const boost = 0.5 + (algorithmicDependency * 2.5);
                mat.emissiveIntensity = mat.userData.baseEmissiveIntensity + (pulse * boost);
              } else {
                mat.emissiveIntensity = mat.userData.baseEmissiveIntensity;
              }
            }
          }
        }
      });
    }
  });

  // Calculate synthetic base color blending once
  const syntheticColor = new THREE.Color("#06b6d4"); // Cyan for AI

  return (
    <group ref={groupRef}>
      {Object.entries(LOBE_COLORS).map(([key, data]) => {
        const lobeId = data.id;
        const isActive = activeLobe === lobeId;
        const isHovered = hoveredLobe === lobeId;
        const activationLevel = dailyActivations[lobeId] || 0;

        // In simulation mode, exaggerate the scale based on accumulated activation
        let scaleMultiplier = mode === "simulation" ? 1 + activationLevel * 0.1 : 1;
        
        // Add visual feedback for gaze
        if (isHovered) {
          scaleMultiplier += gazeProgress * 0.05;
        }
        
        const isDimmed = activeLobe !== null && !isActive;

        let opacity = 0.8;
        let emissiveIntensity = 0.1;

        if (mode === "twin") {
          // Digital Twin: Reflects current reality
          opacity = isActive ? 1.0 : isDimmed ? 0.2 : 0.6 + activationLevel * 0.4;
          emissiveIntensity = isActive ? 1.0 : activationLevel * 0.5;
        } else {
          // Simulation Mode: Predictive/Holographic representation of growth
          opacity = isActive ? 1.0 : 0.7 + activationLevel * 0.3;
          emissiveIntensity = isActive ? 1.5 : activationLevel * 1.5;
        }
        
        if (isHovered) {
          emissiveIntensity += gazeProgress * 0.5;
        }

        // Algorithmic Dependency Integration
        const baseColor = new THREE.Color(viewState === "predicted" ? "#b44b46" : data.color);
        baseColor.lerp(syntheticColor, algorithmicDependency);
        const finalColorStr = '#' + baseColor.getHexString();
        
        const isSyntheticWireframe = wireframe || (algorithmicDependency > 0.75) || (mode === "simulation" && !isActive && activationLevel < 0.2);
        const finalTransmission = mode === "simulation" ? 0.6 : (0.3 + (algorithmicDependency * 0.5));
        
        // Handle open/exploded view
        const targetPos = new THREE.Vector3(0, 0, 0);
        if (viewState === "open") {
          if (key.endsWith("L")) targetPos.x -= 0.4;
          if (key.endsWith("R")) targetPos.x += 0.4;
          if (key === "Cerebellum") targetPos.y -= 0.3;
          if (key === "BrainStem") targetPos.y -= 0.5;
        }

        return (
          <mesh
            key={key}
            geometry={geometries[key]}
            position={targetPos}
            scale={[scaleMultiplier, scaleMultiplier, scaleMultiplier]}
            onClick={(e) => {
              e.stopPropagation();
              if (onLobeClick && lobeId !== "BrainStem") {
                onLobeClick(lobeId);
              }
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              handlePointerOver(lobeId);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              handlePointerOut();
            }}
          >
            <meshStandardMaterial
              color={finalColorStr}
              transparent
              opacity={mode === "simulation" ? 0.3 : (opacity * 0.8)}
              roughness={mode === "simulation" ? 0.2 : 0.4}
              metalness={mode === "simulation" || algorithmicDependency > 0.5 ? 0.8 : 0.05}
              emissive={finalColorStr}
              emissiveIntensity={emissiveIntensity + (algorithmicDependency * 0.3)}
              wireframe={isSyntheticWireframe}
              side={THREE.DoubleSide}
              userData={{
                baseEmissiveIntensity: emissiveIntensity + (algorithmicDependency * 0.3),
                isActive: isActive
              }}
            />
          </mesh>
        );
      })}
      <NeuralConnections dailyActivations={dailyActivations} mode={mode} viewState={viewState} />
    </group>
  );
}
