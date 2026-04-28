import { createContext, useContext, useState, ReactNode } from 'react';

export type ActivityLog = {
  id: number;
  title: string;
  type: string;
  lobe: string;
  duration: string;
  date: string;
  energyLevel: number; // 1-5
  focusLevel: number; // 1-5
};

export type DMIBookmark = {
  id: string;
  thought: string;
  timestamp: number;
  lobe: string;
};

export type BCIState = {
  visualThrottling: number;
  auditoryThrottling: number;
  noiseCancelingActive: boolean;
  bookmarks: DMIBookmark[];
};

export type UserSettings = {
  defaultActivityType: string;
  arRoutingStyle: 'organic' | 'direct' | 'energy-saving';
  aiInterventionThreshold: number;
};

type CognitiveContextType = {
  activities: ActivityLog[];
  addActivity: (activity: Omit<ActivityLog, 'id'>) => void;
  burnoutRisk: number;
  setBurnoutRisk: (risk: number) => void;
  algorithmicDependency: number;
  setAlgorithmicDependency: (dep: number | ((prev: number) => number)) => void;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  bciState: BCIState;
  updateBCIState: (newState: Partial<BCIState>) => void;
  addDMIBookmark: (thought: string, lobe: string) => void;
  hoveredActivityIndex: number | null;
  setHoveredActivityIndex: (index: number | null) => void;
};

const CognitiveContext = createContext<CognitiveContextType | undefined>(undefined);

const INITIAL_ACTIVITIES: ActivityLog[] = [
  { id: 1, title: 'System Architecture Design', type: 'Deep Work', lobe: 'Frontal', duration: '2h', date: 'Today, 09:00 AM', energyLevel: 4, focusLevel: 5 },
  { id: 2, title: '3D Spatial Routing Simulation', type: 'Interactive', lobe: 'Parietal', duration: '45m', date: 'Today, 11:30 AM', energyLevel: 3, focusLevel: 4 },
  { id: 3, title: 'Research Paper Review', type: 'Reading', lobe: 'Temporal', duration: '1h', date: 'Yesterday, 02:00 PM', energyLevel: 2, focusLevel: 3 },
];

export function CognitiveProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ActivityLog[]>(INITIAL_ACTIVITIES);
  const [burnoutRisk, setBurnoutRisk] = useState(45);
  const [algorithmicDependency, setAlgorithmicDependency] = useState(0);
  const [settings, setSettings] = useState<UserSettings>({
    defaultActivityType: 'Deep Work',
    arRoutingStyle: 'organic',
    aiInterventionThreshold: 70,
  });
  const [bciState, setBCIState] = useState<BCIState>({
    visualThrottling: 0,
    auditoryThrottling: 0,
    noiseCancelingActive: false,
    bookmarks: [],
  });
  const [hoveredActivityIndex, setHoveredActivityIndex] = useState<number | null>(null);

  const addActivity = (activity: Omit<ActivityLog, 'id'>) => {
    setActivities(prev => [{ ...activity, id: Date.now() }, ...prev]);
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateBCIState = (newState: Partial<BCIState>) => {
    setBCIState(prev => ({ ...prev, ...newState }));
  };

  const addDMIBookmark = (thought: string, lobe: string) => {
    const newBookmark: DMIBookmark = {
      id: Date.now().toString(),
      thought,
      timestamp: Date.now(),
      lobe,
    };
    setBCIState(prev => ({
      ...prev,
      bookmarks: [newBookmark, ...prev.bookmarks],
    }));
  };

  return (
    <CognitiveContext.Provider value={{ 
      activities, addActivity, 
      burnoutRisk, setBurnoutRisk, 
      algorithmicDependency, setAlgorithmicDependency,
      settings, updateSettings,
      bciState, updateBCIState, addDMIBookmark,
      hoveredActivityIndex, setHoveredActivityIndex
    }}>
      {children}
    </CognitiveContext.Provider>
  );
}

export const useCognitive = () => {
  const context = useContext(CognitiveContext);
  if (!context) throw new Error('useCognitive must be used within CognitiveProvider');
  return context;
};
