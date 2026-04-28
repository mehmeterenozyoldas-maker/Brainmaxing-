import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { motion } from "motion/react";
import { Niivue } from "@niivue/niivue";
import {
  Bot,
  Activity,
  Brain,
  Play,
  Pause,
  FastForward,
  Rewind,
  Video,
  Mic,
  Type,
  Layers,
  Sparkles,
  ShieldAlert,
  Rotate3D
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { BrainModel } from "./BrainModel";
import { GoogleGenAI } from "@google/genai";
import { SpatialPuzzle } from "./SpatialPuzzle";

import { useCognitive } from "../context/CognitiveContext";

const SUBJECTS = [
  { id: "Average", label: "Median Profile", baseActivations: { Frontal: 0.20, Parietal: 0.10, Occipital: 0.50, Temporal: 0.30, Cerebellum: 0.10 } },
  { id: "Sub01", label: "Sub-01 (Analytical)", baseActivations: { Frontal: 0.75, Parietal: 0.40, Occipital: 0.25, Temporal: 0.45, Cerebellum: 0.15 } },
  { id: "Sub02", label: "Sub-02 (Creative)", baseActivations: { Frontal: 0.35, Parietal: 0.65, Occipital: 0.80, Temporal: 0.40, Cerebellum: 0.20 } },
  { id: "Sub03", label: "Sub-03 (Burnout)", baseActivations: { Frontal: 0.10, Parietal: 0.15, Occipital: 0.85, Temporal: 0.20, Cerebellum: 0.50 } },
  { id: "Sub04", label: "Sub-04 (Flow State)", baseActivations: { Frontal: 0.60, Parietal: 0.60, Occipital: 0.40, Temporal: 0.60, Cerebellum: 0.30 } },
];
const MODALITIES = [
  { id: "all", label: "All", icon: Layers },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Mic },
  { id: "text", label: "Text", icon: Type },
];

