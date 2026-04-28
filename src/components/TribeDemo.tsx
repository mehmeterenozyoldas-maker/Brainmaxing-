import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Mic, Type, Search, ArrowRight, Activity, Play, Pause, Image as ImageIcon, Layers, Zap } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Mock data for the Tribe V2 Demo
const MOCK_DATABASE = [
  { id: 1, text: "A dog running through a grassy field catching a frisbee", video: "dog_frisbee.mp4", audio: "barking_panting.wav", color: "#3b82f6" },
  { id: 2, text: "A chef chopping vegetables rapidly on a wooden cutting board", video: "chef_chopping.mp4", audio: "chopping_sounds.wav", color: "#10b981" },
  { id: 3, text: "A musician playing a grand piano in an empty concert hall", video: "piano_playing.mp4", audio: "classical_piano.wav", color: "#8b5cf6" },
  { id: 4, text: "Waves crashing against rocky cliffs during a storm", video: "stormy_ocean.mp4", audio: "crashing_waves.wav", color: "#06b6d4" },
  { id: 5, text: "A bustling city street at night with neon signs", video: "city_night.mp4", audio: "traffic_chatter.wav", color: "#f59e0b" },
];

function LatentSpace({ targetId, isSearching }: { targetId: number | null, isSearching: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    
    const colorObj = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
      // Random sphere distribution
      const r = 4 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      // Base color (grayish)
      colorObj.setHex(0x444455);
      col[i * 3] = colorObj.r;
      col[i * 3 + 1] = colorObj.g;
      col[i * 3 + 2] = colorObj.b;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      
      if (isSearching) {
        // Pulse effect during search
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
        pointsRef.current.scale.set(scale, scale, scale);
      } else {
        pointsRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} colors={colors}>
      <PointMaterial transparent vertexColors size={0.05} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
      
      {/* Highlight the target cluster if found */}
      {targetId && !isSearching && (
        <mesh position={[1, 1, 1]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={MOCK_DATABASE.find(d => d.id === targetId)?.color || "#ffffff"} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </Points>
  );
}

export function TribeDemo() {
  const [inputModality, setInputModality] = useState<'text' | 'audio' | 'video'>('text');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<typeof MOCK_DATABASE[0] | null>(null);
  
  const handleSearch = () => {
    if (!query) return;
    
    setIsSearching(true);
    setResult(null);
    
    // Simulate network delay and embedding search
    setTimeout(() => {
      // Find a mock result based on query length or random
      const match = MOCK_DATABASE[query.length % MOCK_DATABASE.length];
      setResult(match);
      setIsSearching(false);
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Layers className="w-6 h-6 text-cyan-400" />
            Tribe V2: Joint Representation
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Cross-modal retrieval across Audio, Video, and Text in a unified latent space.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800 text-xs text-zinc-400">
          <Zap className="w-3 h-3 text-yellow-400" />
          Powered by Meta Tribe V2
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Input */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col h-full">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search className="w-4 h-4" /> Query Input
            </h3>
            
            <div className="flex gap-2 mb-6 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button 
                onClick={() => setInputModality('text')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${inputModality === 'text' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Type className="w-4 h-4" /> Text
              </button>
              <button 
                onClick={() => setInputModality('audio')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${inputModality === 'audio' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Mic className="w-4 h-4" /> Audio
              </button>
              <button 
                onClick={() => setInputModality('video')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${inputModality === 'video' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Video className="w-4 h-4" /> Video
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {inputModality === 'text' && (
                <div className="space-y-4">
                  <textarea 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Describe a scene, sound, or action..."
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    {MOCK_DATABASE.slice(0, 3).map(d => (
                      <button 
                        key={d.id} 
                        onClick={() => setQuery(d.text)}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors truncate max-w-full"
                      >
                        "{d.text.substring(0, 30)}..."
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {inputModality === 'audio' && (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => setQuery('audio_sample_1.wav')}>
                  <Mic className="w-8 h-8 mb-3" />
                  <p className="text-sm font-medium">Upload Audio or Record</p>
                  <p className="text-xs mt-1 opacity-60">WAV, MP3 up to 10MB</p>
                  {query && <div className="mt-4 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">{query}</div>}
                </div>
              )}

              {inputModality === 'video' && (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => setQuery('video_sample_1.mp4')}>
                  <Video className="w-8 h-8 mb-3" />
                  <p className="text-sm font-medium">Upload Video</p>
                  <p className="text-xs mt-1 opacity-60">MP4, WEBM up to 50MB</p>
                  {query && <div className="mt-4 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">{query}</div>}
                </div>
              )}
            </div>

            <button 
              onClick={handleSearch}
              disabled={!query || isSearching}
              className="mt-6 w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {isSearching ? (
                <><Activity className="w-5 h-5 animate-spin" /> Embedding...</>
              ) : (
                <>Retrieve Cross-Modal <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>

        {/* Center Column: Latent Space */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-1 relative overflow-hidden flex flex-col">
          <div className="absolute top-6 left-6 z-10">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <Activity className="w-4 h-4" /> Joint Embedding Space
            </h3>
          </div>
          
          <div className="flex-1 rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-950 to-zinc-900 relative">
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.5} />
                <LatentSpace targetId={result?.id || null} isSearching={isSearching} />
                <OrbitControls enableZoom={true} autoRotate={!isSearching} autoRotateSpeed={1} />
              </Suspense>
            </Canvas>
            
            {isSearching && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="bg-zinc-900/90 border border-zinc-800 px-6 py-4 rounded-2xl flex flex-col items-center shadow-2xl">
                  <Activity className="w-8 h-8 text-cyan-400 animate-pulse mb-3" />
                  <div className="text-sm font-medium text-zinc-200">Projecting into Joint Space</div>
                  <div className="text-xs text-zinc-500 mt-1">Calculating nearest neighbors...</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Retrieved Results */}
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col h-full">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Retrieved Modalities
            </h3>
            
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
              <AnimatePresence mode="wait">
                {!result && !isSearching ? (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-center p-6"
                  >
                    <Layers className="w-12 h-12 mb-4 opacity-20" />
                    <p>Enter a query to retrieve aligned audio, video, and text representations.</p>
                  </motion.div>
                ) : result ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Text Result */}
                    <div className={`p-4 rounded-2xl border ${inputModality === 'text' ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                        <Type className="w-3 h-3" /> Text {inputModality === 'text' && '(Input)'}
                      </div>
                      <p className="text-sm text-zinc-200 leading-relaxed">
                        "{result.text}"
                      </p>
                    </div>
                    
                    {/* Audio Result */}
                    <div className={`p-4 rounded-2xl border ${inputModality === 'audio' ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">
                        <Mic className="w-3 h-3" /> Audio {inputModality === 'audio' && '(Input)'}
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl">
                        <button className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/30 transition-colors">
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                        <div className="flex-1 h-6 flex items-center gap-0.5">
                          {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i} className="flex-1 bg-cyan-500/40 rounded-full" style={{ height: `${20 + Math.random() * 80}%` }} />
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500 font-mono">{result.audio}</div>
                    </div>
                    
                    {/* Video Result */}
                    <div className={`p-4 rounded-2xl border ${inputModality === 'video' ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">
                        <Video className="w-3 h-3" /> Video {inputModality === 'video' && '(Input)'}
                      </div>
                      <div className="aspect-video bg-zinc-900 rounded-xl relative overflow-hidden group cursor-pointer border border-zinc-800">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-zinc-700" />
                        </div>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/90 text-white flex items-center justify-center backdrop-blur-sm">
                            <Play className="w-5 h-5 ml-1" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500 font-mono">{result.video}</div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
