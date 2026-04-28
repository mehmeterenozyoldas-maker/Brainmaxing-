import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';
import { X, Download, CheckCircle2, Brain, Rotate3D, SlidersHorizontal } from 'lucide-react';

const GRID_SIZE = 8; // Increased grid size for more complexity
const SPACING = 0.6;

// Generates a complex interlocking 3D structure based on a Gyroid surface approximation
const generateGyroidPuzzle = () => {
  const pieceA: number[][] = [];
  const pieceB: number[][] = [];
  const pieceC: number[][] = []; // Added third piece
  const center = (GRID_SIZE - 1) / 2;
  
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const dx = x - center;
        const dy = y - center;
        const dz = z - center;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        // Create a spherical bounding volume
        if (dist <= 4.0) { 
          const sx = dx * 0.8;
          const sy = dy * 0.8;
          const sz = dz * 0.8;
          
          // Gyroid approximation equation
          const val = Math.sin(sx)*Math.cos(sy) + Math.sin(sy)*Math.cos(sz) + Math.sin(sz)*Math.cos(sx);
          
          if (val > 0.5) {
            pieceA.push([x, y, z]);
          } else if (val < -0.5) {
            pieceB.push([x, y, z]);
          } else {
            pieceC.push([x, y, z]);
          }
        }
      }
    }
  }
  return { pieceA, pieceB, pieceC };
};

const LatticePiece = ({ voxels, color, isSolved, isMovable, targetRot }: { voxels: number[][], color: string, isSolved: boolean, isMovable?: boolean, targetRot?: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (isMovable && groupRef.current && targetRot) {
      // Smoothly interpolate to target rotation
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(targetRot[0], targetRot[1], targetRot[2]));
      groupRef.current.quaternion.slerp(targetQuat, 10 * delta);
    }
  });

  const hasVoxel = (x: number, y: number, z: number) => voxels.some(v => v[0] === x && v[1] === y && v[2] === z);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.15,
    metalness: 0.85,
    emissive: isSolved ? "#10b981" : "#000000",
    emissiveIntensity: isSolved ? 0.4 : 0,
  }), [color, isSolved]);

  const nodeGeo = useMemo(() => new THREE.IcosahedronGeometry(0.2, 1), []);
  const strutGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.08, SPACING, 8), []);

  return (
    <group ref={groupRef}>
      {voxels.map(([x, y, z]) => {
        const px = (x - (GRID_SIZE - 1) / 2) * SPACING;
        const py = (y - (GRID_SIZE - 1) / 2) * SPACING;
        const pz = (z - (GRID_SIZE - 1) / 2) * SPACING;
        
        return (
          <group key={`voxel-${x}-${y}-${z}`}>
            <mesh position={[px, py, pz]} geometry={nodeGeo} material={material} castShadow receiveShadow />
            
            {hasVoxel(x + 1, y, z) && (
              <mesh position={[px + SPACING/2, py, pz]} rotation={[0, 0, Math.PI/2]} geometry={strutGeo} material={material} castShadow receiveShadow />
            )}
            {hasVoxel(x, y + 1, z) && (
              <mesh position={[px, py + SPACING/2, pz]} rotation={[0, 0, 0]} geometry={strutGeo} material={material} castShadow receiveShadow />
            )}
            {hasVoxel(x, y, z + 1) && (
              <mesh position={[px, py, pz + SPACING/2]} rotation={[Math.PI/2, 0, 0]} geometry={strutGeo} material={material} castShadow receiveShadow />
            )}
          </group>
        );
      })}
    </group>
  );
};

