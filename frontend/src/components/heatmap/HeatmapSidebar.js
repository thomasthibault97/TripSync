import { Check, Plane, Lock, Users, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function MostProbableRanges({ ranges, totalWithPrefs, isOwner, lockedDates, locking, onLock }) {
  if (!ranges.length) return null;
  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5 shadow-sm" data-testid="most-probable-ranges">
      <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] mb-1 flex items-center gap-2 text-sm">
        <Plane className="w-4 h-4 text-emerald-600" /> Most Probable Travel Dates
      </h3>
      <p className="text-[10px] text-[#5C605E] mb-4">Best overlapping schedules from everyone</p>
      <div className="space-y-3">
        {ranges.slice(0, 5).map((r, i) => {
          const startLabel = new Date(r.start + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const endLabel = new Date(r.end + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return (
            <motion.div key={`${r.start}-${r.end}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`p-3.5 rounded-xl border transition-all ${
                i === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-[#E5E4DE] bg-[#F7F6F2]'
              }`} data-testid={`probable-range-${i}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {i === 0 && <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">TOP PICK</span>}
                  {i > 0 && <span className="bg-[#E5E4DE] text-[#5C605E] text-[9px] font-bold px-1.5 py-0.5 rounded-full">#{i + 1}</span>}
                </div>
                <span className={`text-base font-['Outfit'] font-bold ${i === 0 ? 'text-emerald-600' : 'text-[#1C1E1D]'}`}>{r.score}%</span>
              </div>
              <div className="text-sm font-bold text-[#1C1E1D] mb-1">{startLabel} &rarr; {endLabel}</div>
              <div className="text-[10px] text-[#5C605E] space-y-0.5">
                <div>{r.days} days</div>
                <div>{r.full_overlap_count}/{totalWithPrefs} fully available</div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-[#E5E4DE] overflow-hidden">
                  <div className={`h-full rounded-full ${r.score >= 80 ? 'bg-emerald-500' : r.score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${r.score}%` }} />
                </div>
              </div>
              {r.full_overlap_users?.length > 0 && (
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  {r.full_overlap_users.map((name) => (
                    <span key={name} className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5" />{name}
                    </span>
                  ))}
                </div>
              )}
              {r.partial_overlap_users?.length > 0 && (
                <div className="mt-1 text-[9px] text-amber-600">Partial: {r.partial_overlap_users.join(', ')}</div>
              )}
              {isOwner && !lockedDates && (
                <button onClick={() => onLock(r.start, r.end)} disabled={locking}
                  className="mt-2.5 w-full flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg py-1.5 transition-colors"
                  data-testid={`lock-range-${i}`}>
                  <Lock className="w-3 h-3" /> {locking ? 'Locking...' : 'Lock these dates'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function ParticipantRangesSidebar({ participantGrid }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5">
      <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] mb-4 flex items-center gap-2 text-sm">
        <Users className="w-4 h-4 text-[#2C4234]" /> Participants & Ranges
      </h3>
      <div className="space-y-3">
        {participantGrid.map((p) => (
          <div key={p.name} className="py-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-[#2C4234]/10 flex items-center justify-center text-[#2C4234] text-[10px] font-bold shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-[#1C1E1D] font-medium truncate">{p.name}</span>
              {p.pending ? (
                <span className="text-[9px] text-amber-500 ml-auto bg-amber-50 px-1.5 py-0.5 rounded">Pending</span>
              ) : (
                <Check className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />
              )}
            </div>
            {p.ranges && p.ranges.length > 0 && (
              <div className="ml-9 space-y-1">
                {p.ranges.map((r) => {
                  const sLabel = new Date(r.start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const eLabel = new Date(r.end + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div key={`${r.start}-${r.end}`} className="text-[10px] text-[#5C605E] flex items-center gap-1">
                      <Plane className="w-3 h-3 text-[#2C4234]" />
                      <span>{sLabel} &rarr; {eLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BestWeekendsSidebar({ weekends }) {
  if (!weekends?.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5">
      <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] mb-4 flex items-center gap-2 text-sm">
        <Award className="w-4 h-4 text-[#D96A53]" /> Best Weekends
      </h3>
      <div className="space-y-3">
        {weekends.slice(0, 5).map((wk) => {
          const friLabel = new Date(wk.friday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const sunLabel = new Date(wk.sunday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const idx = weekends.indexOf(wk);
          return (
            <div key={wk.friday} className={`p-3 rounded-xl border transition-all ${
              idx === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-[#E5E4DE] bg-[#F7F6F2]'
            }`} data-testid={`best-weekend-${idx}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-[#1C1E1D]">{friLabel} – {sunLabel}</span>
                {idx === 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Best</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[#E5E4DE] overflow-hidden">
                  <div className={`h-full rounded-full ${wk.score >= 80 ? 'bg-emerald-500' : wk.score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${wk.score}%` }} />
                </div>
                <span className="text-xs font-bold text-[#1C1E1D] w-10 text-right">{wk.score}%</span>
              </div>
              <div className="text-[10px] text-[#5C605E] mt-1">{wk.min_available} available all 3 days</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
