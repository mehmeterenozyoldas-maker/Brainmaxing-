import { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import { XR, createXRStore, useXRHitTest, useXR } from "@react-three/xr";
import { Route } from "lucide-react";

import { useCognitive } from "../context/CognitiveContext";

const noise3D = createNoise3D();

const store = createXRStore();

function Pipe({
  start,
  end,
  delay,
  routingStyle,
  burnoutRisk,
  isSelected,
  onSelect,
}: {
  start: [number, number, number];
  end: [number, number, number];
  delay: number;
  routingStyle: string;
  burnoutRisk: number;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const headSphereRef = useRef<THREE.Mesh>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef<number | null>(null);
  const progressRef = useRef(0);
  const packetsRef = useRef<number[]>([]);

  const curve = useMemo(() => {
    const points = [];
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    points.push(startVec);

    const distance = startVec.distanceTo(endVec);
    const numSegments = Math.max(8, Math.floor(distance * 3));

    let wanderStrength = 1.5;
    let targetAttraction = 0.8;
    let upwardBias = 0.5;

    if (routingStyle === "direct") {
      wanderStrength = 0.2;
      targetAttraction = 2.0;
      upwardBias = 0.1;
    } else if (routingStyle === "energy-saving") {
      wanderStrength = 0.5;
      targetAttraction = 1.2;
      upwardBias = -0.2;
    } else if (routingStyle === "organic") {
      wanderStrength = 2.0;
      targetAttraction = 0.6;
      upwardBias = 0.8;
    }

    const burnoutFactor = Math.max(0, Math.min(1, burnoutRisk / 100));

    if (routingStyle === "organic") {
      wanderStrength *= (1 + burnoutFactor * 2);
    } else if (routingStyle === "direct") {
      targetAttraction *= (1 + burnoutFactor * 0.5);
      wanderStrength *= (1 - burnoutFactor * 0.5);
    } else if (routingStyle === "energy-saving") {
      targetAttraction *= (1 + burnoutFactor * 0.5);
    }

    for (let i = 1; i < numSegments; i++) {
      const progress = i / numSegments;
      const idealPos = new THREE.Vector3().lerpVectors(startVec, endVec, progress);

      const noiseValX = noise3D(idealPos.x, idealPos.y, idealPos.z + i * 0.1);
      const noiseValZ = noise3D(idealPos.z, idealPos.y, idealPos.x + i * 0.1);

      const wanderX = noiseValX * wanderStrength;
      const wanderZ = noiseValZ * wanderStrength;

      const archHeight = Math.sin(progress * Math.PI) * (distance * 0.3) + upwardBias;

      const nextPoint = new THREE.Vector3(
        idealPos.x + wanderX * (1 - progress),
        Math.max(startVec.y, endVec.y) + archHeight + (Math.random() * 0.2 - 0.1),
        idealPos.z + wanderZ * (1 - progress)
      );

      points.push(nextPoint);
    }

    points.push(endVec);
    return new THREE.CatmullRomCurve3(points, false, "chordal", 0.7);
  }, [start, end, routingStyle, burnoutRisk]);

  const fullGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.15, 6, false); // Optimized geometry segments down from 64/8 to 32/6
  }, [curve]);

  const dummyObject = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current;

    // Phase 1: Draw the line dynamically without triggering React state re-renders
    if (elapsed > delay && progressRef.current < 1) {
      progressRef.current = Math.min(1, (elapsed - delay) * 0.5);

      const totalCount = fullGeometry.index ? fullGeometry.index.count : fullGeometry.attributes.position.count;
      const drawCount = Math.floor(totalCount * progressRef.current);
      if (!isNaN(drawCount) && drawCount >= 0) {
        fullGeometry.setDrawRange(0, drawCount);
      }

      if (headSphereRef.current) {
        if (progressRef.current > 0.01 && progressRef.current < 0.99) {
          headSphereRef.current.visible = true;
          curve.getPointAt(progressRef.current, headSphereRef.current.position);
        } else {
          headSphereRef.current.visible = false;
        }
      }

      if (materialRef.current) {
        materialRef.current.opacity = progressRef.current > 0.05 ? 1 : 0;
      }
    }

    if (materialRef.current) {
      if (isSelected) {
        const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 6) * 0.4;
        materialRef.current.emissiveIntensity = pulse;
      } else {
        materialRef.current.emissiveIntensity = hovered ? 0.5 : 0.2;
      }
    }

    // Phase 2: Flowing Packets Logic (100% bypassed React Re-render logic)
    if (progressRef.current >= 1) {
      if (Math.random() < 0.03) {
        packetsRef.current.push(0);
      }
      
      // Update packet positions
      for (let i = packetsRef.current.length - 1; i >= 0; i--) {
        packetsRef.current[i] += 0.005;
        if (packetsRef.current[i] > 1) {
          packetsRef.current.splice(i, 1);
        }
      }

      // Sync positions to GPU immediately via InstancedMesh
      if (instancedMeshRef.current) {
        instancedMeshRef.current.count = packetsRef.current.length;
        packetsRef.current.forEach((pos, idx) => {
          curve.getPointAt(pos, dummyObject.position);
          dummyObject.updateMatrix();
          instancedMeshRef.current!.setMatrixAt(idx, dummyObject.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <mesh position={start}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} />
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </mesh>

      <mesh position={end}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        <mesh>
          <boxGeometry args={[0.55, 0.55, 0.55]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </mesh>

      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <primitive object={fullGeometry} attach="geometry" />
        <meshStandardMaterial
          ref={materialRef}
          color={isSelected ? "#fcd34d" : (hovered ? "#34d399" : "#10b981")}
          roughness={0.2}
          metalness={0.8}
          emissive={isSelected ? "#f59e0b" : (hovered ? "#34d399" : "#10b981")}
          emissiveIntensity={isSelected ? 1.0 : (hovered ? 0.5 : 0.2)}
          transparent
          opacity={0} // Initially hidden, handled by useFrame
        />
      </mesh>

      {/* Dynamic Head Sphere running independently of React Render */}
      <mesh ref={headSphereRef} visible={false}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshBasicMaterial color="#a7f3d0" />
      </mesh>

      {/* GPU Instanced Mesh for floating packets instead of mapped react array */}
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, 30]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={isSelected ? "#ffffff" : "#a7f3d0"} />
      </instancedMesh>

      {isSelected && (
        <Text
          position={curve.getPointAt(0.5).add(new THREE.Vector3(0, 0.5, 0))}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontSize={0.3}
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {`Routing: ${routingStyle}\nRisk: ${burnoutRisk.toFixed(1)}%`}
        </Text>
      )}
    </group>
  );
}

function Obstacles() {
  const obstacles = useMemo(() => {
    return Array.from({ length: 5 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 8,
        Math.random() * 4,
        (Math.random() - 0.5) * 8,
      ] as [number, number, number],
      scale: [
        Math.random() * 2 + 1,
        Math.random() * 3 + 1,
        Math.random() * 2 + 1,
      ] as [number, number, number],
    }));
  }, []);

  return (
    <group>
      {obstacles.map((obs, i) => (
        <mesh key={i} position={obs.position} scale={obs.scale}>
          <boxGeometry />
          <meshStandardMaterial color="#27272a" transparent opacity={0.5} wireframe />
        </mesh>
      ))}
    </group>
  );
}

function BreathingOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const t = state.clock.elapsedTime;
    const breathe = (Math.sin((t * Math.PI) / 4) + 1) / 2;

    const scale = 1 + breathe * 0.5;
    meshRef.current.scale.set(scale, scale, scale);

    const color1 = new THREE.Color("#1e3a8a");
    const color2 = new THREE.Color("#06b6d4");
    materialRef.current.color.lerpColors(color1, color2, breathe);
    materialRef.current.emissive.lerpColors(color1, color2, breathe);
    materialRef.current.emissiveIntensity = 0.2 + breathe * 0.5;
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, 2, 0]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial ref={materialRef} roughness={0.2} metalness={0.8} transparent opacity={0.8} />
      </mesh>
      {Array.from({ length: 20 }).map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}
    </group>
  );
}

function FloatingParticle({ index }: { index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);
  const radius = useMemo(() => 3 + Math.random() * 2, []);
  const speed = useMemo(() => 0.2 + Math.random() * 0.3, []);
  const heightOffset = useMemo(() => (Math.random() - 0.5) * 4, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * speed + offset;
    meshRef.current.position.x = Math.cos(t) * radius;
    meshRef.current.position.z = Math.sin(t) * radius;
    meshRef.current.position.y = 2 + heightOffset + Math.sin(t * 2) * 0.5;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
    </mesh>
  );
}

