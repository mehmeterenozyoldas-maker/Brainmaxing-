import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Glasses, Eye, Clock, Brain, Zap, AlertTriangle, ArrowRight, Activity, ShieldAlert } from 'lucide-react';
import { useCognitive } from '../context/CognitiveContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const latencyData = [
  { name: 'Mon', native: 42, ai: 12 },
  { name: 'Tue', native: 45, ai: 11 },
  { name: 'Wed', native: 48, ai: 10 },
  { name: 'Thu', native: 52, ai: 9 },
  { name: 'Fri', native: 55, ai: 8 },
];

const offloadingData = [
  { task: 'Email Drafting', gained: '2h 15m', lost: 'Nuance & Tone', status: 'offloaded' },
  { task: 'Schedule Optimization', gained: '1h 30m', lost: 'Temporal Awareness', status: 'offloaded' },
  { task: 'Code Boilerplate', gained: '3h 45m', lost: 'Syntax Memory', status: 'offloaded' },
  { task: 'Creative Brainstorming', gained: '0h', lost: 'None', status: 'retained' },
  { task: 'System Architecture', gained: '0h', lost: 'None', status: 'retained' },
];

export function CognitiveContextualizer() {
  const { burnoutRisk, updateBCIState } = useCognitive();
  const [stimulusLevel, setStimulusLevel] = useState(85);
  const [focusLevel, setFocusLevel] = useState(32);
  
  const isHighBurnout = burnoutRisk > 70;

  // Simulate live gaze data fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setStimulusLevel(prev => Math.min(100, Math.max(0, prev + (Math.random() * 10 - 5))));
      setFocusLevel(prev => {
        const next = Math.min(100, Math.max(0, prev + (Math.random() * 8 - 4)));
        if (prev - next > 2.5) {
          window.dispatchEvent(new CustomEvent('focusDropWarning'));
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSuggestReset = () => {
    updateBCIState({ noiseCancelingActive: true, visualThrottling: 40, auditoryThrottling: 60 });
    // Dispatch event to trigger a system message in the chat interface if needed
    window.dispatchEvent(new CustomEvent('systemTrigger', { 
      detail: { message: "SYSTEM_TRIGGER: High-stimulus environment detected via Glass. Initiating Neural Shield and visual dampening." } 
    }));
  };

  return (
    <div className={`h-full flex flex-col p-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 ${isHighBurnout ? 'text-stone-100' : 'text-zinc-100'}`}>
      <header>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Glasses className={`w-6 h-6 ${isHighBurnout ? 'text-amber-500' : 'text-emerald-400'}`} />
          Cognitive Contextualizer
        </h2>
        <p className={`mt-2 ${isHighBurnout ? 'text-stone-400' : 'text-zinc-400'}`}>Ambient cognitive context derived from AI Wearables & Glass integration.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gaze-Driven Neural Mapping */}
        <div className={`bg-zinc-900/50 border ${isHighBurnout ? 'border-stone-800 bg-[#292524]' : 'border-zinc-800 bg-zinc-900'} rounded-3xl p-6 relative overflow-hidden flex flex-col`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className={`w-5 h-5 ${isHighBurnout ? 'text-amber-400' : 'text-emerald-400'}`} />
              Gaze-Driven Neural Mapping
            </h3>
            <div className={`flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400 font-medium animate-pulse`}>
              <span className={`w-2 h-2 rounded-full ${isHighBurnout ? 'bg-amber-500' : 'bg-red-500'}`}></span>
              LIVE
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center relative py-8">
            {/* Simulated Gaze Heatmap */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <div className={`w-48 h-48 rounded-full border ${isHighBurnout ? 'border-amber-500/30' : 'border-emerald-500/30'} animate-[ping_3s_ease-in-out_infinite]`}></div>
              <div className={`absolute w-32 h-32 rounded-full border ${isHighBurnout ? 'border-amber-500/50' : 'border-emerald-500/50'} animate-[ping_2s_ease-in-out_infinite]`}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 w-full max-w-sm z-10">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono tracking-widest mb-2">{Math.round(stimulusLevel)}%</div>
                <div className={`text-xs uppercase tracking-wider ${isHighBurnout ? 'text-stone-500' : 'text-zinc-500'}`}>Env. Stimulus</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold font-mono tracking-widest mb-2">{Math.round(focusLevel)}%</div>
                <div className={`text-xs uppercase tracking-wider ${isHighBurnout ? 'text-stone-500' : 'text-zinc-500'}`}>Gaze Focus</div>
              </div>
            </div>
          </div>

          {stimulusLevel > 70 && focusLevel < 40 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-orange-400">High-Stimulus / Low-Focus Environment</h4>
                  <p className="text-xs text-orange-400/70 mt-1 mb-3">
                    Your visual environment is highly erratic. Occipital lobe is overstimulated, reducing frontal lobe focus capacity.
                  </p>
                  <button 
                    onClick={handleSuggestReset}
                    className="text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Initiate Visual Dampening Reset
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Contextual AI Latency Analysis */}
        <div className={`bg-zinc-900/50 border ${isHighBurnout ? 'border-stone-800' : 'border-zinc-800'} rounded-3xl p-6 flex flex-col`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className={`w-5 h-5 ${isHighBurnout ? 'text-amber-400' : 'text-purple-400'}`} />
              AI-Assisted Latency Analysis
            </h3>
          </div>
          
          <p className={`text-sm ${isHighBurnout ? 'text-stone-400' : 'text-zinc-400'} mb-6`}>
            Tracking problem-solving speed: Native Neural Processing vs. AI-Assisted Processing.
          </p>

          <div className="h-48 w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isHighBurnout ? '#292524' : '#27272a'} vertical={false} />
                <XAxis dataKey="name" stroke={isHighBurnout ? '#78716c' : '#52525b'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={isHighBurnout ? '#78716c' : '#52525b'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isHighBurnout ? '#1c1917' : '#18181b', borderColor: isHighBurnout ? '#292524' : '#27272a', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontSize: '12px', color: isHighBurnout ? '#a8a29e' : '#a1a1aa', marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="native" name="Native Latency (mins)" fill={isHighBurnout ? '#fbbf24' : '#3b82f6'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="ai" name="AI-Assisted (mins)" fill={isHighBurnout ? '#b45309' : '#a855f7'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={`border rounded-2xl p-4 mt-auto ${isHighBurnout ? 'bg-[#292524] border-stone-800' : 'bg-zinc-950 border-zinc-800'}`}>
            <div className="flex items-center gap-2 text-sm text-zinc-300 mb-1">
              <Activity className="w-4 h-4 text-red-400" />
              <span className={`font-medium ${isHighBurnout ? 'text-stone-300' : 'text-zinc-300'}`}>Cognitive Atrophy Warning</span>
            </div>
            <p className={`text-xs ${isHighBurnout ? 'text-stone-500' : 'text-zinc-500'}`}>
              Native latency has increased by <span className="text-red-400 font-medium">14%</span> over the last 5 days. You are entering an "AI-Dependency Loop." Recommend Manual Planning Mode.
            </p>
          </div>
        </div>
      </div>

      {/* Cognitive Offloading Analysis */}
      <div className={`bg-zinc-900/50 border ${isHighBurnout ? 'border-stone-800' : 'border-zinc-800'} rounded-3xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className={`w-5 h-5 ${isHighBurnout ? 'text-amber-500' : 'text-emerald-400'}`} />
            Cognitive Offloading Analysis
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className={`text-sm font-medium uppercase tracking-wider border-b pb-2 ${isHighBurnout ? 'text-stone-500 border-stone-800' : 'text-zinc-500 border-zinc-800'}`}>
              Offloaded to AI
            </h4>
            <div className="space-y-3">
              {offloadingData.filter(d => d.status === 'offloaded').map((item, idx) => (
                <div key={idx} className={`border rounded-2xl p-4 ${isHighBurnout ? 'bg-[#292524] border-stone-800' : 'bg-zinc-950 border-zinc-800'}`}>
                  <div className={`font-medium mb-2 ${isHighBurnout ? 'text-stone-200' : 'text-zinc-200'}`}>{item.task}</div>
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between">
                      <span className={isHighBurnout ? 'text-stone-500' : 'text-zinc-500'}>Efficiency Gained:</span>
                      <span className={`font-medium ${isHighBurnout ? 'text-amber-400' : 'text-emerald-400'}`}>+{item.gained}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isHighBurnout ? 'text-stone-500' : 'text-zinc-500'}>Expertise Atrophy:</span>
                      <span className="text-red-400 font-medium">-{item.lost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className={`text-sm font-medium uppercase tracking-wider border-b pb-2 ${isHighBurnout ? 'text-stone-500 border-stone-800' : 'text-zinc-500 border-zinc-800'}`}>
              Retained (Native Processing)
            </h4>
            <div className="space-y-3">
              {offloadingData.filter(d => d.status === 'retained').map((item, idx) => (
                <div key={idx} className={`border rounded-2xl p-4 flex items-center justify-between ${isHighBurnout ? 'bg-[#292524] border-stone-800' : 'bg-zinc-950 border-zinc-800'}`}>
                  <div className={`font-medium ${isHighBurnout ? 'text-stone-200' : 'text-zinc-200'}`}>{item.task}</div>
                  <Zap className={`w-4 h-4 ${isHighBurnout ? 'text-amber-400' : 'text-emerald-400'}`} />
                </div>
              ))}
            </div>

            <div className={`mt-6 border rounded-2xl p-4 ${isHighBurnout ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
              <h4 className={`text-sm font-medium mb-2 ${isHighBurnout ? 'text-amber-400' : 'text-blue-400'}`}>Speculative Insight</h4>
              <p className={`text-sm italic ${isHighBurnout ? 'text-amber-300/80' : 'text-blue-300/80'}`}>
                "By offloading Email Drafting, you have gained 2 hours of efficiency, but you are losing expertise in Nuance & Tone."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
