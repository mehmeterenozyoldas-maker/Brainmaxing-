import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Brain, Zap, ArrowRight, CheckCircle2, AlertCircle, Network, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as d3 from 'd3';
import { useCognitive } from '../context/CognitiveContext';

// Force Graph Component
function ForceGraph({ teamData }: { teamData: any[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    // Clear old SVG
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create a copy of the data for d3 mutation
    const nodes = teamData.map(d => ({...d, radius: 15 + (d.capacity / 5)}));
    
    // Simple links: Connect everyone to "You" to form a hub/spoke, or a complete graph
    const links = teamData.filter(d => d.name !== 'You').map(d => ({
      source: 'You',
      target: d.name,
      // Inverse of capacity = tension/distance
      distance: 100 + (d.burnout)
    }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.name).distance((d: any) => d.distance))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.radius + 10));

    // Glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "glow");
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "3.5")
        .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in", "coloredBlur");
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#3f3f46')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Outer aura (burnout representation)
    nodeGroup.append('circle')
      .attr('r', d => d.radius + 5)
      .attr('fill', d => d.burnout > 60 ? 'rgba(239, 68, 68, 0.2)' : 'transparent')
      .style("filter", "url(#glow)");

    // Core node
    nodeGroup.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.burnout > 60 ? '#ef4444' : (d.name === 'You' ? '#3b82f6' : '#10b981'))
      .attr('stroke', '#27272a')
      .attr('stroke-width', 2);

    // Label
    nodeGroup.append('text')
      .text(d => d.name)
      .attr('x', d => d.radius + 8)
      .attr('y', 4)
      .attr('fill', '#e4e4e7')
      .attr('font-size', '12px')
      .attr('font-family', '"JetBrains Mono", monospace');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [teamData]);

  return (
    <div ref={containerRef} className="w-full h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
      <svg ref={svgRef}></svg>
      <div className="absolute bottom-4 left-4 text-xs font-mono text-zinc-500 pointer-events-none">Interactive Force Graph</div>
    </div>
  );
}

// Mock data for Team Capacity Dashboard
// Moved inside component to make it dynamic based on user state