function XRControlPanel({ 
  onMoveAnchor, 
  onGenerateRoute,
  onReset
}: { 
  onMoveAnchor: () => void;
  onGenerateRoute: () => void;
  onReset: () => void;
}) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  // Ergonomic Spatial Curvature
  const curveAngle = Math.PI / 16; 

  return (
    <group position={[0, 1.2, -1.5]} rotation={[-Math.PI / 12, 0, 0]}>
      {/* Backplate for Spatial UI Grouping - Opaque for Performance */}
      <RoundedBox args={[2.2, 0.6, 0.02]} radius={0.08} position={[0, 0, -0.05]}>
        <meshStandardMaterial 
          color="#121212" 
          roughness={0.8}
          metalness={0.2}
        />
      </RoundedBox>

      {/* Move Anchor Button - Angled Left */}
      <group position={[-0.7, 0, 0]} rotation={[0, curveAngle, 0]}>
        <mesh 
          onClick={(e) => { e.stopPropagation(); onMoveAnchor(); }}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredBtn('move'); }}
          onPointerOut={(e) => { e.stopPropagation(); setHoveredBtn(null); }}
        >
          {/* Expanded Invisible Hitbox for Raycasting Ergonomics */}
          <boxGeometry args={[0.75, 0.4, 0.1]} />
          <meshBasicMaterial visible={false} />
          
          <RoundedBox args={[0.6, 0.3, 0.04]} radius={0.15}>
            <meshStandardMaterial 
              color={hoveredBtn === 'move' ? "#a855f7" : "#1e1e1e"} 
              emissive={hoveredBtn === 'move' ? "#a855f7" : "#000000"}
              emissiveIntensity={hoveredBtn === 'move' ? 0.4 : 0}
              roughness={0.6}
            />
          </RoundedBox>
          <Text position={[0, 0, 0.025]} fontSize={0.07} color="white" anchorX="center" anchorY="middle">
            Move Anchor
          </Text>
        </mesh>
      </group>

      {/* Generate Route Button - Center */}
      <group position={[0, 0, 0]}>
        <mesh 
          onClick={(e) => { e.stopPropagation(); onGenerateRoute(); }}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredBtn('generate'); }}
          onPointerOut={(e) => { e.stopPropagation(); setHoveredBtn(null); }}
        >
          {/* Expanded Invisible Hitbox */}
          <boxGeometry args={[0.75, 0.4, 0.1]} />
          <meshBasicMaterial visible={false} />

          <RoundedBox args={[0.6, 0.3, 0.04]} radius={0.15}>
            <meshStandardMaterial 
              color={hoveredBtn === 'generate' ? "#10b981" : "#1e1e1e"} 
              emissive={hoveredBtn === 'generate' ? "#10b981" : "#000000"}
              emissiveIntensity={hoveredBtn === 'generate' ? 0.4 : 0}
              roughness={0.6}
            />
          </RoundedBox>
          <Text position={[0, 0, 0.025]} fontSize={0.07} color="white" anchorX="center" anchorY="middle">
            New Route
          </Text>
        </mesh>
      </group>

      {/* Reset System Button - Angled Right */}
      <group position={[0.7, 0, 0]} rotation={[0, -curveAngle, 0]}>
        <mesh 
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredBtn('reset'); }}
          onPointerOut={(e) => { e.stopPropagation(); setHoveredBtn(null); }}
        >
          {/* Expanded Invisible Hitbox */}
          <boxGeometry args={[0.75, 0.4, 0.1]} />
          <meshBasicMaterial visible={false} />

          <RoundedBox args={[0.6, 0.3, 0.04]} radius={0.15}>
            <meshStandardMaterial 
              color={hoveredBtn === 'reset' ? "#ef4444" : "#1e1e1e"} 
              emissive={hoveredBtn === 'reset' ? "#ef4444" : "#000000"}
              emissiveIntensity={hoveredBtn === 'reset' ? 0.4 : 0}
              roughness={0.6}
            />
          </RoundedBox>
          <Text position={[0, 0, 0.025]} fontSize={0.07} color="white" anchorX="center" anchorY="middle">
            Reset Scene
          </Text>
        </mesh>
      </group>
    </group>
  );
}

