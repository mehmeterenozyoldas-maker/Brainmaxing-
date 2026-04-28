import { useState, useEffect, useRef } from "react";
import { useCognitive } from "../context/CognitiveContext";
import { motion } from "motion/react";
import { Radio, Activity, Zap } from "lucide-react";

export function BCIControlPanel() {
  const { bciState, updateBCIState, burnoutRisk } = useCognitive();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Adaptive colors
  const isHighBurnout = burnoutRisk > 70;
  const waveformColor = isHighBurnout ? "#fbbf24" : "#34d399"; // Amber vs Emerald
  const bgColor = isHighBurnout ? "#292524" : "#18181b"; // Stone vs Zinc

  // Local state for interactive sliders that immediately sync to global state
  const [localBandwidth, setLocalBandwidth] = useState(bciState.bandwidthAllocation);
  const [localThrottling, setLocalThrottling] = useState(bciState.visualThrottling);

  useEffect(() => {
    updateBCIState({ bandwidthAllocation: localBandwidth, visualThrottling: localThrottling });
  }, [localBandwidth, localThrottling, updateBCIState]);

  // Waveform visualization logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      
      // Clear canvas with trail effect
      ctx.fillStyle = isHighBurnout ? 'rgba(28, 25, 23, 0.3)' : 'rgba(24, 24, 27, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.strokeStyle = waveformColor;
      ctx.lineWidth = 2;

      // Draw Waveform
      for (let x = 0; x < canvas.width; x++) {
        // Base sine wave
        let y = Math.sin((x * 0.02) + time) * 30;
        
        // Add "Noise" if noise-canceling is OFF
        if (!bciState.noiseCancelingActive) {
          // The higher the bandwidth, the more chaotic the noise
          const noiseLevel = (localBandwidth / 100) * 40;
          y += (Math.random() - 0.5) * noiseLevel;
          // Add secondary frequency interference
          y += Math.sin((x * 0.1) - time * 2) * 15;
        } else {
          // If active, it's a clean alpha wave
          y += Math.sin((x * 0.01) + time * 0.5) * 5; 
        }

        // Center on y-axis
        const finalY = (canvas.height / 2) + y;

        if (x === 0) {
          ctx.moveTo(x, finalY);
        } else {
          ctx.lineTo(x, finalY);
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [bciState.noiseCancelingActive, localBandwidth, isHighBurnout, waveformColor]);

  return (
    <div className={`p-8 w-full max-w-7xl mx-auto space-y-8 ${isHighBurnout ? 'text-stone-100' : 'text-zinc-100'}`}>
      <header className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3 font-sans tracking-tight">
          <Radio className={`w-6 h-6 ${isHighBurnout ? 'text-amber-500' : 'text-emerald-400'}`} />
          Neural Engine Room
        </h2>
        <p className={`mt-2 ${isHighBurnout ? 'text-stone-400' : 'text-zinc-400'} font-sans`}>
          Direct modulation of Brain-Computer Interface parameters.
        </p>
      </header>

      <div className={`border ${isHighBurnout ? 'border-stone-800 bg-[#292524]' : 'border-zinc-800 bg-zinc-900'} rounded-2xl overflow-hidden shadow-xl`}>
        {/* Real-time EEG Waveform */}
        <div className="relative h-48 w-full border-b border-zinc-800/50">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={200} 
            className="w-full h-full"
            style={{ filter: bciState.noiseCancelingActive ? "drop-shadow(0 0 8px rgba(52, 211, 153, 0.4))" : "none" }}
          />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHighBurnout ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isHighBurnout ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span className={`text-[10px] font-mono tracking-widest uppercase ${isHighBurnout ? 'text-amber-400' : 'text-emerald-400'}`}>Live EEG Feed</span>
          </div>
          
          <div className="absolute bottom-4 left-4">
             <span className={`text-xs font-mono px-2 py-1 rounded bg-black/40 backdrop-blur-sm border ${bciState.noiseCancelingActive ? 'border-emerald-500/30 text-emerald-300' : 'border-zinc-600 text-zinc-400'}`}>
                State: {bciState.noiseCancelingActive ? 'Alpha Synced (Noise Canceled)' : 'High Frequency Beta (Noisy)'}
             </span>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 space-y-8">
           
           {/* Noise Canceling Toggle */}
           <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Neural Noise Canceling
                </h3>
                <p className="text-sm mt-1 opacity-70">Actively suppresses cognitive background noise to enhance focus.</p>
              </div>
              
              <button
                onClick={() => updateBCIState({ noiseCancelingActive: !bciState.noiseCancelingActive })}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                    bciState.noiseCancelingActive 
                    ? (isHighBurnout ? 'bg-amber-600' : 'bg-emerald-600') 
                    : 'bg-zinc-700'
                }`}
              >
                  <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                          bciState.noiseCancelingActive ? 'translate-x-7' : 'translate-x-1'
                      }`}
                  />
              </button>
           </div>

           {/* Bandwidth Slider */}
           <div>
              <div className="flex justify-between items-center mb-2">
                 <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    Cognitive Bandwidth Allocation ({localBandwidth}%)
                 </h3>
              </div>
              <p className="text-sm mb-4 opacity-70">Higher bandwidth allows more parallel background processing but increases neural load.</p>
              <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={localBandwidth}
                  onChange={(e) => setLocalBandwidth(parseInt(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isHighBurnout ? 'accent-amber-500 bg-stone-800' : 'accent-emerald-500 bg-zinc-800'}`}
              />
           </div>

           {/* Visual Throttling Slider */}
           <div>
              <div className="flex justify-between items-center mb-2">
                 <h3 className="font-semibold flex items-center gap-2">
                    <Radio className="w-4 h-4 text-pink-400" />
                    Visual Throttling / Reality Dimming ({localThrottling}%)
                 </h3>
              </div>
              <p className="text-sm mb-4 opacity-70">Dims and desaturates your visual field (AR/HUD) to force the brain to rely on internal rendering, forcing recovery.</p>
               <input
                  type="range"
                  min="0"
                  max="90"
                  step="10"
                  value={localThrottling}
                  onChange={(e) => setLocalThrottling(parseInt(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isHighBurnout ? 'accent-amber-500 bg-stone-800' : 'accent-pink-500 bg-zinc-800'}`}
              />
           </div>

        </div>
      </div>
    </div>
  );
}
