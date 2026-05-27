import { Check, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeatmapTooltip({ hoveredDate, heatmap, tooltipPos, isInBestPeriod }) {
  if (!hoveredDate || !heatmap[hoveredDate]) return null;
  const cell = heatmap[hoveredDate];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="fixed z-50 pointer-events-none"
        style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}>
        <div className="bg-[#1C1E1D] text-white rounded-xl px-4 py-3 shadow-xl text-xs min-w-[200px]">
          <div className="font-bold mb-1.5">
            {new Date(hoveredDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <div className="mb-2 font-medium text-sm">
            {cell.count}/{cell.total_with_prefs} available
          </div>
          {cell.available?.length > 0 && (
            <div className="mb-1 flex items-start gap-1.5">
              <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
              <span><span className="text-emerald-400 font-medium">Available: </span>{cell.available.join(', ')}</span>
            </div>
          )}
          {cell.unavailable?.length > 0 && (
            <div className="mb-1 flex items-start gap-1.5">
              <X className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
              <span><span className="text-red-400 font-medium">Unavailable: </span>{cell.unavailable.join(', ')}</span>
            </div>
          )}
          {isInBestPeriod(hoveredDate) && (
            <div className="mt-1.5 pt-1.5 border-t border-white/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Part of best period</span>
            </div>
          )}
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1C1E1D]" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