function ARSceneContent({
  mode,
  points,
  settings,
  burnoutRisk,
  selectedPath,
  onSelectPath,
  placedPosition,
  setPlacedPosition,
  placementMode,
  setPlacementMode,
  tempStartNode,
  setTempStartNode,
  onAddRoute,
  onGenerateRoute,
  onResetAR,
}: {
  mode: "router" | "recovery";
  points: { start: [number, number, number]; end: [number, number, number] }[];
  settings: any;
  burnoutRisk: number;
  selectedPath: number | null;
  onSelectPath: (index: number) => void;
  placedPosition: THREE.Vector3 | null;
  setPlacedPosition: (pos: THREE.Vector3 | null) => void;
  placementMode: 'scene' | 'route_start' | 'route_end';
  setPlacementMode: (mode: 'scene' | 'route_start' | 'route_end') => void;
  tempStartNode: THREE.Vector3 | null;
  setTempStartNode: (pos: THREE.Vector3 | null) => void;
  onAddRoute: (start: THREE.Vector3, end: THREE.Vector3) => void;
  onGenerateRoute: () => void;
  onResetAR: () => void;
}) {
  const [isPlacing, setIsPlacing] = useState(false);
  const reticleRef = useRef<THREE.Mesh>(null);
  const matrixHelper = useMemo(() => new THREE.Matrix4(), []);
  const session = useXR((state) => state.session);

  useXRHitTest((results, getWorldMatrix) => {
    if ((placedPosition && placementMode === 'scene') || isPlacing) {
      if (reticleRef.current && placementMode === 'scene') reticleRef.current.visible = false;
      return;
    }
    if (!reticleRef.current) return;
    if (results.length > 0) {
      reticleRef.current.visible = true;
      getWorldMatrix(matrixHelper, results[0]);
      reticleRef.current.position.setFromMatrixPosition(matrixHelper);
    } else {
      reticleRef.current.visible = false;
    }
  }, 'viewer');

  const isAR = !!session;
  const renderScale = isAR ? 0.2 : 1;

  const handlePlace = () => {
    if (reticleRef.current && reticleRef.current.visible && !isPlacing) {
      setIsPlacing(true);
      const pos = reticleRef.current.position.clone();
      setTimeout(() => {
        if (placementMode === 'scene') {
          setPlacedPosition(pos);
        } else if (placementMode === 'route_start') {
          // Convert world pos to local pos relative to placedPosition
          const localPos = placedPosition ? pos.clone().sub(placedPosition).divideScalar(renderScale) : pos.clone();
          setTempStartNode(localPos);
          setPlacementMode('route_end');
        } else if (placementMode === 'route_end' && tempStartNode) {
          const localPos = placedPosition ? pos.clone().sub(placedPosition).divideScalar(renderScale) : pos.clone();
          onAddRoute(tempStartNode, localPos);
          setTempStartNode(null);
          setPlacementMode('scene');
        }
        setIsPlacing(false);
      }, 400);
    }
  };

  useFrame((state) => {
    if (isPlacing && reticleRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 30) * 0.4;
      reticleRef.current.scale.set(scale, scale, scale);
      (reticleRef.current.material as THREE.MeshBasicMaterial).color.setHex(0x6ee7b7);
    } else if (reticleRef.current) {
      reticleRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
      let color = 0x10b981; // Green for scene
      if (placementMode === 'route_start') color = 0x3b82f6; // Blue for start
      if (placementMode === 'route_end') color = 0xef4444; // Red for end
      (reticleRef.current.material as THREE.MeshBasicMaterial).color.setHex(color);
    }
  });

  const showReticle = isAR && (!placedPosition || placementMode !== 'scene');
  const renderPosition = isAR ? (placedPosition || new THREE.Vector3(0, -1000, 0)) : new THREE.Vector3(0, 0, 0);

  return (
    <group>
      {showReticle && (
        <group>
          <mesh ref={reticleRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.1, 0.15, 32]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          <mesh onPointerDown={handlePlace}>
            <sphereGeometry args={[100, 16, 16]} />
            <meshBasicMaterial visible={false} side={THREE.BackSide} />
          </mesh>
        </group>
      )}

      {(!isAR || placedPosition) && (
        <group position={renderPosition} scale={[renderScale, renderScale, renderScale]}>
          {mode === "router" ? (
            <>
              <Obstacles />
              {points.map((p, i) => (
                <Pipe
                  key={i}
                  start={p.start}
                  end={p.end}
                  delay={i * 1.5}
                  routingStyle={settings.arRoutingStyle}
                  burnoutRisk={burnoutRisk}
                  isSelected={selectedPath === i}
                  onSelect={() => onSelectPath(i)}
                />
              ))}
              {tempStartNode && (
                <mesh position={tempStartNode}>
                  <sphereGeometry args={[0.3, 16, 16]} />
                  <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} />
                  <mesh>
                    <sphereGeometry args={[0.4, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
                  </mesh>
                </mesh>
              )}
              {isAR && (
                <XRControlPanel 
                  onMoveAnchor={() => {
                    setPlacedPosition(null);
                    setPlacementMode('scene');
                  }}
                  onGenerateRoute={onGenerateRoute}
                  onReset={onResetAR}
                />
              )}
            </>
          ) : (
            <BreathingOrb />
          )}
        </group>
      )}
    </group>
  );
}

