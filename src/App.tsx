/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Settings,
  BrainCircuit,
  Activity,
  Users,
  LineChart,
  Route,
  BookOpen,
  Wind,
  Radio,
  Glasses,
  Bot,
} from "lucide-react";
import { ARView } from "./components/ARView";
import { ChatInterface } from "./components/ChatInterface";
import { PredictiveHealth } from "./components/PredictiveHealth";
import { CollectiveIntelligence } from "./components/CollectiveIntelligence";
import { ActivityDiary } from "./components/ActivityDiary";
import { SettingsPanel } from "./components/SettingsPanel";
import { BCIControlPanel } from "./components/BCIControlPanel";
import { CognitiveContextualizer } from "./components/CognitiveContextualizer";
import { TribeSimulation } from "./components/TribeSimulation";
import { useCognitive } from "./context/CognitiveContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

type ViewMode =
  | "router"
  | "health"
  | "team"
  | "diary"
  | "bci"
  | "context"
  | "tribe";

export default function App() {
  const [isARActive, setIsARActive] = useState(false);
  const [arMode, setArMode] = useState<"router" | "recovery">("router");
  const [arPoints, setArPoints] = useState<
    { start: [number, number, number]; end: [number, number, number] }[]
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>("router");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  
  // Collapse states for Focus Mode / AR Immersion
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const { bciState, burnoutRisk } = useCognitive();

  useEffect(() => {
    const handleViewModeChange = (event: any) => {
      setViewMode(event.detail as ViewMode);
    };
    const handleFocusDrop = () => {
      setShowFocusWarning(true);
      setTimeout(() => setShowFocusWarning(false), 2000);
    };
    window.addEventListener('viewModeChanged', handleViewModeChange);
    window.addEventListener('focusDropWarning', handleFocusDrop);
    return () => {
      window.removeEventListener('viewModeChanged', handleViewModeChange);
      window.removeEventListener('focusDropWarning', handleFocusDrop);
    };
  }, []);

  const handleARAction = (action: "route" | "recovery") => {
    setViewMode("router");
    setIsARActive(true);
    setArMode(action === "route" ? "router" : "recovery");

    // Automatically collapse panels for maximum AR immersion
    setIsSidebarOpen(false);
    setIsChatOpen(false);

    if (action === "route") {
      const newPoints = Array.from({ length: 3 }).map(() => ({
        start: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ] as [number, number, number],
        end: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ] as [number, number, number],
      }));
      setArPoints(newPoints);
    }
  };

  // Adaptive Theming Variables
  const isHighBurnout = burnoutRisk > 70;
  
  // Base Colors
  const bgMainColor = isHighBurnout ? "bg-[#1c1917]" : "bg-zinc-950"; // warm stone vs cool zinc
  const borderMainColor = isHighBurnout ? "border-[#292524]" : "border-zinc-800";
  const bgPanelColor = isHighBurnout ? "bg-[#1c1917]" : "bg-zinc-950";
  const textMuted = isHighBurnout ? "text-stone-500" : "text-zinc-500";
  const textPrimary = isHighBurnout ? "text-stone-100" : "text-zinc-100";
  
  // Accents
  const accentIconActive = isHighBurnout ? "text-amber-500" : "text-emerald-400";
  const accentBgActive = isHighBurnout ? "bg-amber-500/10" : "bg-emerald-500/10";
  const accentIconHover = isHighBurnout ? "hover:text-amber-400 hover:bg-[#292524]" : "hover:text-zinc-300 hover:bg-zinc-900";

  return (
    <div className={`flex h-screen w-full ${bgMainColor} ${textPrimary} font-sans overflow-hidden relative transition-colors duration-1000`}>
      {/* Focus Drop Warning Overlay */}
      <div 
        className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-1000 ${showFocusWarning ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: 'rgba(251, 146, 60, 0.08)' }}
      />

      {/* Sidebar Navigation */}
      <div 
        className={`${isSidebarOpen ? 'w-16 translate-x-0' : 'w-0 -translate-x-16 opacity-0'} flex-shrink-0 h-full ${bgPanelColor} border-r ${borderMainColor} flex flex-col items-center py-4 gap-6 z-20 transition-all duration-500`}
      >
        <div className={`p-2 rounded-xl transition-colors duration-1000 ${accentBgActive} ${accentIconActive}`}>
          <BrainCircuit className="w-6 h-6" />
        </div>

        <div className="flex flex-col gap-4 mt-4 w-full px-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setViewMode("router")}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${viewMode === "router" ? `${accentBgActive} ${accentIconActive}` : `${textMuted} ${accentIconHover}`}`}
            title="Slime Mold Router"
          >
            <Route className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setViewMode("diary")}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${viewMode === "diary" ? `${accentBgActive} ${accentIconActive}` : `${textMuted} ${accentIconHover}`}`}
            title="Activity Diary"
          >
            <BookOpen className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setViewMode("health")}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${viewMode === "health" ? `${accentBgActive} ${accentIconActive}` : `${textMuted} ${accentIconHover}`}`}
            title="Predictive Health"
          >
            <LineChart className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setViewMode("team")}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${viewMode === "team" ? `${accentBgActive} ${accentIconActive}` : `${textMuted} ${accentIconHover}`}`}
            title="Collective Intelligence"
          >
            <Users className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setViewMode("bci")}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${viewMode === "bci" ? `${accentBgActive} ${accentIconActive}` : `${textMuted} ${accentIconHover}`}`}
            title="Neural Integration (BCI)"
          >
            <Radio className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setViewMode("context")}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${viewMode === "context" ? `${accentBgActive} ${accentIconActive}` : `${textMuted} ${accentIconHover}`}`}
            title="Cognitive Contextualizer"
          >
            <Glasses className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setViewMode("tribe")}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${viewMode === "tribe" ? `${accentBgActive} ${accentIconActive}` : `${textMuted} ${accentIconHover}`}`}
            title="Tribe V2 Simulation"
          >
            <Bot className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="mt-auto w-full px-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsSettingsOpen(true)}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors duration-300 ${textMuted} hover:text-zinc-300`}
            title="Cognitive Profile Settings"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Left Panel: Cognitive Regulation Chat */}
      <div className={`transition-all duration-500 ease-in-out ${isChatOpen ? 'w-full md:w-1/3 lg:w-1/4 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0'} h-full border-r ${borderMainColor} flex flex-col ${isHighBurnout ? 'bg-[#292524]/50' : 'bg-zinc-900/50'} relative z-10 overflow-hidden shrink-0`}>
        <div className={`p-4 border-b ${borderMainColor} ${bgPanelColor} flex justify-between items-center`}>
          <div>
            <h1 className="font-semibold tracking-tight text-lg">
              {viewMode === "router" && "Cognitive Router"}
              {viewMode === "diary" && "Activity Diary"}
              {viewMode === "health" && "Predictive Health"}
              {viewMode === "team" && "Team Sync"}
              {viewMode === "bci" && "Neural Integration"}
              {viewMode === "context" && "Cognitive Contextualizer"}
              {viewMode === "tribe" && "Tribe V2 Simulation"}
            </h1>
            <p className={`text-xs ${textMuted} mt-1`}>
              {viewMode === "router" && "Slime Mold AR & Regulation"}
              {viewMode === "diary" && "Neural Analysis & Logging"}
              {viewMode === "health" && "Burnout & Neuroplasticity"}
              {viewMode === "team" && "Capacity & Collaboration"}
              {viewMode === "bci" && "Deep-Future BCI Bandwidth"}
              {viewMode === "context" && "Ambient Wearable Context"}
              {viewMode === "tribe" && "Multi-Agent Social Ecosystem"}
            </p>
          </div>
          <button 
            onClick={() => {
              setIsChatOpen(false);
              setIsSidebarOpen(false);
            }} 
            className={`p-2 rounded-lg ${textMuted} hover:text-white transition-colors`}
            title="Focus Mode"
          >
            <Wind className="w-4 h-4" />
          </button>
        </div>

        <ChatInterface onARAction={handleARAction} />
      </div>

      {/* Right Panel: Dynamic Content */}
      <div className={`flex-1 h-full relative ${bgMainColor} overflow-y-auto transition-colors duration-1000`}>
        
        {/* Toggle Expand Button - only visible when panels are collapsed */}
        {(!isSidebarOpen || !isChatOpen) && (
           <button 
             onClick={() => {
               setIsSidebarOpen(true);
               setIsChatOpen(true);
             }}
             className={`absolute top-4 left-4 z-50 p-3 rounded-full ${bgPanelColor} border ${borderMainColor} shadow-lg ${textMuted} hover:text-white transition-all hover:scale-105`}
             title="Exit Focus Mode"
           >
             <BrainCircuit className="w-5 h-5" />
           </button>
        )}

        {/* BCI Visual Throttling Overlay */}
        {bciState.noiseCancelingActive && bciState.visualThrottling > 0 && (
          <div
            className="absolute inset-0 z-40 pointer-events-none transition-all duration-1000 flex items-start justify-center pt-8"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${(bciState.visualThrottling / 100) * 0.4})`,
              backdropFilter: `blur(${(bciState.visualThrottling / 100) * 4}px) grayscale(${(bciState.visualThrottling / 100) * 80}%)`,
              backgroundImage: `linear-gradient(translate-y-8, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, ${(bciState.visualThrottling / 100) * 0.1}) 50%)`,
              backgroundSize: '100% 4px',
            }}
          >
            {bciState.visualThrottling > 50 && (
              <div className="bg-zinc-900/80 text-zinc-400 text-xs px-3 py-1 rounded-full border border-zinc-800 backdrop-blur-md animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                BCI Visual Throttling Active ({bciState.visualThrottling}%) - Neural Lag Simulated
              </div>
            )}
          </div>
        )}

        {viewMode === "router" && (
          <>
            <div className="absolute top-4 left-4 z-10">
              <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg p-3 flex items-center gap-3 shadow-xl">
                {arMode === "router" ? (
                  <Activity
                    className={`w-5 h-5 ${isARActive ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`}
                  />
                ) : (
                  <Wind
                    className={`w-5 h-5 ${isARActive ? "text-blue-400 animate-pulse" : "text-zinc-500"}`}
                  />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {isARActive ? "AR Active" : "AR View Standby"}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {arMode === "router"
                      ? "Slime Mold Routing Engine"
                      : "Cognitive Recovery Mode"}
                  </div>
                </div>
              </div>
            </div>

            <ARView isActive={isARActive} mode={arMode} points={arPoints} />

            {!isARActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-zinc-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>
                    Press "Scan Space & Auto-Route" or "Initiate Cognitive
                    Reset" to begin
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === "diary" && <ActivityDiary />}
        {viewMode === "health" && <PredictiveHealth />}
        {viewMode === "team" && <CollectiveIntelligence />}
        {viewMode === "context" && <CognitiveContextualizer />}
        {viewMode === "tribe" && <TribeSimulation />}
      </div>
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
