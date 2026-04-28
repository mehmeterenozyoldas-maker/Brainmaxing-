import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Niivue } from '@niivue/niivue';
import { Brain, Layers, Palette, Maximize, Database, Activity, MonitorPlay, DownloadCloud, Glasses, X } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { BrainModel } from './BrainModel';

const DATASETS = [
  { id: 'mni152', name: 'MNI152 Standard Space', url: 'https://niivue.github.io/niivue-demo-images/mni152.nii.gz', type: 'T1w' },
  { id: 'chris_t1', name: 'Clinical T1 Scan', url: 'https://niivue.github.io/niivue-demo-images/chris_t1.nii.gz', type: 'T1w' },
  { id: 'chris_t2', name: 'Clinical T2 Scan', url: 'https://niivue.github.io/niivue-demo-images/chris_t2.nii.gz', type: 'T2w' }
];

const COLOR_MAPS = ['gray', 'turbo', 'magma', 'viridis', 'inferno', 'bone'];

const store = createXRStore();

export function MRIAnalysis() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<Niivue | null>(null);
  
  const [activeDataset, setActiveDataset] = useState(DATASETS[0]);
  const [sliceType, setSliceType] = useState<number>(3); // 3 is multiplanar
  const [colorMap, setColorMap] = useState<string>('gray');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isARMode, setIsARMode] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    try {
      // Initialize Niivue
      const nv = new Niivue({
        dragAndDropEnabled: true,
        backColor: [0.05, 0.05, 0.05, 1],
        show3Dcrosshair: true,
        crosshairColor: [1, 0.3, 0.3, 0.8],
        textHeight: 0.04,
        colorbarHeight: 0.05,
        isHighResolutionCapable: false,
        multiplanarForceRender: true,
      });
      
      nvRef.current = nv;
      nv.attachTo('gl');

      const loadVolume = async () => {
        setIsLoading(true);
        setError(null);
        try {
          await nv.addVolumeFromUrl({
            url: activeDataset.url,
            colorMap: colorMap,
          });
          nv.setSliceType(sliceType);
        } catch (e: any) {
          console.error("Failed to load volume:", e);
          setError(e.message || "Failed to load volume");
        } finally {
          setIsLoading(false);
        }
      };
      
      loadVolume();
    } catch (e: any) {
      console.error("Failed to initialize Niivue:", e);
      setError("WebGL2 is not supported or failed to initialize.");
      setIsLoading(false);
    }

    return () => {
      // Cleanup if needed
    };
  }, []); // Run once on mount

  // Handle dataset change
  useEffect(() => {
    const loadNewVolume = async () => {
      if (!nvRef.current) return;
      setIsLoading(true);
      try {
        nvRef.current.volumes = []; // Clear existing
        await nvRef.current.addVolumeFromUrl({
          url: activeDataset.url,
          colorMap: colorMap,
        });
      } catch (e) {
        console.error("Failed to load new volume:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Skip initial load since the first useEffect handles it
    if (nvRef.current && nvRef.current.volumes.length > 0 && nvRef.current.volumes[0].name !== activeDataset.url.split('/').pop()) {
      loadNewVolume();
    }
  }, [activeDataset]);

  const handleSliceTypeChange = (type: number) => {
    if (nvRef.current) {
      nvRef.current.setSliceType(type);
      setSliceType(type);
    }
  };

  const handleColorMapChange = (cmap: string) => {
    if (nvRef.current && nvRef.current.volumes.length > 0) {
      nvRef.current.volumes[0].colorMap = cmap;
      nvRef.current.updateGLVolume();
      setColorMap(cmap);
    }
  };

  const switchTab = (tab: string) => {
    const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`) as HTMLButtonElement;
    if (btn) btn.click();
  };

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
              <Activity className="w-6 h-6 text-zinc-900" />
              NeuroImaging
            </h2>
            <p className="text-zinc-500 mt-2 text-xs font-mono uppercase tracking-widest">
              Powered by Niivue & OpenNeuro
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 pointer-events-auto border border-zinc-300 bg-white">
          {/* Left Sidebar: Controls */}
          <div className="lg:col-span-3 space-y-8 flex flex-col overflow-y-auto p-6 border-r border-zinc-300 scrollbar-thin scrollbar-thumb-zinc-200 pointer-events-auto">
            
            {/* Datasets */}
            <div>
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Database className="w-3 h-3" />
                OpenNeuro Datasets
              </h3>
              <div className="space-y-0 border-t border-zinc-200">
                {DATASETS.map(ds => (
                  <button
                    key={ds.id}
                    onClick={() => setActiveDataset(ds)}
                    className={`w-full flex flex-col items-start px-3 py-3 border-b border-zinc-200 transition-colors relative z-20 pointer-events-auto ${
                      activeDataset.id === ds.id 
                        ? "bg-zinc-900 text-white" 
                        : "bg-transparent text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="font-mono text-xs uppercase tracking-wider">{ds.name}</div>
                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${activeDataset.id === ds.id ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      <DownloadCloud className="w-3 h-3" /> {ds.type}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rendering Mode */}
            <div>
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MonitorPlay className="w-3 h-3" />
                Rendering Mode
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 3, label: 'Multiplanar' },
                  { id: 4, label: '3D Render' },
                  { id: 0, label: 'Axial' },
                  { id: 1, label: 'Coronal' },
                  { id: 2, label: 'Sagittal' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => handleSliceTypeChange(mode.id)}
                    className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors border ${
                      sliceType === mode.id
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900'
                    } ${mode.id === 3 ? 'col-span-2' : ''}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Maps */}
            <div>
              <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Palette className="w-3 h-3" />
                Color Maps
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_MAPS.map(cmap => (
                  <button
                    key={cmap}
                    onClick={() => handleColorMapChange(cmap)}
                    className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors border ${
                      colorMap === cmap
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    {cmap}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Viewer Area */}
          <div className="lg:col-span-9 bg-zinc-50 p-6 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10 relative">
              <div className="flex gap-4">
                <button
                  onClick={() => setIsARMode(false)}
                  className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                    !isARMode
                      ? "text-zinc-900 font-bold border-b border-zinc-900 pb-1"
                      : "text-zinc-400 hover:text-zinc-900 pb-1"
                  }`}
                >
                  Standard View
                </button>
                <button
                  onClick={() => setIsARMode(true)}
                  className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                    isARMode
                      ? "text-zinc-900 font-bold border-b border-zinc-900 pb-1"
                      : "text-zinc-400 hover:text-zinc-900 pb-1"
                  }`}
                >
                  AR Mode
                </button>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                <Brain className="w-3 h-3" />
                {activeDataset.name}
              </div>
            </div>

            <div className="flex-1 relative border border-zinc-300 bg-black overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                    <span className="text-white font-mono text-xs uppercase tracking-widest animate-pulse">Loading Volume Data...</span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                  <div className="text-center p-6 border border-red-500/30 bg-red-500/10 max-w-md">
                    <X className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <h3 className="text-red-500 font-mono text-sm uppercase tracking-widest mb-2">Initialization Error</h3>
                    <p className="text-zinc-400 text-xs">{error}</p>
                  </div>
                </div>
              )}

              {/* Niivue Canvas */}
              <canvas 
                id="gl" 
                ref={canvasRef}
                className={`w-full h-full outline-none ${isARMode ? 'hidden' : 'block'}`}
              />
              
              {/* Instructions Overlay */}
              {!isARMode && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 px-6 py-3 rounded-none pointer-events-none flex items-center gap-6 text-[10px] font-mono uppercase tracking-widest text-zinc-300">
                  <div className="flex items-center gap-2">
                    <kbd className="bg-zinc-800 border border-zinc-600 px-2 py-1 text-white">Left Click</kbd>
                    <span>Crosshair</span>
                  </div>
                  <div className="w-px h-4 bg-zinc-700"></div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-zinc-800 border border-zinc-600 px-2 py-1 text-white">Right Click</kbd>
                    <span>Pan/Zoom</span>
                  </div>
                  <div className="w-px h-4 bg-zinc-700"></div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-zinc-800 border border-zinc-600 px-2 py-1 text-white">Scroll</kbd>
                    <span>Change Slice</span>
                  </div>
                </div>
              )}

              {/* AR Mode Canvas */}
              {isARMode && (
                <div className="absolute inset-0 z-10 bg-zinc-900">
                  <div className="absolute top-4 left-4 z-20">
                    <button 
                      onClick={() => store.enterAR()}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 font-mono text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors border border-zinc-300"
                    >
                      <Glasses className="w-4 h-4" />
                      Enter AR
                    </button>
                  </div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 px-6 py-4 rounded-none text-center max-w-md pointer-events-none">
                    <h3 className="text-white font-mono text-xs uppercase tracking-widest mb-2">Meta Quest 3 AR Mode</h3>
                    <p className="text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
                      Put on your headset and click "Enter AR" to view the 3D brain model in your physical space.
                    </p>
                  </div>
                  <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3], fov: 45 }}>
                    <XR store={store}>
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[10, 10, 10]} intensity={1} />
                      <pointLight position={[-10, -10, -10]} intensity={0.5} />
                      <Suspense fallback={null}>
                        <BrainModel activeLobe={null} mode="twin" viewState="normal" />
                      </Suspense>
                    </XR>
                  </Canvas>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