export function ARView({
  isActive,
  mode = "router",
  points: initialPoints,
}: {
  isActive: boolean;
  mode?: "router" | "recovery";
  points: { start: [number, number, number]; end: [number, number, number] }[];
}) {
  const { settings, burnoutRisk } = useCognitive();
  const [points, setPoints] = useState(initialPoints);
  const [selectedPath, setSelectedPath] = useState<number | null>(null);
  const [placedPosition, setPlacedPosition] = useState<THREE.Vector3 | null>(null);
  const [placementMode, setPlacementMode] = useState<'scene' | 'route_start' | 'route_end'>('scene');
  const [tempStartNode, setTempStartNode] = useState<THREE.Vector3 | null>(null);

  const [session, setSession] = useState(() => store.getState().session);
  const [domOverlayRoot, setDomOverlayRoot] = useState(() => store.getState().domOverlayRoot);
  const [showReflectivePrompt, setShowReflectivePrompt] = useState(false);
  const [reflectiveAnswer, setReflectiveAnswer] = useState("");
  const [wasInAR, setWasInAR] = useState(false);

  useEffect(() => {
    return store.subscribe((state) => {
      setSession(state.session);
      setDomOverlayRoot(state.domOverlayRoot);
    });
  }, []);

  useEffect(() => {
    if (session) {
      setWasInAR(true);
    } else if (!session && wasInAR) {
      setShowReflectivePrompt(true);
      setWasInAR(false);
    }
  }, [session, wasInAR]);

  useEffect(() => {
    if (selectedPath !== null) {
      const timer = setTimeout(() => setSelectedPath(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [selectedPath]);

  useEffect(() => {
    if (initialPoints && initialPoints.length > 0) {
      setPoints(initialPoints);
    }
  }, [initialPoints]);

  const generateRoute = () => {
    let numRoutes = 3;
    let heightVariation = 2;
    let spread = 10;

    if (settings.arRoutingStyle === "direct") {
      numRoutes = 1;
      heightVariation = 0.5;
      spread = 5;
    } else if (settings.arRoutingStyle === "energy-saving") {
      numRoutes = 2;
      heightVariation = 0.2; // Keep it flat
      spread = 8;
    } else if (settings.arRoutingStyle === "organic") {
      numRoutes = 4;
      heightVariation = 4;
      spread = 12;
    }

    // Burnout risk influences complexity
    const riskFactor = burnoutRisk / 100;
    if (riskFactor > 0.7) {
      // More complex routing when burnout is high
      numRoutes = Math.min(6, numRoutes + 2); 
      heightVariation += 2;
    } else if (riskFactor < 0.3) {
      // simpler routing when calm
      numRoutes = Math.max(1, numRoutes - 1);
      heightVariation *= 0.5;
    }

    const newPoints = Array.from({ length: numRoutes }).map(() => ({
      start: [
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * heightVariation,
        (Math.random() - 0.5) * spread,
      ] as [number, number, number],
      end: [
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * heightVariation,
        (Math.random() - 0.5) * spread,
      ] as [number, number, number],
    }));
    
    setPoints(newPoints);
    setSelectedPath(null);
  };

  const onAddRoute = (start: THREE.Vector3, end: THREE.Vector3) => {
    setPoints(prev => [...prev, {
      start: [start.x, start.y, start.z],
      end: [end.x, end.y, end.z]
    }]);
  };

  const resetAR = () => {
    setPoints([]);
    setPlacedPosition(null);
    setSelectedPath(null);
    setPlacementMode('scene');
    setTempStartNode(null);
  };

  const saveRoute = () => {
    if (points.length > 0) {
      localStorage.setItem("ar_persisted_route", JSON.stringify(points));
      alert("AR Route saved successfully. It will persist across sessions.");
    } else {
      alert("No route to save. Generate a route first.");
    }
  };

  const loadRoute = () => {
    const saved = localStorage.getItem("ar_persisted_route");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPoints(parsed);
        setSelectedPath(null);
        alert("AR Route loaded successfully.");
      } catch (e) {
        console.error("Failed to parse saved route", e);
      }
    } else {
      alert("No saved route found.");
    }
  };

  if (!isActive) return null;

  const overlayUI = (
    <div className="absolute inset-0 pointer-events-none">
      {mode === "router" ? (
        <>
          <div className="absolute top-6 right-6 flex flex-col gap-2 pointer-events-auto">
            {!session ? (
              <button
                onClick={() => store.enterAR()}
                className="bg-blue-600 hover:bg-blue-500 text-zinc-100 px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                Enter AR
              </button>
            ) : (
              <button
                onClick={() => session.end()}
                className="bg-red-600 hover:bg-red-500 text-zinc-100 px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
              >
                Exit AR
              </button>
            )}
          </div>

          {/* Interactive Controls Panel */}
          {session && (
            <div className="absolute left-6 top-6 bg-[#121214] border-2 border-white/20 p-6 rounded-[32px] pointer-events-auto flex flex-col gap-4 w-72 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <h3 className="text-white/90 font-medium text-lg mb-2 border-b-2 border-white/10 pb-3 font-sans tracking-tight">AR Utilities</h3>
              
              <button
                onClick={generateRoute}
                className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-emerald-400 min-h-[48px] px-6 py-3 rounded-full text-sm font-semibold transition-colors border-2 border-emerald-500/50 flex items-center justify-center gap-2"
              >
                Generate New Route
              </button>

              <button
                onClick={() => {
                  setPlacedPosition(null);
                  setPlacementMode('scene');
                }}
                className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-purple-400 min-h-[48px] px-6 py-3 rounded-full text-sm font-semibold transition-colors border-2 border-purple-500/50 flex items-center justify-center gap-2"
              >
                Move Anchor Point
              </button>

              <button
                onClick={resetAR}
                className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-red-400 min-h-[48px] px-6 py-3 rounded-full text-sm font-semibold transition-colors border-2 border-red-500/50 flex items-center justify-center gap-2"
              >
                Reset AR View
              </button>

              {placedPosition && (
                <button
                  onClick={() => setPlacementMode('route_start')}
                  className={`w-full min-h-[48px] px-6 py-3 rounded-full text-sm font-semibold transition-colors border-2 mt-2 flex items-center justify-center gap-2 ${placementMode !== 'scene' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#1c1c1e] border-white/20 text-white hover:bg-[#2c2c2e]'}`}
                >
                  {placementMode === 'scene' ? 'Place Custom Route' : (placementMode === 'route_start' ? 'Tap to Place Start' : 'Tap to Place End')}
                </button>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveRoute}
                  className="flex-1 bg-[#1a1a1f] hover:bg-[#2a2a2f] text-white/90 min-h-[48px] px-2 py-3 rounded-2xl text-xs font-semibold transition-colors border-2 border-white/20 flex items-center justify-center"
                >
                  Save Anchors
                </button>
                <button
                  onClick={loadRoute}
                  className="flex-1 bg-[#1a1a1f] hover:bg-[#2a2a2f] text-white/90 min-h-[48px] px-2 py-3 rounded-2xl text-xs font-semibold transition-colors border-2 border-white/20 flex items-center justify-center"
                >
                  Load Anchors
                </button>
              </div>
            </div>
          )}

          {selectedPath !== null && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#121214] border-2 border-amber-500/50 rounded-[28px] p-5 max-w-sm w-full flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
              <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 shrink-0 border border-amber-500/30">
                <Route className="w-6 h-6" />
              </div>
              <div className="pt-1">
                <h3 className="text-amber-400 font-semibold text-base mb-1 tracking-tight">Path Segment {selectedPath + 1} Selected</h3>
                <p className="text-sm text-white/90 leading-relaxed font-sans">
                  Routing Style: <span className="text-white font-bold capitalize">{settings.arRoutingStyle}</span><br/>
                  Optimized to mitigate burnout (<span className="text-red-400 font-bold">{burnoutRisk.toFixed(1)}%</span>).
                </p>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#121214] border-2 border-white/20 rounded-full px-8 py-4 flex items-center gap-6 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 ring-2 ring-blue-500/50"></div>
              <span className="text-sm tracking-wide text-white font-medium">Existing Ends</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-red-500 ring-2 ring-red-500/50"></div>
              <span className="text-sm tracking-wide text-white font-medium">Target Locations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-emerald-500/50"></div>
              <span className="text-sm tracking-wide text-white font-medium">Flexible Path</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute top-6 right-6 flex flex-col gap-2 pointer-events-auto">
            {!session ? (
              <button
                onClick={() => store.enterAR()}
                className="bg-[#121214] hover:bg-[#1c1c1e] text-blue-400 px-8 py-3 rounded-full text-sm font-bold transition-colors border-2 border-blue-500/50 flex items-center gap-2"
              >
                Enter AR
              </button>
            ) : (
              <button
                onClick={() => session.end()}
                className="bg-[#121214] hover:bg-[#1c1c1e] text-red-400 px-8 py-3 rounded-full text-sm font-bold transition-colors border-2 border-red-500/50 flex items-center gap-2"
              >
                Exit AR
              </button>
            )}
          </div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#121214] border-2 border-white/20 rounded-[24px] px-8 py-4 flex flex-col items-center gap-2 pointer-events-auto">
            <span className="text-base font-bold text-blue-400 tracking-tight">
              Breathe with the sphere
            </span>
            <span className="text-sm text-white/90 font-sans font-medium">
              Inhale as it expands, exhale as it contracts
            </span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full h-full relative font-sans">
      <Canvas dpr={[1, 1.5]} camera={{ position: [10, 10, 10], fov: 50 }}>
        <XR store={store}>
          <Suspense fallback={null}>
            <color attach="background" args={["#09090b"]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            <Grid infiniteGrid fadeDistance={30} sectionColor="#27272a" cellColor="#18181b" />

            <ARSceneContent
              mode={mode}
              points={points}
              settings={settings}
              burnoutRisk={burnoutRisk}
              selectedPath={selectedPath}
              onSelectPath={setSelectedPath}
              placedPosition={placedPosition}
              setPlacedPosition={setPlacedPosition}
              placementMode={placementMode}
              setPlacementMode={setPlacementMode}
              tempStartNode={tempStartNode}
              setTempStartNode={setTempStartNode}
              onAddRoute={onAddRoute}
              onGenerateRoute={generateRoute}
              onResetAR={resetAR}
            />

            <OrbitControls autoRotate autoRotateSpeed={mode === "router" ? 0.5 : 0.2} />
          </Suspense>
        </XR>
      </Canvas>

      {session && domOverlayRoot ? createPortal(overlayUI, domOverlayRoot) : overlayUI}

      {/* Reflective Prompt Overlay (Spatial UI Style - Optimized Opaque) */}
      {showReflectivePrompt && (
        <div className="absolute inset-0 z-50 bg-[#09090b]/95 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-[#121214] border-2 border-white/20 p-8 rounded-[32px] max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4 border-b-2 border-white/10 pb-4 tracking-tight">Reflective Inquiry</h3>
            <p className="text-white/90 mb-6 text-sm font-sans font-medium leading-relaxed">
              Did visualizing your cognitive load in AR change how you feel right now?
            </p>
            <textarea
              value={reflectiveAnswer}
              onChange={(e) => setReflectiveAnswer(e.target.value)}
              className="w-full h-32 p-4 bg-[#1a1a1f] border-2 border-white/10 rounded-2xl mb-6 resize-none outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-sm font-sans text-white font-medium placeholder:text-white/40 transition-all"
              placeholder="Record your qualitative experience here (optional)..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReflectivePrompt(false);
                  setReflectiveAnswer("");
                }}
                className="px-6 py-3 min-w-[100px] text-sm font-bold text-white/50 hover:text-white bg-[#1a1a1f] hover:bg-[#2a2a2f] border-2 border-transparent rounded-full transition-colors flex items-center justify-center"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  console.log("Qualitative Data Logged (AR):", reflectiveAnswer);
                  setShowReflectivePrompt(false);
                  setReflectiveAnswer("");
                }}
                className="px-6 py-3 min-w-[140px] bg-[#1a1a1f] border-2 border-emerald-500/50 hover:bg-[#2a2a2f] text-emerald-400 text-sm font-bold rounded-full transition-colors flex items-center justify-center"
              >
                Log Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
