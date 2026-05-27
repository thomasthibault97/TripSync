import { Check, X, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BestPeriodsSection({ bestPeriods, heatmap, totalWithPrefs }) {
  if (!bestPeriods.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8" data-testid="best-periods-section">
      <h2 className="font-['Outfit'] text-lg font-bold text-[#1C1E1D] mb-4 flex items-center gap-2">
        <Crown className="w-5 h-5 text-[#D96A53]" /> Best Periods for Your Group
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bestPeriods.map((bp, i) => {
          const startD = new Date(bp.start);
          const endD = new Date(bp.end);
          const startLabel = startD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const endLabel = endD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return (
            <motion.div key={`${bp.start}-${bp.end}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border-2 p-5 transition-all ${
                i === 0 ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-[#E5E4DE]'
              }`}
              data-testid={`best-period-${i}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">TOP PICK</span>}
                  {i > 0 && <span className="bg-[#E5E4DE] text-[#5C605E] text-[10px] font-bold px-2 py-0.5 rounded-full">#{i + 1}</span>}
                </div>
                <span className={`text-lg font-['Outfit'] font-bold ${i === 0 ? 'text-emerald-600' : 'text-[#1C1E1D]'}`}>{bp.score}%</span>
              </div>
              <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] text-base mb-1">{startLabel} — {endLabel}</h3>
              <div className="text-xs text-[#5C605E] space-y-1 mt-2">
                <div>{bp.days} days &middot; {bp.all_available_days} days with everyone free</div>
                <div>Avg. {bp.avg_available}/{totalWithPrefs} participants available</div>
              </div>
              {bp.all_available_days < bp.days && (() => {
                const missingNames = new Set();
                bp.dates?.forEach(d => {
                  const cell = heatmap[d];
                  cell?.unavailable?.forEach(n => missingNames.add(n));
                });
                return missingNames.size > 0 ? (
                  <div className="text-[10px] mt-2 flex items-center gap-1 text-amber-600">
                    <X className="w-3 h-3 shrink-0" />
                    <span>Missing on some days: {[...missingNames].join(', ')}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex gap-1 mt-3">
                {bp.dates?.map(d => {
                  const cell = heatmap[d];
                  const count = cell?.count || 0;
                  const isAll = count === totalWithPrefs;
                  return (
                    <div key={d} className={`flex-1 h-3 rounded-full ${isAll ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      title={`${d}: ${count}/${totalWithPrefs}`} />
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
