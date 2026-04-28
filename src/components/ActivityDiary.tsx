import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BrainModel } from './BrainModel';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Search, Plus, Clock, BookOpen, ChevronRight, Watch, Send, Activity, Sparkles, Battery, Target } from 'lucide-react';
import { useCognitive } from '../context/CognitiveContext';
import { GlossaryTooltip } from './GlossaryTooltip';

export function ActivityDiary() {
  const { activities, addActivity, settings, hoveredActivityIndex, setHoveredActivityIndex } = useCognitive();
  const [activeLobe, setActiveLobe] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [brainMode, setBrainMode] = useState<'twin' | 'simulation'>('twin');
  const [naturalInput, setNaturalInput] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [focusLevel, setFocusLevel] = useState(3);
  const [isImporting, setIsImporting] = useState(false);
  const [syncToast, setSyncToast] = useState<{show: boolean, message: string}>({show: false, message: ''});

  // Calculate cumulative activation levels for the day based on activities
  const dailyActivations = useMemo(() => {
    const acts: Record<string, number> = { Frontal: 0, Parietal: 0, Occipital: 0, Temporal: 0 };
    activities.forEach(a => {
      if (acts[a.lobe] !== undefined) {
        acts[a.lobe] = Math.min(1, acts[a.lobe] + 0.25); // Cap at 1.0
      }
    });
    return acts;
  }, [activities]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lobeActivityUpdate', {
      detail: { activeLobe, dailyActivations }
    }));
  }, [activeLobe, dailyActivations]);

  const handleAnalyze = (id: number, lobe: string) => {
    setAnalyzingId(id);
    setActiveLobe(lobe);
    
    // Auto reset after 5 seconds to simulate analysis completion
    setTimeout(() => {
      setAnalyzingId(null);
      setActiveLobe(null);
    }, 5000);
  };

  const handleNaturalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalInput.trim()) return;

    // Simple mock NLP to determine lobe and type
    const lower = naturalInput.toLowerCase();
    let lobe = 'Frontal';
    let type = settings.defaultActivityType;
    
    if (lower.includes('design') || lower.includes('visual') || lower.includes('draw')) { 
      lobe = 'Occipital'; type = 'Visual Design'; 
    } else if (lower.includes('read') || lower.includes('listen') || lower.includes('podcast')) { 
      lobe = 'Temporal'; type = 'Learning'; 
    } else if (lower.includes('move') || lower.includes('route') || lower.includes('space') || lower.includes('walk')) { 
      lobe = 'Parietal'; type = 'Spatial'; 
    } else if (lower.includes('rest') || lower.includes('break') || lower.includes('meditat') || lower.includes('sleep')) {
      lobe = 'Frontal'; type = 'Rest';
    }

    const newActivity = {
      title: naturalInput,
      type,
      lobe,
      duration: '1h', // Mock duration
      date: 'Just now',
      energyLevel,
      focusLevel
    };

    addActivity(newActivity);
    setNaturalInput('');
    setEnergyLevel(3);
    setFocusLevel(3);
    
    // Briefly highlight the new lobe
    setActiveLobe(lobe);
    setTimeout(() => setActiveLobe(null), 3000);

    // Call data uplink animation toast
    setSyncToast({ show: true, message: 'Neural Data Synced' });
    setTimeout(() => setSyncToast({show: false, message: ''}), 2500);
  };

  const handleWearableImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      const wearableData = [
        { title: 'Deep Focus Session (HRV Peak)', type: 'Biometric', lobe: 'Frontal', duration: '1.5h', date: 'Today, 08:00 AM', energyLevel: 5, focusLevel: 5 },
        { title: 'Spatial Navigation (GPS Track)', type: 'Movement', lobe: 'Parietal', duration: '45m', date: 'Today, 12:30 PM', energyLevel: 4, focusLevel: 3 }
      ];
      wearableData.forEach(addActivity);
      setIsImporting(false);
      
      // Highlight the imported lobes
      setActiveLobe('Parietal');
      setTimeout(() => setActiveLobe(null), 3000);

      // Call data uplink animation toast
      setSyncToast({ show: true, message: 'Wearable Data Synchronized' });
      setTimeout(() => setSyncToast({show: false, message: ''}), 2500);
    }, 1500);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-purple-400" />
          Activity Diary & Neural Analysis
        </h2>
        <p className="text-zinc-400 mt-2">Log your daily activities and analyze their impact on specific brain regions.</p>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        {/* Left: Activity List & Entry */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[calc(100vh-12rem)] overflow-hidden shadow-xl">
          
          {/* Natural Language Entry Form */}
          <div className="mb-6 space-y-4">
            <form onSubmit={handleNaturalEntry} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="e.g., 'I coded for 2 hours' or 'Read a research paper'"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!naturalInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 border border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:border-zinc-800 disabled:text-zinc-600 text-purple-400 rounded-lg transition-all"
                  title="Log Activity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-zinc-400 flex items-center gap-1 font-mono"><Battery className="w-3 h-3 text-amber-400"/> Energy</label>
                    <span className="text-xs font-mono font-medium text-amber-400">{energyLevel}/5</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" 
                    value={energyLevel} onChange={(e) => setEnergyLevel(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-zinc-400 flex items-center gap-1 font-mono"><Target className="w-3 h-3 text-blue-400"/> Focus</label>
                    <span className="text-xs font-mono font-medium text-blue-400">{focusLevel}/5</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" 
                    value={focusLevel} onChange={(e) => setFocusLevel(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </form>
            <button 
              onClick={handleWearableImport}
              disabled={isImporting}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-emerald-400 text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)] font-mono"
            >
              {isImporting ? (
                <><Activity className="w-4 h-4 animate-pulse text-emerald-400" /> Syncing Wearable Data...</>
              ) : (
                <><Watch className="w-4 h-4 text-emerald-400" /> Import from Wearables</>
              )}
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              <GlossaryTooltip 
                term="Activity Heatmap" 
                definition="A chronological visualization of your daily cognitive load. Darker green blocks represent moments of intense, focused energy application."
              />
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono tracking-widest uppercase">
               <span>Rest</span>
               <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-zinc-800"></div>
                  <div className="w-3 h-3 rounded-sm bg-emerald-900/40"></div>
                  <div className="w-3 h-3 rounded-sm bg-emerald-700/60"></div>
                  <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
               </div>
               <span>Deep Work</span>
            </div>
          </div>
          
          <div className="mb-6 p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-center overflow-x-auto">
             <div className="flex gap-1 flex-wrap max-h-32 flex-col content-start">
               {/* Generate a mock heatmap grid combining real activities and placeholders */}
               {Array.from({ length: 90 }).map((_, i) => {
                  // Determine block color based on chronological activity index (simulated)
                  const actIndex = activities.length - 1 - (i % (activities.length || 1));
                  const act = activities[actIndex];
                  
                  // Heatmap intensity logic based on energy & focus
                  let colorClass = "bg-zinc-800 hover:bg-zinc-700";
                  let titleInfo = "No Data";
                  
                  if (act && i < activities.length * 3) { // distribute real data slightly to simulate timeline
                      const intensity = act.energyLevel + act.focusLevel; // 2 to 10
                      
                      titleInfo = `${act.title} - Eng: ${act.energyLevel}, Foc: ${act.focusLevel}`;
                      
                      if (act.type.includes('Rest')) {
                         colorClass = "bg-[#292524] hover:bg-[#44403c] border border-stone-800"; // resting / amber tint possibility
                      } else if (intensity >= 8) {
                         colorClass = "bg-emerald-500 hover:bg-emerald-400 cursor-pointer";
                      } else if (intensity >= 6) {
                         colorClass = "bg-emerald-700/60 hover:bg-emerald-600/60 cursor-pointer";
                      } else if (intensity >= 4) {
                         colorClass = "bg-emerald-900/40 hover:bg-emerald-800/40 cursor-pointer";
                      }
                  } else {
                     // Empty historical squares
                     if (Math.random() > 0.8) {
                        colorClass = "bg-emerald-900/20";
                     }
                  }

                  return (
                     <div 
                       key={i} 
                       title={titleInfo}
                       className={`w-3 h-3 rounded-sm ${colorClass} transition-colors`}
                       onClick={() => act && i < activities.length * 3 ? handleAnalyze(act.id, act.lobe) : null}
                     />
                  );
               })}
             </div>
          </div>

          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
               Recent Log Selection
             </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
            {activities.map((activity, index) => {
              const isChartHovered = hoveredActivityIndex === index;
              return (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                onMouseEnter={() => setHoveredActivityIndex(index)}
                onMouseLeave={() => setHoveredActivityIndex(null)}
                className={`p-4 rounded-xl border transition-colors ${
                  analyzingId === activity.id ? 'bg-purple-900/20 border-purple-500/50' : 
                  isChartHovered ? 'bg-zinc-800 border-zinc-600 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-zinc-200">{activity.title}</h4>
                  <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">{activity.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.duration}</span>
                    <span>{activity.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Energy"><Battery className="w-3 h-3 text-amber-400"/> {activity.energyLevel}</span>
                    <span className="flex items-center gap-1" title="Focus"><Target className="w-3 h-3 text-blue-400"/> {activity.focusLevel}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                  <span className="text-purple-400 font-medium flex items-center gap-1">
                    Target: {activity.lobe} <Brain className="w-3 h-3" />
                  </span>
                </div>
                <button 
                  onClick={() => handleAnalyze(activity.id, activity.lobe)}
                  disabled={analyzingId !== null}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {analyzingId === activity.id ? (
                    <><Search className="w-4 h-4 animate-pulse text-purple-400" /> Analyzing Neural Impact...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Analyze Activity</>
                  )}
                </button>
              </motion.div>
            );
            })}
          </div>
        </div>

        {/* Right: 3D Brain Analysis */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[calc(100vh-12rem)] relative overflow-hidden shadow-xl">
          <div className="z-10 bg-zinc-900/80 backdrop-blur-sm pb-4 border-b border-zinc-800/50 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Neural Activation Map
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {activeLobe 
                  ? `Highlighting ${activeLobe} Lobe activation based on selected activity.` 
                  : 'Select an activity to visualize its cognitive impact.'}
              </p>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => setBrainMode('twin')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${brainMode === 'twin' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Digital Twin
              </button>
              <button
                onClick={() => setBrainMode('simulation')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${brainMode === 'simulation' ? 'bg-purple-900/40 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Sparkles className="w-3 h-3" /> Simulation
              </button>
            </div>
          </div>
          
          <div className="absolute inset-0 top-24">
            <Canvas dpr={[1, 1.5]} camera={{ position: [0, 2, 6], fov: 45 }}>
              <ambientLight intensity={0.4} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.5} />
              
              <BrainModel activeLobe={activeLobe} mode={brainMode} dailyActivations={dailyActivations} />
              
              <OrbitControls enableZoom={true} autoRotate={!activeLobe} autoRotateSpeed={1} />
            </Canvas>
          </div>

          {/* Mode Indicator Overlay */}
          <div className="absolute top-24 right-6 z-10 pointer-events-none">
             {brainMode === 'twin' ? (
               <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-2 rounded-lg text-xs text-zinc-400">
                 Showing cumulative daily activation.
               </div>
             ) : (
               <div className="bg-purple-900/20 border border-purple-500/30 px-3 py-2 rounded-lg text-xs text-purple-300 animate-pulse">
                 Projecting future neuroplasticity growth.
               </div>
             )}
          </div>

          <AnimatePresence>
            {activeLobe && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-6 right-6 bg-zinc-950/95 backdrop-blur-sm border border-purple-500/30 p-5 rounded-xl z-10 shadow-2xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <h4 className="text-purple-400 font-semibold text-lg">{activeLobe} Lobe Activated</h4>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                  {activeLobe === 'Frontal' && 'Associated with reasoning, planning, parts of speech, movement, emotions, and problem-solving. This activity strengthens executive function and complex decision-making pathways.'}
                  {activeLobe === 'Parietal' && 'Associated with movement, orientation, recognition, and perception of stimuli. This activity enhances spatial awareness and sensory integration.'}
                  {activeLobe === 'Temporal' && 'Associated with perception and recognition of auditory stimuli, memory, and speech. This activity reinforces long-term memory consolidation and language processing.'}
                  {activeLobe === 'Occipital' && 'Associated with visual processing. This activity strengthens pattern recognition and visual-spatial mapping.'}
                </p>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <ChevronRight className="w-4 h-4" /> Neuroplasticity strengthening detected
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Data Uplink Toast */}
      <AnimatePresence>
        {syncToast.show && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-zinc-950/95 backdrop-blur-sm border px-6 py-4 rounded-2xl flex items-center gap-4 overflow-hidden relative shadow-[0_0_20px_rgba(52,211,153,0.2)] border-emerald-500/50">
              {/* Sweeping laser effect */}
              <motion.div 
                 className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-400 shadow-[0_0_15px_#34d399]"
                 initial={{ left: '0%' }}
                 animate={{ left: '100%' }}
                 transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
              />
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="font-mono text-sm tracking-widest uppercase text-emerald-300 font-bold">
                {syncToast.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
