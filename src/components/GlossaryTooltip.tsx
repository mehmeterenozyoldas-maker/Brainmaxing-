import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';

interface GlossaryTooltipProps {
  term: React.ReactNode;
  definition: string;
}

export function GlossaryTooltip({ term, definition }: GlossaryTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span 
      className="relative inline-flex items-center gap-2 cursor-help group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span>{term}</span>
      <HelpCircle className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-zinc-950 border border-emerald-500/30 rounded-xl shadow-[0_4_20px_rgba(16,185,129,0.15)] pointer-events-none"
          >
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-950 border-b border-r border-emerald-500/30 rotate-45" />
            <p className="text-xs font-mono text-zinc-300 leading-relaxed font-normal normal-case tracking-normal relative z-10">
              {definition}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