export function TribeSimulation() {
  const { algorithmicDependency, setAlgorithmicDependency } = useCognitive();
  const [mode, setMode] = useState<"normal" | "inflated">("normal");
  const [view, setView] = useState<"normal" | "predicted" | "open">("predicted");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [modality, setModality] = useState("all");
  const [importedContent, setImportedContent] = useState<File | null>(null);

  // Simulation Parameters
  const [stimulusIntensity, setStimulusIntensity] = useState(0.5);
  const [cognitiveLoad, setCognitiveLoad] = useState(0.5);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImportedContent(event.target.files[0]);
    }
  };

  const [activeLobe, setActiveLobe] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showReflectivePrompt, setShowReflectivePrompt] = useState(false);
  const [reflectiveAnswer, setReflectiveAnswer] = useState("");
  const nvRef = useRef<Niivue | null>(null);

  useEffect(() => {
    if (view === "normal") {
      const initNiivue = async () => {
        // Wait a tick for the canvas to be in the DOM
        await new Promise(resolve => setTimeout(resolve, 50));
        const canvas = document.getElementById("gl-tribe") as HTMLCanvasElement;
        if (!canvas) return;

        try {
          if (!nvRef.current) {
            const nv = new Niivue({
              dragAndDropEnabled: false,
              backColor: [0.05, 0.05, 0.05, 1],
              show3Dcrosshair: false,
              isHighResolutionCapable: false,
            });
            nvRef.current = nv;
            nv.attachTo('gl-tribe');
            await nv.addVolumeFromUrl({
              url: 'https://niivue.github.io/niivue-demo-images/mni152.nii.gz',
              colorMap: 'gray',
            });
            nv.setSliceType(4); // 3D Render
          }
        } catch (e) {
          console.error("Failed to initialize Niivue in TribeSimulation:", e);
        }
      };
      initNiivue();
    }
  }, [view]);

  const handleLobeClick = (lobeId: string) => {
    setActiveLobe(activeLobe === lobeId ? null : lobeId);
  };

  const analyzeBrainState = async (type: 'analyze' | 'train') => {
    setIsAnalyzing(true);
    setAnalysisResult(""); // Start with empty string for streaming
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let contentParts: any[] = [];
      
      if (importedContent) {
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(importedContent);
        });
        
        contentParts.push({
          inlineData: {
            mimeType: importedContent.type,
            data: fileData.split(',')[1],
          },
        });
      }

      const prompt = type === 'analyze' 
        ? `Analyze the following predictive brain activity data for a subject exposed to ${modality} stimuli:
           Frontal Lobe: ${(activations.Frontal * 100).toFixed(1)}%
           Parietal Lobe: ${(activations.Parietal * 100).toFixed(1)}%
           Occipital Lobe: ${(activations.Occipital * 100).toFixed(1)}%
           Temporal Lobe: ${(activations.Temporal * 100).toFixed(1)}%
           Cerebellum: ${(activations.Cerebellum * 100).toFixed(1)}%
           
           ${importedContent ? "Also analyze the provided imported content." : ""}
           
           Provide a speculative, ethically ambiguous 2-paragraph analysis of what this cognitive state indicates about the subject's current mental load, their reliance on algorithmic offloading, and the potential for cognitive atrophy or loss of independent thought. Question whether this state is a natural evolution or a dangerous dependency.`
        : `Based on the following predictive brain activity data for a subject exposed to ${modality} stimuli:
           Frontal Lobe: ${(activations.Frontal * 100).toFixed(1)}%
           Parietal Lobe: ${(activations.Parietal * 100).toFixed(1)}%
           Occipital Lobe: ${(activations.Occipital * 100).toFixed(1)}%
           Temporal Lobe: ${(activations.Temporal * 100).toFixed(1)}%
           Cerebellum: ${(activations.Cerebellum * 100).toFixed(1)}%
           
           ${importedContent ? "Also consider the provided imported content." : ""}
           
           Generate a speculative, slightly unsettling 2-paragraph "cognitive training" protocol. This protocol should aim to "optimize" the subject's neural pathways, but hint at the cost of this optimization—perhaps a loss of emotional resonance, increased susceptibility to suggestion, or a blurring of the line between human thought and machine instruction. Frame it as a necessary, if uncomfortable, upgrade.`;

      contentParts.push({ text: prompt });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: { parts: contentParts },
      });
      
      let fullText = "";
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        setAnalysisResult(fullText);
      }
      
      if (type === 'analyze') {
        setHasAnalyzed(true);
      }
      setAlgorithmicDependency(prev => Math.min(100, prev + 15));
    } catch (error) {
      console.error("Error analyzing brain state:", error);
      setAnalysisResult("Failed to generate analysis. Please ensure API key is configured or imported content is valid.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Simulation loop (only handles progress now)
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();
    let lastUpdate = performance.now();

    const animate = (time: number) => {
      if (isPlaying) {
        const deltaTime = time - lastTime;
        lastTime = time;

        // Throttle React state updates to ~30fps to keep UI responsive
        if (time - lastUpdate > 33) {
          lastUpdate = time;

          setProgress((p) => {
            const next = p + deltaTime * 0.05;
            return next > 100 ? 0 : next;
          });
        }
      }
      animationFrame = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(parseFloat(e.target.value));
  };

  const switchTab = (tab: string) => {
    const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`) as HTMLButtonElement;
    if (btn) btn.click();
  };

  // Dynamic brain activity state factoring in the subject baseline, modality, sliders, and timeline wobble
  const activations = useMemo(() => {
    const base = subject.baseActivations;
    let visualMult = 1, audioMult = 1, textMult = 1;
    if (modality === 'video') { visualMult = 1.3; audioMult = 1.1; textMult = 0.8; }
    if (modality === 'audio') { audioMult = 1.4; visualMult = 0.7; textMult = 0.6; }
    if (modality === 'text') { textMult = 1.3; visualMult = 0.9; audioMult = 0.7; }

    const wobble = (offset: number) => Math.sin(progress * 0.1 + offset) * 0.05;

    return {
      Frontal: Math.min(1, Math.max(0, base.Frontal * textMult * (0.5 + cognitiveLoad) + wobble(1))),
      Parietal: Math.min(1, Math.max(0, base.Parietal * visualMult * (0.5 + cognitiveLoad) + wobble(2))),
      Occipital: Math.min(1, Math.max(0, base.Occipital * visualMult * (0.5 + stimulusIntensity) + wobble(3))),
      Temporal: Math.min(1, Math.max(0, base.Temporal * audioMult * (0.5 + stimulusIntensity) + wobble(4))),
      Cerebellum: Math.min(1, Math.max(0, base.Cerebellum * (0.8 + (stimulusIntensity * 0.4)) + wobble(5))),
    };
  }, [subject, modality, stimulusIntensity, cognitiveLoad, progress]);

  return (
    <div className="h-full flex flex-col bg-zinc-50 text-zinc-900 overflow-hidden pointer-events-auto relative z-10 font-sans">
      {/* Top Navigation Bar (Mockup Style) */}
      <div className="flex items-center justify-center gap-8 py-3 bg-white border-b border-zinc-300 pointer-events-auto">
        <button 
          onClick={() => switchTab('dashboard')}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest"
        >
          Cognitive Dashboard
        </button>
        <button 
          onClick={() => switchTab('brain3d')}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest"
        >
          Digital Brain
        </button>
        <div className="relative">
          <button className="text-xs font-bold text-zinc-900 bg-zinc-200 px-4 py-1.5 uppercase tracking-widest">Advanced Mode</button>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-none"></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 lg:p-8 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 pointer-events-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-300 pb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 tracking-tight text-zinc-900">
              <Bot className="w-6 h-6 text-zinc-900" />
              TRIBE v2 Simulation
            </h2>
            <p className="text-zinc-500 mt-2 text-xs font-mono uppercase tracking-widest">
              Towards Artificial Brains: Multimodal response prediction
            </p>
          </div>

          <div className="flex items-center gap-6 overflow-x-auto max-w-full scrollbar-none pb-1">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubject(s)}
                className={`text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${
                  subject.id === s.id
                    ? "text-zinc-900 font-bold border-b-2 border-zinc-900 pb-1"
                    : "text-zinc-400 hover:text-zinc-900 font-medium pb-1"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 pointer-events-auto border border-zinc-300 bg-white">
          {/* Left Sidebar: Controls & Modalities */}
          <div className="lg:col-span-2 space-y-8 flex flex-col overflow-y-auto p-6 border-r border-zinc-300 scrollbar-thin scrollbar-thumb-zinc-200 pointer-events-auto">
            <div>
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">
                Modality
              </h3>
              <div className="space-y-0 border-t border-zinc-200">
                {MODALITIES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setModality(m.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 border-b border-zinc-200 transition-colors relative z-20 pointer-events-auto ${
                        modality === m.id
                          ? "bg-zinc-900 text-white"
                          : "bg-transparent text-zinc-500 hover:bg-zinc-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-mono uppercase tracking-wider">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">
                Content Import
              </h3>
              <input
                type="file"
                onChange={handleFileImport}
                className="hidden"
                id="file-import"
                accept="audio/*,video/*,text/*"
              />
              <label
                htmlFor="file-import"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-50 border border-dashed border-zinc-300 text-zinc-500 cursor-pointer hover:bg-zinc-100 hover:text-zinc-900 transition-colors relative z-20 pointer-events-auto"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-wider truncate">
                  {importedContent ? importedContent.name : "Import Content"}
                </span>
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-200">
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">
                Sim Tuning
              </h3>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Stimulus Intensity</span>
                  <span className="text-[10px] font-mono text-zinc-900">{(stimulusIntensity * 100).toFixed(0)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={stimulusIntensity}
                    onChange={(e) => setStimulusIntensity(parseFloat(e.target.value))}
                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer bg-zinc-300 accent-zinc-900 relative z-20 pointer-events-auto`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Cognitive Load</span>
                  <span className="text-[10px] font-mono text-zinc-900">{(cognitiveLoad * 100).toFixed(0)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={cognitiveLoad}
                    onChange={(e) => setCognitiveLoad(parseFloat(e.target.value))}
                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer bg-zinc-300 accent-zinc-900 relative z-20 pointer-events-auto`}
                />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-4">
                Region Activity
              </h3>
              <div className={`space-y-4 ${algorithmicDependency > 80 ? 'animate-pulse' : ''}`}>
                {Object.entries(activations).map(([region, value]) => (
                  <div key={region} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-zinc-500 text-[10px] uppercase tracking-widest">{region}</span>
                      <span className={`text-zinc-900 font-mono text-xs ${algorithmicDependency > 90 ? 'blur-[1px]' : ''}`}>
                        {(value * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-[2px] w-full bg-zinc-200 overflow-hidden">
                      <motion.div
                        className={`h-full ${algorithmicDependency > 70 ? 'bg-red-500' : 'bg-zinc-900'}`}
                        animate={{ width: `${value * 100}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        {/* Center: 3D Brain Viewer */}
        <div className="lg:col-span-7 bg-zinc-50 p-6 flex flex-col relative overflow-hidden border-r border-zinc-300">
          <div className="flex justify-between items-center mb-6 z-10 relative">
            <div className="flex gap-4">
              <button
                onClick={() => setView("normal")}
                className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                  view === "normal"
                    ? "text-zinc-900 font-bold border-b border-zinc-900 pb-1"
                    : "text-zinc-400 hover:text-zinc-900 pb-1"
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setView("predicted")}
                className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                  view === "predicted"
                    ? "text-zinc-900 font-bold border-b border-zinc-900 pb-1"
                    : "text-zinc-400 hover:text-zinc-900 pb-1"
                }`}
              >
                Predicted
              </button>
              <button
                onClick={() => setView("open")}
                className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                  view === "open"
                    ? "text-zinc-900 font-bold border-b border-zinc-900 pb-1"
                    : "text-zinc-400 hover:text-zinc-900 pb-1"
                }`}
              >
                Open
              </button>
            </div>

            <button
              onClick={() => setMode(mode === "normal" ? "inflated" : "normal")}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-zinc-300 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              {mode === "normal" ? "Inflate" : "Deflate"}
            </button>
          </div>

          {activeLobe && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-20 left-6 z-10 bg-white p-4 border border-zinc-300 shadow-sm max-w-[240px]"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-red-500 animate-pulse" />
                <h4 className="text-zinc-900 font-mono text-[10px] uppercase tracking-widest">{activeLobe} Lobe</h4>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Activity</span>
                  <span className="font-mono text-xs text-zinc-900">{(activations[activeLobe as keyof typeof activations] * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-[2px] bg-zinc-200 overflow-hidden mt-1">
                  <div 
                    className="h-full bg-zinc-900 transition-all duration-300"
                    style={{ width: `${activations[activeLobe as keyof typeof activations] * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex-1 relative -mx-6 bg-zinc-100 border-y border-zinc-300">
            {view === "normal" ? (
              <div className={`w-full h-full relative bg-black ${algorithmicDependency > 80 ? 'animate-pulse' : ''}`}>
                <canvas id="gl-tribe" className={`w-full h-full outline-none ${algorithmicDependency > 90 ? 'blur-[2px] contrast-150' : ''}`} />
                <div className="absolute bottom-4 left-4 text-[10px] font-mono text-zinc-400 uppercase tracking-widest bg-black/80 px-3 py-1.5 border border-zinc-800">
                  Realistic MRI Volume Render
                </div>
              </div>
            ) : (
              <div className={`w-full h-full ${algorithmicDependency > 80 ? 'animate-pulse' : ''}`}>
                <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.5], fov: 45 }} className={algorithmicDependency > 90 ? 'blur-[1px] contrast-125' : ''}>
                  <Suspense fallback={null}>
                    <ambientLight intensity={1.5} />
                    <pointLight position={[10, 10, 10]} intensity={2.0} />
                    <pointLight
                      position={[-10, -10, -10]}
                      intensity={1.0}
                      color="#e5e5e5"
                    />
                    <directionalLight position={[0, 5, 5]} intensity={1.0} />
                    <BrainModel
                      activeLobe={activeLobe}
                      mode="simulation"
                      viewState={view as any}
                      dailyActivations={activations}
                      wireframe={mode === "inflated"}
                      onLobeClick={handleLobeClick}
                    />
                    <OrbitControls
                      enableZoom={true}
                      enablePan={false}
                      autoRotate={!isPlaying}
                      autoRotateSpeed={0.5}
                    />
                  </Suspense>
                </Canvas>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="mt-6 pt-6 flex items-center gap-6">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-white transition-colors flex-shrink-0 relative z-20 pointer-events-auto"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <div className="flex-1 flex items-center gap-4">
              <span className="text-[10px] text-zinc-500 font-mono w-8">00:{(progress * 0.6).toFixed(0).padStart(2, "0")}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleProgressChange}
                className="flex-1 h-[2px] bg-zinc-300 appearance-none cursor-pointer accent-zinc-900 relative z-20 pointer-events-auto"
              />
              <span className="text-[10px] text-zinc-500 font-mono w-8">01:00</span>
            </div>
          </div>
        </div>
        {/* Right Sidebar: Analysis & Training Panel */}
        <div className="lg:col-span-3 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 p-6 bg-white pointer-events-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-zinc-900" />
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-900">
                System Analysis
              </h3>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Dep:</span>
               <span className={`text-xs font-mono ${algorithmicDependency > 50 ? 'text-red-500' : 'text-zinc-900'} ${algorithmicDependency > 80 ? 'animate-pulse' : ''} ${algorithmicDependency > 90 ? 'blur-[1px]' : ''}`}>
                 {algorithmicDependency}%
               </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 mb-6 border-b border-zinc-200 pb-6">
            <button
              onClick={() => analyzeBrainState('analyze')}
              disabled={isAnalyzing}
              className="w-full py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-300 relative z-20 pointer-events-auto"
            >
              Analyze State
            </button>
            <button
              onClick={() => analyzeBrainState('train')}
              disabled={isAnalyzing || !hasAnalyzed}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed relative z-20 pointer-events-auto"
              title={!hasAnalyzed ? "Perform analysis first" : ""}
            >
              Generate Training
            </button>
            <button
              onClick={() => {
                setAlgorithmicDependency(prev => Math.max(0, prev - 30));
                setShowPuzzle(true);
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center justify-center relative z-20 pointer-events-auto"
            >
              Execute Resistance
            </button>
            <button
              onClick={() => setShowPuzzle(true)}
              className="w-full py-2.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center justify-center relative z-20 pointer-events-auto"
            >
              Cognitive Reset
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {isAnalyzing && (!analysisResult || analysisResult.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="animate-spin rounded-none h-6 w-6 border-2 border-zinc-200 border-t-zinc-900"></div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Processing...</p>
              </div>
            ) : analysisResult ? (
              <div className={`bg-zinc-50 border border-zinc-300 p-5 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 ${algorithmicDependency > 70 ? 'animate-pulse' : ''}`}>
                <div className={`text-zinc-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap ${algorithmicDependency > 85 ? 'blur-[1px] opacity-80' : ''}`}>
                  {analysisResult}
                  {isAnalyzing && (
                    <span className="inline-block w-2 h-4 ml-1 bg-zinc-900 animate-pulse align-middle"></span>
                  )}
                </div>
                {algorithmicDependency > 70 && !isAnalyzing && (
                  <div className="mt-4 p-2 bg-red-100 border border-red-300 text-red-800 text-[10px] font-mono uppercase tracking-widest">
                    Warning: High Algorithmic Dependency Detected. Analysis may be compromised by system bias.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-transparent border border-dashed border-zinc-300 p-6 text-center h-full flex flex-col items-center justify-center">
                <Brain className="w-8 h-8 text-zinc-300 mb-3" />
                <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                  Select <span className="text-zinc-900 font-bold">Analyze State</span> or <span className="text-zinc-900 font-bold">Training</span> to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      {showPuzzle && <SpatialPuzzle onClose={() => { setShowPuzzle(false); setShowReflectivePrompt(true); }} />}
      
      {/* Reflective Prompt Overlay */}
      {showReflectivePrompt && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto">
          <div className="bg-zinc-50 border border-zinc-300 p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-900 mb-4 border-b border-zinc-300 pb-2">Reflective Inquiry</h3>
            <p className="text-zinc-600 mb-6 text-xs font-mono leading-relaxed">
              Did visualizing your cognitive load and completing the spatial puzzle change how you feel right now?
            </p>
            <textarea
              value={reflectiveAnswer}
              onChange={(e) => setReflectiveAnswer(e.target.value)}
              className="w-full h-32 p-3 bg-white border border-zinc-300 mb-4 resize-none focus:outline-none focus:border-zinc-900 text-xs font-mono text-zinc-800"
              placeholder="Record your qualitative experience..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReflectivePrompt(false);
                  setReflectiveAnswer("");
                }}
                className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  console.log("Qualitative Data Logged:", reflectiveAnswer);
                  setShowReflectivePrompt(false);
                  setReflectiveAnswer("");
                }}
                className="px-4 py-2 bg-zinc-900 text-white text-[10px] font-mono uppercase tracking-widest hover:bg-zinc-800 transition-colors"
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
