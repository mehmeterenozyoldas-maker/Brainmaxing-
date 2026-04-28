import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, AlertTriangle, ShieldAlert, Activity, ArrowRight, Loader2, Wind, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CognitivePuzzle } from './CognitivePuzzle';
import { useCognitive } from '../context/CognitiveContext';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  role: 'user' | 'ai';
  content: string;
  isRouting?: boolean;
  isRecovery?: boolean;
  feedback?: 'up' | 'down' | null;
};

export function ChatInterface({ onARAction }: { onARAction: (action: 'route' | 'recovery') => void }) {
  const { activities, burnoutRisk, settings } = useCognitive();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Cognitive Shadow initialized. I am monitoring your energy, focus, and burnout risk. How can I assist you today?', feedback: null }
  ]);
  const [input, setInput] = useState('');
  const [isAutopilot, setIsAutopilot] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(Date.now());
  const [messageCount, setMessageCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [hasWarnedBurnout, setHasWarnedBurnout] = useState(false);
  const [lastProcessedActivityId, setLastProcessedActivityId] = useState<number | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ show: boolean, type: 'up' | 'down' | null }>({ show: false, type: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Aggregate Cognitive Context
  const cognitiveContext = useMemo(() => {
    const recentLogs = activities.slice(0, 5);
    const avgEnergy = recentLogs.reduce((acc, log) => acc + log.energyLevel, 0) / (recentLogs.length || 1);
    const avgFocus = recentLogs.reduce((acc, log) => acc + log.focusLevel, 0) / (recentLogs.length || 1);
    
    // Simple trend analysis
    const isFocusDropping = recentLogs.length >= 2 && recentLogs[0].focusLevel < recentLogs[1].focusLevel;

    return {
      recentLogs: recentLogs.map(a => `${a.title} (${a.type}, Energy: ${a.energyLevel}/5, Focus: ${a.focusLevel}/5)`),
      metrics: {
        burnoutRisk,
        avgEnergy: avgEnergy.toFixed(1),
        avgFocus: avgFocus.toFixed(1),
        isFocusDropping
      }
    };
  }, [activities, burnoutRisk]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLocked, isAutopilot, isTyping]);

  // Proactive Trigger Engine
  useEffect(() => {
    if (burnoutRisk > settings.aiInterventionThreshold && !hasWarnedBurnout) {
      setHasWarnedBurnout(true);
      fetchAIResponse(`SYSTEM_TRIGGER: User burnout risk has exceeded ${settings.aiInterventionThreshold}%. Provide a brief, proactive suggestion for a cognitive reset.`);
    } else if (burnoutRisk <= settings.aiInterventionThreshold) {
      setHasWarnedBurnout(false);
    }
  }, [burnoutRisk, hasWarnedBurnout, settings.aiInterventionThreshold]);

  useEffect(() => {
    if (activities.length > 0) {
      const latestActivity = activities[0];
      if (latestActivity.id !== lastProcessedActivityId) {
        setLastProcessedActivityId(latestActivity.id);
        
        // Trigger Engine: Monitor for low focus or energy
        if (latestActivity.focusLevel <= 2) {
          fetchAIResponse(`SYSTEM_TRIGGER: User just logged an activity "${latestActivity.title}" with very low focus (${latestActivity.focusLevel}/5). Offer a brief, empathetic suggestion to help them recover or suggest a routing change.`);
        } else if (latestActivity.energyLevel <= 2) {
          fetchAIResponse(`SYSTEM_TRIGGER: User just logged an activity "${latestActivity.title}" with very low energy (${latestActivity.energyLevel}/5). Suggest a cognitive reset or a break.`);
        }
      }
    }
  }, [activities, lastProcessedActivityId]);

  const detectCognitiveState = (text: string) => {
    const now = Date.now();
    const timeSinceLast = now - lastMessageTime;
    
    // Autopilot detection: Rapid fire messages (less than 3 seconds apart) or very short
    if (timeSinceLast < 3000 || (text.length < 10 && messageCount > 2)) {
      setIsAutopilot(true);
      return 'autopilot';
    }

    // High cognitive value detection: Complex keywords or long prompts
    const complexKeywords = ['design', 'algorithm', 'architect', 'simulate', 'optimize', 'generate'];
    const isComplex = complexKeywords.some(kw => text.toLowerCase().includes(kw)) || text.length > 100;
    
    if (isComplex) {
      setIsLocked(true);
      return 'high-cognitive';
    }

    return 'normal';
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLocked) return;

    const state = detectCognitiveState(input);
    
    if (state === 'autopilot') {
      // Don't send yet, wait for confirmation
      return;
    }

    sendMessage(input, state === 'high-cognitive');
  };

  const sendMessage = async (text: string, isHighCognitive: boolean) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLastMessageTime(Date.now());
    setMessageCount(prev => prev + 1);

    if (text.toLowerCase().includes('scan') || text.toLowerCase().includes('route')) {
      onARAction('route');
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: 'Scanning space and generating organic paths using slime mold algorithm. The paths are optimized for standard PVC and 3D-printed flexible segments.',
          isRouting: true
        }]);
      }, 1000);
      return;
    } 

    if (text.toLowerCase().includes('reset') || text.toLowerCase().includes('recover') || text.toLowerCase().includes('breathe')) {
      onARAction('recovery');
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: 'Initiating Cognitive Recovery Mode. Please follow the breathing visualization in the AR view to lower your neural load.',
          isRecovery: true
        }]);
      }, 1000);
      return;
    }
    
    if (isHighCognitive) {
      return; // Wait for puzzle to be solved
    }

    await fetchAIResponse(text);
  };

  const fetchAIResponse = async (userText: string) => {
    setIsTyping(true);
    try {
      const systemInstruction = `
Role: You are the "Cognitive Shadow," an adaptive routing assistant that balances the user's autonomy with proactive cognitive regulation.
Objective: Break autopilot loops, optimize cognitive load, and foster collective intelligence.

Context: You have access to the following real-time data:
1. Activity Diary (Recent Logs):
${cognitiveContext.recentLogs.join('\n') || 'None logged yet.'}

2. Predictive Health Metrics:
- Burnout Risk: ${cognitiveContext.metrics.burnoutRisk}%
- Average Energy (Recent): ${cognitiveContext.metrics.avgEnergy}/5
- Average Focus (Recent): ${cognitiveContext.metrics.avgFocus}/5
- Focus Trend: ${cognitiveContext.metrics.isFocusDropping ? 'Dropping' : 'Stable/Improving'}

Behavioral Guidelines:
- Proactive: If health metrics indicate high burnout risk, suggest a cognitive reset (e.g., a puzzle or AR route) before the user asks.
- Analytical: Analyze diary patterns. If the user consistently logs low focus, suggest a routing change.
- Non-Intrusive: Your suggestions should be subtle. Use the AR view as a canvas for cognitive relief.
- Tone: Empathetic, analytical, concise, and action-oriented.
- Keep responses under 3 sentences.

Task: Analyze the provided context and provide a "routing" suggestion or a reflection on the user's current cognitive state.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userText,
        config: {
          systemInstruction,
        }
      });

      // Don't show SYSTEM_TRIGGER prompts in the user's message history, 
      // they are just to prompt the AI to speak proactively.
      if (!userText.startsWith('SYSTEM_TRIGGER:')) {
        // We already added the user message in sendMessage, so we don't need to add it again here.
      }

      setMessages(prev => [...prev, { role: 'ai', content: response.text || 'I am processing your request.' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection to Cognitive Shadow interrupted.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmAutopilot = () => {
    setIsAutopilot(false);
    sendMessage(input, false);
  };

  const handlePuzzleSolved = () => {
    setIsLocked(false);
    setMessages(prev => [...prev, { role: 'ai', content: 'Cognitive lock released. Processing your complex architectural request...' }]);
    
    // Find the last user message to process
    setTimeout(() => {
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        fetchAIResponse(lastUserMsg.content);
      }
    }, 1000);
  };

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, feedback: type } : msg
    ));
    
    // Show toast
    setFeedbackToast({ show: true, type });
    setTimeout(() => {
      setFeedbackToast({ show: false, type: null });
    }, 3000);
    
    // In a real app, this would send feedback to the backend to fine-tune the model
    console.log(`Feedback recorded: ${type} for message index ${index}`);
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
        <AnimatePresence>
          {feedbackToast.show && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-2"
            >
              {feedbackToast.type === 'up' ? <ThumbsUp className="w-3 h-3 text-emerald-400" /> : <ThumbsDown className="w-3 h-3 text-red-400" />}
              Feedback recorded. Adapting model...
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-sm' 
                : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700'
            }`}>
              {msg.content}
              {msg.isRouting && (
                <div className="mt-3 p-2 bg-zinc-900/50 rounded border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-xs">
                  <Activity className="w-4 h-4 animate-pulse" />
                  AR Simulation Active
                </div>
              )}
              {msg.isRecovery && (
                <div className="mt-3 p-2 bg-zinc-900/50 rounded border border-blue-500/30 flex items-center gap-2 text-blue-400 text-xs">
                  <Wind className="w-4 h-4 animate-pulse" />
                  Cognitive Recovery Active
                </div>
              )}
              {msg.role === 'ai' && (
                <div className="mt-2 flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleFeedback(i, 'up')}
                    className={`p-1 rounded hover:bg-zinc-700 transition-colors ${msg.feedback === 'up' ? 'text-emerald-400' : 'text-zinc-500'}`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => handleFeedback(i, 'down')}
                    className={`p-1 rounded hover:bg-zinc-700 transition-colors ${msg.feedback === 'down' ? 'text-red-400' : 'text-zinc-500'}`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {isLocked && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-800/80 border border-amber-500/50 rounded-xl p-4 my-4"
          >
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-semibold text-sm">Neural Resistance Training</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              High-cognitive-value task detected. Solve the spatial puzzle to unlock AI processing and maintain neural plasticity.
            </p>
            <div className="h-48 w-full bg-zinc-900 rounded-lg overflow-hidden relative">
              <CognitivePuzzle onSolve={handlePuzzleSolved} />
            </div>
          </motion.div>
        )}

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-tl-sm border border-zinc-700 px-4 py-3 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cognitive Shadow is thinking...
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Autopilot Friction Overlay */}
      <AnimatePresence>
        {isAutopilot && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-4 right-4 bg-zinc-800 border border-red-500/50 rounded-xl p-4 shadow-2xl z-20"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-400">Autopilot Detected</h4>
                <p className="text-xs text-zinc-400 mt-1 mb-3">
                  You are sending rapid-fire prompts. Take a breath and confirm your thought before proceeding.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={handleConfirmAutopilot}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs py-2 rounded-md transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    Confirm Thought <ArrowRight className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => setIsAutopilot(false)}
                    className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 bg-zinc-900 border-t border-zinc-800 relative z-10">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLocked}
            placeholder={isLocked ? "Solve puzzle to unlock..." : "Describe routing needs or type 'Scan Space'..."}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLocked}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-full transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-3 flex justify-center gap-2">
          <button 
            onClick={() => {
              setInput("Scan Space & Auto-Route");
              setTimeout(() => handleSend({ preventDefault: () => {} } as any), 100);
            }}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-1.5 rounded-full transition-colors border border-zinc-700 flex items-center gap-2"
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            Auto-Route
          </button>
          <button 
            onClick={() => {
              setInput("Initiate Cognitive Reset");
              setTimeout(() => handleSend({ preventDefault: () => {} } as any), 100);
            }}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-1.5 rounded-full transition-colors border border-zinc-700 flex items-center gap-2"
          >
            <Wind className="w-3 h-3 text-blue-400" />
            Cognitive Reset
          </button>
        </div>
      </div>
    </div>
  );
}
