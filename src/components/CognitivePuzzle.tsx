import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'motion/react';

function PuzzleRing({ radius, initialRotation, color, onAlign, isAligned }: { radius: number, initialRotation: number, color: string, onAlign: (aligned: boolean) => void, isAligned: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [targetRotation, setTargetRotation] = useState(initialRotation);
  const currentRotation = useRef(initialRotation);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smoothly interpolate to target rotation
      currentRotation.current = THREE.MathUtils.lerp(currentRotation.current, targetRotation, delta * 5);
      meshRef.current.rotation.z = currentRotation.current;
      
      // Check if aligned (close to 0 or multiple of 2PI)
      const normalizedRot = Math.abs(currentRotation.current % (Math.PI * 2));
      const aligned = normalizedRot < 0.1 || normalizedRot > Math.PI * 2 - 0.1;
      
      if (aligned !== isAligned) {
        onAlign(aligned);
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isAligned) {
      setTargetRotation(prev => prev + Math.PI / 4); // Rotate 45 degrees
    }
  };

  return (
    <mesh 
      ref={meshRef} 
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <torusGeometry args={[radius, 0.15, 16, 64, Math.PI * 1.75]} />
      <meshStandardMaterial 
        color={isAligned ? '#10b981' : (hovered ? '#f59e0b' : color)} 
        emissive={isAligned ? '#10b981' : '#000000'}
        emissiveIntensity={isAligned ? 0.5 : 0}
        wireframe={!isAligned}
      />
    </mesh>
  );
}

export function CognitivePuzzle({ onSolve }: { onSolve: () => void }) {
  const [alignedRings, setAlignedRings] = useState([false, false, false]);

  const handleAlign = (index: number, aligned: boolean) => {
    setAlignedRings(prev => {
      const next = [...prev];
      next[index] = aligned;
      
      if (next.every(r => r)) {
        setTimeout(onSolve, 1000);
      }
      return next;
    });
  };

  return (
    <div className="w-full h-full relative cursor-pointer">
      <div className="absolute top-2 left-2 z-10 text-xs text-zinc-400 pointer-events-none bg-zinc-900/80 px-2 py-1 rounded">
        Spatial Reasoning: Click rings to align the gaps at the top marker.
      </div>
      <Canvas camera={{ position: [0, 0, 6] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        
        <PuzzleRing 
          radius={1.8} 
          initialRotation={Math.PI / 4 * 3} 
          color="#3b82f6" 
          isAligned={alignedRings[0]} 
          onAlign={(a) => handleAlign(0, a)} 
        />
        <PuzzleRing 
          radius={1.2} 
          initialRotation={Math.PI / 4 * 5} 
          color="#8b5cf6" 
          isAligned={alignedRings[1]} 
          onAlign={(a) => handleAlign(1, a)} 
        />
        <PuzzleRing 
          radius={0.6} 
          initialRotation={Math.PI / 4 * 1} 
          color="#ec4899" 
          isAligned={alignedRings[2]} 
          onAlign={(a) => handleAlign(2, a)} 
        />

        {/* Target Indicator */}
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[0.05, 0.5, 0.05]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>

        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
      
      {alignedRings.every(r => r) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-20"
        >
          <div className="text-emerald-400 font-bold tracking-widest uppercase animate-pulse border border-emerald-500/50 px-6 py-3 rounded-lg bg-emerald-900/20">
            Neural Pathway Unlocked
          </div>
        </motion.div>
      )}
    </div>
  );
}