// Simple 3D Brain representation for Neural Sync
function SimpleBrain({ position, color, active }: { position: [number, number, number], color: string, active: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.6} 
          roughness={0.2}
          emissive={active ? color : '#000000'}
          emissiveIntensity={active ? 0.5 : 0}
        />
      </mesh>
      {active && (
        <mesh>
          <sphereGeometry args={[1.1, 16, 16]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function SyncConnection({ active }: { active: boolean }) {
  if (!active) return null;
  
  const points = [];
  for (let i = 0; i <= 20; i++) {
    points.push(new THREE.Vector3(-2 + (i / 20) * 4, Math.sin(i * 0.5) * 0.5, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);

  return (
    <mesh>
      <tubeGeometry args={[curve, 20, 0.05, 8, false]} />
      <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
    </mesh>
  );
}

export function CollectiveIntelligence() {
  const { burnoutRisk, bciState } = useCognitive();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPartner, setSyncPartner] = useState<string | null>(null);

  // Inject the current user into the team data
  const teamData = useMemo(() => {
    const userCapacity = Math.max(0, 100 - burnoutRisk);
    const userAiReliance = Math.min(100, burnoutRisk + 10);
    
    return [
      { name: 'You', capacity: userCapacity, aiReliance: userAiReliance, role: 'User', burnout: burnoutRisk },
      { name: 'Alice', capacity: 85, aiReliance: 20, role: 'Architect', burnout: 15 },
      { name: 'Bob', capacity: 40, aiReliance: 75, role: 'Developer', burnout: 60 },
      { name: 'Charlie', capacity: 95, aiReliance: 10, role: 'Lead', burnout: 5 },
      { name: 'Diana', capacity: 55, aiReliance: 60, role: 'Designer', burnout: 45 },
    ];
  }, [burnoutRisk]);

  const totalTeamCapacity = useMemo(() => {
    return teamData.reduce((acc, curr) => acc + curr.capacity, 0) / teamData.length;
  }, [teamData]);

  const totalTeamBurnout = useMemo(() => {
    return teamData.reduce((acc, curr) => acc + curr.burnout, 0) / teamData.length;
  }, [teamData]);

  const handleSync = (partner: string) => {
    setSyncPartner(partner);
    setIsSyncing(true);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-400" />
          Collective Intelligence
        </h2>
        <p className="text-zinc-400 mt-2">Scaling cognitive management to teams and peer ecosystems.</p>
      </header>

      {/* Shared Cognitive Field (BCI Speculation) */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[100px]"
               style={{
                 background: `radial-gradient(circle, ${totalTeamBurnout > 60 ? '#ef4444' : '#3b82f6'} 0%, transparent 70%)`,
                 transform: `translate(-50%, -50%) scale(${0.8 + (totalTeamCapacity / 200)})`,
                 transition: 'all 2s ease-in-out'
               }}
          />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2 mb-2">
              <Network className="w-5 h-5 text-blue-400" />
              Shared Cognitive Field
            </h3>
            <p className="text-sm text-zinc-400 max-w-md">
              In BCI mode, you don't just see status; you feel the cognitive load of the group. The field dynamically adjusts based on collective bandwidth.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-center min-w-[120px]">
              <div className="text-3xl font-bold text-zinc-100 mb-1">{Math.round(totalTeamCapacity)}%</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Field Capacity</div>
            </div>
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-center min-w-[120px]">
              <div className="text-3xl font-bold text-zinc-100 mb-1">{Math.round(totalTeamBurnout)}%</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">Field Tension</div>
            </div>
          </div>
        </div>

        {bciState.noiseCancelingActive && (
          <div className="relative z-10 mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-medium text-emerald-400">Neural Shield Active</div>
              <div className="text-xs text-emerald-500/70">Your BCI is dampening excessive field tension to protect your native processing.</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Capacity Dashboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Team Capacity Dashboard
            </h3>
            <p className="text-sm text-zinc-400 mt-1">Aggregated neural bandwidth & task distribution</p>
          </div>

          <div className="h-64 w-full relative">
            <ForceGraph teamData={teamData} />
          </div>

          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-zinc-300">Task Distribution Suggestions</h4>
            {burnoutRisk > 60 && (
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-200"><strong>Your capacity is low ({100 - burnoutRisk}%).</strong></p>
                  <p className="text-xs text-zinc-500 mt-1">Consider delegating complex tasks to Charlie or Alice.</p>
                </div>
              </div>
            )}
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-zinc-200">Assign complex architecture to <strong>Charlie</strong> (95% capacity).</p>
                <p className="text-xs text-zinc-500 mt-1">Charlie has the highest available neural bandwidth.</p>
              </div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-zinc-200"><strong>Bob</strong> is experiencing high AI reliance (75%).</p>
                <p className="text-xs text-zinc-500 mt-1">Suggest a Neural Sync session or manual task assignment.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Neural Sync */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Neural Sync
            </h3>
            <p className="text-sm text-zinc-400 mt-1">Link digital brains for collaborative problem solving</p>
          </div>

          <div className="h-48 w-full bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-800 mb-4">
            <Canvas camera={{ position: [0, 0, 5] }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              
              <SimpleBrain position={[-2, 0, 0]} color="#3b82f6" active={true} />
              <SimpleBrain position={[2, 0, 0]} color={isSyncing ? "#ec4899" : "#52525b"} active={isSyncing} />
              
              <SyncConnection active={isSyncing} />
              
              <OrbitControls enableZoom={false} enablePan={false} autoRotate={isSyncing} autoRotateSpeed={2} />
            </Canvas>
            
            {!isSyncing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-zinc-500 text-sm font-medium bg-zinc-900/80 px-4 py-2 rounded-full backdrop-blur-sm">Select a peer to sync</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-end">
            {!isSyncing ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400 mb-2">Available Peers for Sync:</p>
                {teamData.filter(t => t.name !== 'You' && (t.aiReliance > 50 || burnoutRisk > 60)).map(peer => (
                  <button 
                    key={peer.name}
                    onClick={() => handleSync(peer.name)}
                    className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                        {peer.name[0]}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-zinc-200">{peer.name}</div>
                        <div className="text-xs text-amber-400">High AI Reliance ({peer.aiReliance}%)</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-400">Sync Active with {syncPartner}</span>
                  </div>
                  <button 
                    onClick={() => setIsSyncing(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-sm text-zinc-300 mb-3">
                  {syncPartner}'s AI reliance threshold exceeded. Brainstorming mode triggered.
                </p>
                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-400 mb-1">Suggested Collaborative Task:</p>
                  <p className="text-sm font-medium text-zinc-200">Manual review of routing algorithms</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
