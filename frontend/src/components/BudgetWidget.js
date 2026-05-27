import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { PiggyBank, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BudgetWidget({ tripId }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    api.get(`/trips/${tripId}/budget`)
      .then(r => setData(r.data?.summary))
      .catch(() => {});
  }, [tripId]);

  if (!data || !tripId) return null;

  const pct = data.pct_used || 0;
  const color = pct >= 100 ? 'text-red-600' : pct >= 75 ? 'text-[#E07A5F]' : 'text-emerald-600';
  const bgColor = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-[#E07A5F]' : 'bg-emerald-500';

  return (
    <div className="fixed bottom-20 left-6 z-40" data-testid="budget-widget">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-3 bg-white rounded-2xl shadow-xl border border-[#E8E4DF] p-4 w-56">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-['Outfit'] font-bold text-[#1A1A1A]">Budget</span>
              <span className={`text-xs font-['Outfit'] font-bold ${color}`}>{pct}% used</span>
            </div>
            <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden mb-2">
              <div className={`h-full ${bgColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-[#5C5C5C] font-['Outfit'] mb-3">
              <span>{data.total_per_person} {data.currency}/pp</span>
              <span>of {data.target_per_person}</span>
            </div>
            {Object.entries(data.by_category || {}).slice(0, 3).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between text-[10px] text-[#5C5C5C] mb-0.5">
                <span className="capitalize">{cat}</span>
                <span className="font-medium">{Math.round(amt)} {data.currency}</span>
              </div>
            ))}
            <Link to={`/trip/${tripId}/budget`} className="block mt-3 text-center text-xs font-['Outfit'] font-medium text-[#E07A5F] hover:underline" data-testid="budget-widget-link">
              View full budget &rarr;
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full ${open ? 'bg-[#2A3B32]' : 'bg-white border border-[#E8E4DF]'} shadow-lg flex items-center justify-center transition-all hover:scale-105`}
        data-testid="budget-widget-toggle">
        {open ? <ChevronDown className="w-5 h-5 text-white" /> : <PiggyBank className={`w-5 h-5 ${color}`} />}
      </button>
    </div>
  );
}
