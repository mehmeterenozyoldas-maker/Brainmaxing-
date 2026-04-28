import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ReferenceArea } from 'recharts';
import { AlertTriangle, Brain, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { useCognitive } from '../context/CognitiveContext';
import { GlossaryTooltip } from './GlossaryTooltip';

export function PredictiveHealth() {
  const { activities, burnoutRisk, setBurnoutRisk, setHoveredActivityIndex } = useCognitive();
  const [burnoutData, setBurnoutData] = useState<any[]>([]);

  // Calculate dynamic neuroplasticity data based on logged activities
  const neuroData = useMemo(() => {
    const baseData = {
      'Frontal': { independent: 50, aiDelegated: 50 },
      'Parietal': { independent: 50, aiDelegated: 50 },
      'Temporal': { independent: 50, aiDelegated: 50 },
      'Occipital': { independent: 50, aiDelegated: 50 },
    };

    activities.forEach(act => {
      if (baseData[act.lobe as keyof typeof baseData]) {
        // High focus/energy means more independent strengthening
        const strengthBoost = (act.focusLevel + act.energyLevel) * 2;
        baseData[act.lobe as keyof typeof baseData].independent = Math.min(100, baseData[act.lobe as keyof typeof baseData].independent + strengthBoost);
        baseData[act.lobe as keyof typeof baseData].aiDelegated = Math.max(10, baseData[act.lobe as keyof typeof baseData].aiDelegated - (strengthBoost / 2));
      }
    });

    return [
      { lobe: 'Frontal (Reasoning)', independent: baseData['Frontal'].independent, aiDelegated: baseData['Frontal'].aiDelegated, fullMark: 100 },
      { lobe: 'Parietal (Spatial)', independent: baseData['Parietal'].independent, aiDelegated: baseData['Parietal'].aiDelegated, fullMark: 100 },
      { lobe: 'Temporal (Memory)', independent: baseData['Temporal'].independent, aiDelegated: baseData['Temporal'].aiDelegated, fullMark: 100 },
      { lobe: 'Occipital (Visual)', independent: baseData['Occipital'].independent, aiDelegated: baseData['Occipital'].aiDelegated, fullMark: 100 },
    ];
  }, [activities]);

  // Calculate dynamic burnout trend based on activities
  useEffect(() => {
    if (activities.length === 0) return;

    const data = [];
    let currentRisk = 40; // Base starting risk
    let aiUsage = 30;
    let deepWork = 70;
    let consecutiveLowEnergy = 0;

    // Reverse activities to process chronologically (oldest first)
    const chronologicalActs = [...activities].reverse();

    chronologicalActs.forEach((act, index) => {
      const isRest = act.type.toLowerCase().includes('rest') || act.type.toLowerCase().includes('break') || act.type.toLowerCase().includes('meditation');

      if (isRest) {
        // Rest periods provide significant recovery
        currentRisk = Math.max(10, currentRisk - 25);
        aiUsage = Math.max(10, aiUsage - 15);
        consecutiveLowEnergy = 0;
      } else if (act.energyLevel <= 2 || act.focusLevel <= 2) {
        consecutiveLowEnergy++;
        // Compounding effect for consecutive low energy/focus
        const penalty = 10 + (consecutiveLowEnergy * 5);
        aiUsage = Math.min(95, aiUsage + penalty);
        
        // Interaction: High AI reliance + Low Deep Work accelerates burnout
        const interactionMultiplier = aiUsage > 70 ? 1.5 : 1.0;
        currentRisk = Math.min(100, currentRisk + (15 * interactionMultiplier));
      } else {
        consecutiveLowEnergy = 0;
        // High focus/energy provides moderate recovery
        aiUsage = Math.max(10, aiUsage - 10);
        currentRisk = Math.max(10, currentRisk - 5);
      }
      
      deepWork = 100 - aiUsage;

      data.push({
        time: `Log ${index + 1}`,
        aiUsage: Math.round(aiUsage),
        deepWork: Math.round(deepWork),
        risk: Math.round(currentRisk)
      });
    });

    // Pad with empty data if we have very few logs to make the chart look good
    while (data.length < 5) {
      data.unshift({
        time: `Pre-Log`,
        aiUsage: 30,
        deepWork: 70,
        risk: 40
      });
    }

    setBurnoutData(data);
    setBurnoutRisk(Math.round(currentRisk));
  }, [activities, setBurnoutRisk]);

  // Dynamic burnout warning algorithm
  const burnoutWarning = useMemo(() => {
    if (activities.length === 0) return null;

    // Assuming activities[0] is the most recent
    let consecutiveLowEnergy = 0;
    const recentLobes: Record<string, number> = {};

    for (let i = 0; i < Math.min(5, activities.length); i++) {
      const act = activities[i];
      if (act.energyLevel <= 3 || act.focusLevel <= 3) {
        consecutiveLowEnergy++;
      } else {
        break; // Breaks consecutive chain
      }
    }

    for (let i = 0; i < Math.min(3, activities.length); i++) {
        const act = activities[i];
        recentLobes[act.lobe] = (recentLobes[act.lobe] || 0) + 1;
    }

    const dominantLobe = Object.keys(recentLobes).sort((a,b) => recentLobes[b] - recentLobes[a])[0] || 'Frontal';

    const getRecoveryAction = (lobe: string) => {
        switch (lobe) {
            case 'Frontal': return 'Close your eyes and do a 5-minute breathing exercise to rest your executive functions.';
            case 'Parietal': return 'Take a brief walk or stretch to reset spatial processing and bodily awareness.';
            case 'Occipital': return 'Look at objects at least 20 feet away for 20 seconds to relieve visual strain.';
            case 'Temporal': return 'Listen to calming, non-lyrical music to relax auditory and memory processing.';
            default: return 'Step away from the screen and take a short walk.';
        }
    };

    if (burnoutRisk >= 75) {
      if (consecutiveLowEnergy >= 3) {
        return {
          level: 'critical',
          color: 'red',
          title: 'Critical Exhaustion Warning',
          message: `You've logged ${consecutiveLowEnergy} consecutive low-energy sessions. Cognitive fraying is extremely high.`,
          action: getRecoveryAction(dominantLobe)
        };
      } else {
        return {
          level: 'high',
          color: 'orange',
          title: 'Elevated Burnout Risk',
          message: 'Your AI reliance has spiked while deep work has plummeted. Neurological fatigue is setting in.',
          action: `Take a 15-minute screen break. ${getRecoveryAction(dominantLobe)}`
        };
      }
    } else if (burnoutRisk >= 50 && consecutiveLowEnergy >= 2) {
        return {
            level: 'medium',
            color: 'amber',
            title: 'Energy Trend Warning',
            message: 'You are showing early signs of fatigue with repeated low energy/focus logs.',
            action: 'Try switching to a manual task or a different type of cognitive load before severe fatigue sets in.'
        };
    }

    return null;
  }, [activities, burnoutRisk]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="mb-8">
        <h2 className="text-2xl font-bold font-sans tracking-tight text-zinc-100 flex items-center gap-3">
          <Activity className="w-6 h-6 text-emerald-400" />
          Predictive Health Dashboard
        </h2>
        <p className="text-zinc-400 mt-2 font-sans font-medium">Long-term tracking, burnout prevention, and neuroplasticity.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Burnout Forecaster */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold font-sans tracking-tight text-zinc-100 flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${burnoutRisk > 70 ? 'text-red-400' : 'text-amber-400'}`} />
                <GlossaryTooltip 
                  term="Burnout Forecaster" 
                  definition="Calculates the risk of cognitive fraying based on consecutive low-energy task logs versus periods of necessary deep work and recovery."
                />
              </h3>
              <p className="text-sm font-mono text-zinc-400 mt-1">4-hour rolling average: AI Usage vs. Deep Work</p>
            </div>
            <div className={`text-3xl font-bold font-sans tracking-tight ${burnoutRisk > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
              {burnoutRisk}% <span className="text-sm font-mono font-normal text-zinc-500 uppercase tracking-widest">Risk</span>
            </div>
          </div>

          <div className="h-64 w-full" onMouseLeave={() => setHoveredActivityIndex(null)}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={burnoutData} 
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                onMouseMove={(e) => {
                  if (e && e.activeTooltipIndex !== undefined) {
                    setHoveredActivityIndex(e.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredActivityIndex(null)}
              >
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={burnoutRisk > 70 ? "#ef4444" : "#f59e0b"} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={burnoutRisk > 70 ? "#ef4444" : "#f59e0b"} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDeepWork" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#52525b" fontSize={12} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', zIndex: 100 }}
                  itemStyle={{ fontSize: '14px', fontFamily: '"JetBrains Mono", monospace' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                
                {/* Safe Zones / Burnout Thresholds */}
                <ReferenceArea y1={0} y2={40} fill="#10b981" fillOpacity={0.03} />
                <ReferenceArea y1={40} y2={70} fill="#f59e0b" fillOpacity={0.03} />
                <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.03} />

                <Legend />
                <Area type="monotone" dataKey="risk" name="Burnout / Stress Fraying margin" stroke={burnoutRisk > 70 ? "#ef4444" : "#f59e0b"} fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="deepWork" name="Deep Work Capacity" stroke="#10b981" fillOpacity={1} fill="url(#colorDeepWork)" strokeWidth={2} />
                <Line type="stepAfter" dataKey="aiUsage" name="AI Load" stroke="#ec4899" strokeWidth={2} dot={false} strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {burnoutWarning && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mt-6 p-4 border rounded-xl flex items-start gap-4 ${
                burnoutWarning.color === 'red' ? 'bg-red-500/10 border-red-500/20' : 
                burnoutWarning.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20' : 
                'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${
                burnoutWarning.color === 'red' ? 'text-red-400' : 
                burnoutWarning.color === 'orange' ? 'text-orange-400' : 'text-amber-400'
              }`} />
              <div>
                <h4 className={`font-semibold text-sm ${
                  burnoutWarning.color === 'red' ? 'text-red-300' : 
                  burnoutWarning.color === 'orange' ? 'text-orange-300' : 'text-amber-300'
                }`}>
                  {burnoutWarning.title}
                </h4>
                <p className={`text-sm mt-1 ${
                  burnoutWarning.color === 'red' ? 'text-red-200/80' : 
                  burnoutWarning.color === 'orange' ? 'text-orange-200/80' : 'text-amber-200/80'
                }`}>
                  {burnoutWarning.message}
                </p>
                <div className="mt-3 pt-3 border-t border-black/20 flex items-start gap-2">
                  <Activity className={`w-4 h-4 shrink-0 mt-0.5 ${
                    burnoutWarning.color === 'red' ? 'text-red-400/60' : 
                    burnoutWarning.color === 'orange' ? 'text-orange-400/60' : 'text-amber-400/60'
                  }`} />
                  <span className={`text-sm font-medium ${
                    burnoutWarning.color === 'red' ? 'text-red-100' : 
                    burnoutWarning.color === 'orange' ? 'text-orange-100' : 'text-amber-100'
                  }`}>
                    Action: {burnoutWarning.action}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Neuroplasticity Ledger */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold font-sans tracking-tight text-zinc-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              <GlossaryTooltip 
                term="Neuroplasticity Ledger" 
                definition="Visualizes your cognitive strengthening (from deep independent work) versus cognitive atrophy (from over-delegation to AI) across critical brain regions."
              />
            </h3>
            <p className="text-sm font-mono text-zinc-400 mt-1">Long-term cognitive strengthening vs. atrophy</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={neuroData}>
                <PolarGrid stroke="#3f3f46" />
                <PolarAngleAxis dataKey="lobe" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Independent Work (Strengthening)" dataKey="independent" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Radar name="AI Delegated (Atrophying)" dataKey="aiDelegated" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-400" /> Most Strengthened</div>
              <div className="text-sm font-medium text-zinc-200">
                {neuroData.reduce((prev, current) => (prev.independent > current.independent) ? prev : current).lobe.split(' ')[0]} Lobe
              </div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-amber-400" /> Most Atrophied</div>
              <div className="text-sm font-medium text-zinc-200">
                {neuroData.reduce((prev, current) => (prev.aiDelegated > current.aiDelegated) ? prev : current).lobe.split(' ')[0]} Lobe
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
