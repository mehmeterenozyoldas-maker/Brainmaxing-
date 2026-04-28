import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import { useState, useEffect } from 'react';
import './index.css';
import { CognitiveProvider } from './context/CognitiveContext.tsx';
import { BCIControlPanel } from './components/BCIControlPanel.tsx';
import { TribeSimulation } from './components/TribeSimulation.tsx';
import { ARView } from './components/ARView.tsx';
import { MRIAnalysis } from './components/MRIAnalysis.tsx';

function AppPortals() {
  const [roots, setRoots] = useState<{bci: HTMLElement | null, tribe: HTMLElement | null, ar: HTMLElement | null, mri: HTMLElement | null}>({ bci: null, tribe: null, ar: null, mri: null });

  useEffect(() => {
    const checkRoots = () => {
      setRoots({
        bci: document.getElementById('bci-root'),
        tribe: document.getElementById('tribe-root'),
        ar: document.getElementById('ar-root'),
        mri: document.getElementById('mri-root'),
      });
    };
    checkRoots();
    // Try again after a short delay to ensure DOM is ready
    const timer = setTimeout(checkRoots, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {roots.bci && createPortal(
        <div className="w-full h-full bg-zinc-950 text-zinc-100 font-sans pointer-events-auto">
          <BCIControlPanel />
        </div>,
        roots.bci
      )}
      {roots.tribe && createPortal(
        <div className="w-full h-full font-sans pointer-events-auto">
          <TribeSimulation />
        </div>,
        roots.tribe
      )}
      {roots.ar && createPortal(
        <div className="w-full h-full bg-zinc-950 text-zinc-100 font-sans pointer-events-auto">
          <ARView isActive={true} mode="router" points={[]} />
        </div>,
        roots.ar
      )}
      {roots.mri && createPortal(
        <div className="w-full h-full font-sans pointer-events-auto">
          <MRIAnalysis />
        </div>,
        roots.mri
      )}
    </>
  );
}

const rootElement = document.createElement('div');
rootElement.id = 'react-global-root';
document.body.appendChild(rootElement);

createRoot(rootElement).render(
  <StrictMode>
    <CognitiveProvider>
      <AppPortals />
    </CognitiveProvider>
  </StrictMode>
);