export const SpatialPuzzle = ({ onClose }: { onClose: () => void }) => {
  const { pieceA, pieceB, pieceC } = useMemo(() => generateGyroidPuzzle(), []);

  // Continuous rotation state for piece B and C
  const [rotB, setRotB] = useState<[number, number, number]>([Math.PI * 0.75, Math.PI * 0.25, Math.PI * 0.5]);
  const [rotC, setRotC] = useState<[number, number, number]>([-Math.PI * 0.5, Math.PI * 0.8, -Math.PI * 0.2]);
  
  const [isSolved, setIsSolved] = useState(false);
  const exportGroupRef = useRef<THREE.Group>(null);

  // Check if solved (all rotations close to 0 or multiples of 2PI)
  useEffect(() => {
    const isAligned = (rot: [number, number, number]) => {
      return rot.every(angle => {
        const normalized = Math.abs(angle % (Math.PI * 2));
        return normalized < 0.15 || Math.abs(normalized - Math.PI * 2) < 0.15;
      });
    };

    if (isAligned(rotB) && isAligned(rotC)) {
      setIsSolved(true);
    } else {
      setIsSolved(false);
    }
  }, [rotB, rotC]);

  const exportSTL = () => {
    if (!exportGroupRef.current || !isSolved) return;
    
    const exporter = new STLExporter();
    const stlString = exporter.parse(exportGroupRef.current);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cognitive_anchor_gyroid.stl';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSliderChange = (piece: 'B' | 'C', axis: 0 | 1 | 2, value: number) => {
    if (isSolved) return;
    if (piece === 'B') {
      const newRot = [...rotB] as [number, number, number];
      newRot[axis] = value;
      setRotB(newRot);
    } else {
      const newRot = [...rotC] as [number, number, number];
      newRot[axis] = value;
      setRotC(newRot);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-zinc-50 border border-zinc-300 shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-300 bg-white">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-zinc-900" />
            <div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Cognitive Regulation: Tri-Lattice Anchor</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">Fine-tune the spatial alignment of all three neural lattice components to reset cognitive state.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* 3D Canvas */}
          <div className="flex-1 bg-zinc-100 relative border-r border-zinc-300">
            <Canvas camera={{ position: [8, 8, 8], fov: 45 }} shadows>
              <ambientLight intensity={1.0} />
              <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
              <Environment preset="city" />
              
              <group ref={exportGroupRef}>
                <LatticePiece voxels={pieceA} color="#18181b" isSolved={isSolved} />
                <LatticePiece voxels={pieceB} color={isSolved ? "#18181b" : "#ef4444"} isSolved={isSolved} isMovable targetRot={rotB} />
                <LatticePiece voxels={pieceC} color={isSolved ? "#18181b" : "#3b82f6"} isSolved={isSolved} isMovable targetRot={rotC} />
              </group>

              <ContactShadows position={[0, -3.5, 0]} opacity={0.4} scale={20} blur={2} far={5} />
              <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />
            </Canvas>
          </div>

          {/* Controls Panel */}
          <div className="w-full md:w-96 p-8 flex flex-col gap-8 bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300">
            
            <div className="space-y-3">
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Status</h3>
              {isSolved ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 w-fit">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Lattice Synchronized</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 w-fit">
                  <Rotate3D className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Desynchronized</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <SlidersHorizontal className="w-3 h-3" />
                Fine-Tune Alignment
              </h3>
              
              {/* Piece B Controls */}
              <div className="space-y-4 p-4 bg-zinc-50 border border-zinc-300">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-red-600">Alpha Component (Red)</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>X-Axis</span>
                    <span>{(rotB[0] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={rotB[0]} onChange={(e) => handleSliderChange('B', 0, parseFloat(e.target.value))} disabled={isSolved} className="w-full accent-red-500" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>Y-Axis</span>
                    <span>{(rotB[1] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={rotB[1]} onChange={(e) => handleSliderChange('B', 1, parseFloat(e.target.value))} disabled={isSolved} className="w-full accent-red-500" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>Z-Axis</span>
                    <span>{(rotB[2] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={rotB[2]} onChange={(e) => handleSliderChange('B', 2, parseFloat(e.target.value))} disabled={isSolved} className="w-full accent-red-500" />
                </div>
              </div>

              {/* Piece C Controls */}
              <div className="space-y-4 p-4 bg-zinc-50 border border-zinc-300">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-blue-600">Beta Component (Blue)</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>X-Axis</span>
                    <span>{(rotC[0] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={rotC[0]} onChange={(e) => handleSliderChange('C', 0, parseFloat(e.target.value))} disabled={isSolved} className="w-full accent-blue-500" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>Y-Axis</span>
                    <span>{(rotC[1] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={rotC[1]} onChange={(e) => handleSliderChange('C', 1, parseFloat(e.target.value))} disabled={isSolved} className="w-full accent-blue-500" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>Z-Axis</span>
                    <span>{(rotC[2] * 180 / Math.PI).toFixed(0)}°</span>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={rotC[2]} onChange={(e) => handleSliderChange('C', 2, parseFloat(e.target.value))} disabled={isSolved} className="w-full accent-blue-500" />
                </div>
              </div>

            </div>

            <div className="mt-auto pt-8 border-t border-zinc-300 space-y-3">
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Fabrication</h3>
              <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                Export this generative Gyroid lattice as an STL file for 3D printing. Keep it on your desk as a physical anchor.
              </p>
              <button
                onClick={exportSTL}
                disabled={!isSolved}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download STL
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
