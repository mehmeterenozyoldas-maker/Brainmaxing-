import { useState } from 'react';
import { Settings, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCognitive } from '../context/CognitiveContext';

export function SettingsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { settings, updateSettings, burnoutRisk } = useCognitive();
  const [localSettings, setLocalSettings] = useState(settings);
  const isHighBurnout = burnoutRisk > 70;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`border rounded-none p-8 w-full max-w-md shadow-2xl relative ${isHighBurnout ? 'bg-[#1c1917] border-stone-700' : 'bg-zinc-950 border-zinc-700'}`}
          >
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 -translate-x-[2px] -translate-y-[2px] pointer-events-none opacity-50 z-10 transition-colors duration-500 border-zinc-500" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 translate-x-[2px] translate-y-[2px] pointer-events-none opacity-50 z-10 transition-colors duration-500 border-zinc-500" />

            <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
              <h2 className={`text-lg font-bold flex items-center gap-3 uppercase tracking-widest ${isHighBurnout ? 'text-stone-100' : 'text-zinc-100'}`}>
                <Settings className={`w-5 h-5 ${isHighBurnout ? 'text-amber-500' : 'text-zinc-400'}`} />
                Cognitive Profile
              </h2>
              <button onClick={onClose} className={`transition-colors ${isHighBurnout ? 'text-stone-400 hover:text-stone-100' : 'text-zinc-400 hover:text-zinc-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <label className={`block text-[10px] font-mono uppercase tracking-widest mb-3 ${isHighBurnout ? 'text-stone-400' : 'text-zinc-400'}`}>Default Activity Type</label>
                <select
                  value={localSettings.defaultActivityType}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultActivityType: e.target.value })}
                  className={`w-full border p-3 font-mono text-sm focus:outline-none transition-colors appearance-none ${isHighBurnout ? 'bg-[#292524] border-stone-700 text-stone-100 focus:border-amber-500' : 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-emerald-500'}`}
                >
                  <option value="Deep Work">Deep Work</option>
                  <option value="Interactive">Interactive</option>
                  <option value="Reading">Reading</option>
                  <option value="Rest">Rest / Recovery</option>
                  <option value="Spatial">Spatial / Movement</option>
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-mono uppercase tracking-widest mb-3 ${isHighBurnout ? 'text-stone-400' : 'text-zinc-400'}`}>AR Routing Style</label>
                <select
                  value={localSettings.arRoutingStyle}
                  onChange={(e) => setLocalSettings({ ...localSettings, arRoutingStyle: e.target.value as any })}
                  className={`w-full border p-3 font-mono text-sm focus:outline-none transition-colors appearance-none ${isHighBurnout ? 'bg-[#292524] border-stone-700 text-stone-100 focus:border-amber-500' : 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-emerald-500'}`}
                >
                  <option value="organic">Organic (Slime Mold)</option>
                  <option value="direct">Direct (Shortest Path)</option>
                  <option value="energy-saving">Energy Saving (Avoid Elevation)</option>
                </select>
                <p className={`text-[10px] font-mono mt-2 uppercase tracking-wide opacity-70 ${isHighBurnout ? 'text-stone-500' : 'text-zinc-500'}`}>Determines how the AI calculates spatial routes in AR mode.</p>
              </div>

              <div>
                <label className={`block flex justify-between items-center text-[10px] font-mono uppercase tracking-widest mb-3 ${isHighBurnout ? 'text-stone-400' : 'text-zinc-400'}`}>
                  <span>AI Intervention Threshold</span>
                  <span className={`font-bold ${isHighBurnout ? 'text-amber-500' : 'text-emerald-400'}`}>{localSettings.aiInterventionThreshold}%</span>
                </label>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={localSettings.aiInterventionThreshold}
                  onChange={(e) => setLocalSettings({ ...localSettings, aiInterventionThreshold: parseInt(e.target.value) })}
                  className={`w-full h-1 appearance-none cursor-pointer ${isHighBurnout ? 'accent-amber-500 bg-stone-700' : 'accent-emerald-400 bg-zinc-700'}`}
                />
                <div className={`flex justify-between text-[10px] font-mono mt-2 uppercase tracking-wide opacity-70 ${isHighBurnout ? 'text-stone-500' : 'text-zinc-500'}`}>
                  <span>Proactive</span>
                  <span>Reactive</span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-4">
              <button
                onClick={onClose}
                className={`px-4 py-2 text-[10px] uppercase font-mono tracking-widest transition-colors ${isHighBurnout ? 'text-stone-400 hover:text-stone-100 bg-transparent' : 'text-zinc-400 hover:text-zinc-100 bg-transparent'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`px-6 py-2 text-[10px] uppercase font-mono tracking-widest flex items-center gap-2 transition-colors relative z-20 ${isHighBurnout ? 'bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold' : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold'}`}
              >
                <Save className="w-4 h-4" />
                Commit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
