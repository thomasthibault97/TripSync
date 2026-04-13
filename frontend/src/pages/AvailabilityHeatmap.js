import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Users, Calendar, ChevronLeft, ChevronRight, Award, Check, X, Crown, Sparkles, Plane } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MONTH_NAMES_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function AvailabilityHeatmap() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    api.get(`/trips/${tripId}/availability-heatmap`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load availability'))
      .finally(() => setLoading(false));
  }, [tripId]);

  const today = new Date();
  const currentMonth = useMemo(() => {
    return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  let startOffset = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const heatmap = data?.heatmap || {};
  const totalWithPrefs = data?.prefs_submitted || 0;
  const participantGrid = data?.participant_grid || [];
  const bestPeriods = data?.best_periods || [];
  const mostProbableRanges = data?.most_probable_ranges || [];

  // Get dates for current month that have data
  const monthDates = useMemo(() => {
    const dates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    return dates;
  }, [currentMonth, daysInMonth]);

  // Check if a date is in any best period
  const isInBestPeriod = (dateStr) => bestPeriods.some(bp => bp.dates?.includes(dateStr));

  const getCellColor = (dateStr) => {
    const cell = heatmap[dateStr];
    if (!cell) return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-300' };
    if (cell.level === 'unknown') return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400' };
    if (cell.level === 'all') return { bg: 'bg-emerald-200', border: 'border-emerald-400', text: 'text-emerald-900' };
    if (cell.level === 'most') return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' };
    if (cell.level === 'some') return { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-900' };
    return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-600' };
  };

  const isPast = (day) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isWeekend = (day) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const handleMouseEnter = (e, dateStr) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    setHoveredDate(dateStr);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}`} className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Back to trip
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-lg text-[#1C1E1D]">TripSync</span>
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8" data-testid="availability-heatmap-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-7 h-7 text-[#2C4234]" />
            <h1 className="font-['Outfit'] text-3xl font-bold text-[#1C1E1D] tracking-tight">Group Availability</h1>
          </div>
          <p className="text-[#5C605E] mb-1">See when everyone can travel — like a Doodle for your trip</p>
          <p className="text-sm text-[#D96A53] font-medium mb-8">
            {data?.prefs_submitted || 0} of {data?.total_participants || 0} participants submitted dates
          </p>
        </motion.div>

        {/* Best Periods - Doodle highlight */}
        {bestPeriods.length > 0 && (
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
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
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
                      <div>{bp.days} days · {bp.all_available_days} days with everyone free</div>
                      <div>Avg. {bp.avg_available}/{totalWithPrefs} participants available</div>
                    </div>
                    {/* Show who's missing on partial days */}
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
                    {/* Mini visual: colored dots per date */}
                    <div className="flex gap-1 mt-3">
                      {bp.dates?.map((d, di) => {
                        const cell = heatmap[d];
                        const count = cell?.count || 0;
                        const isAll = count === totalWithPrefs;
                        return (
                          <div key={di} className={`flex-1 h-3 rounded-full ${isAll ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            title={`${d}: ${count}/${totalWithPrefs}`} />
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Calendar + Doodle Grid */}
          <div className="lg:col-span-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setMonthOffset(p => Math.max(-1, p - 1))}
                className="w-10 h-10 rounded-xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#5C605E] hover:bg-[#F7F6F2]"
                data-testid="prev-month-btn">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-['Outfit'] text-xl font-bold text-[#1C1E1D]">
                {MONTH_NAMES_FULL[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button onClick={() => setMonthOffset(p => Math.min(5, p + 1))}
                className="w-10 h-10 rounded-xl bg-white border border-[#E5E4DE] flex items-center justify-center text-[#5C605E] hover:bg-[#F7F6F2]"
                data-testid="next-month-btn">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-6 overflow-hidden mb-6">
              <div className="grid grid-cols-7 gap-2 mb-3">
                {DAY_LABELS.map(d => (
                  <div key={d} className={`text-center text-xs font-bold uppercase tracking-wider py-2 ${(d === 'Sat' || d === 'Sun') ? 'text-[#D96A53]' : 'text-[#5C605E]'}`}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startOffset }, (_, i) => <div key={`e-${i}`} className="aspect-square" />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = monthDates[i];
                  const past = isPast(day);
                  const wknd = isWeekend(day);
                  const colors = getCellColor(dateStr);
                  const cell = heatmap[dateStr];
                  const countText = cell ? `${cell.count}/${cell.total_with_prefs}` : '';
                  const inBest = isInBestPeriod(dateStr);

                  return (
                    <motion.div key={day}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.008 }}
                      onMouseEnter={(e) => handleMouseEnter(e, dateStr)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 relative group
                        ${past ? 'bg-gray-50 border-gray-100 opacity-40' : `${colors.bg} ${colors.border} hover:scale-105 hover:shadow-md`}
                        ${wknd && !past ? 'ring-1 ring-[#D96A53]/20' : ''}
                        ${inBest && !past ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                      data-testid={`heatmap-cell-${dateStr}`}>
                      <span className={`text-sm font-bold ${past ? 'text-gray-300' : colors.text}`}>{day}</span>
                      {!past && cell && cell.level !== 'unknown' && (
                        <span className={`text-[10px] font-extrabold mt-0.5 ${colors.text}`}>{countText}</span>
                      )}
                      {inBest && !past && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
              {[
                { color: 'bg-emerald-200 border-emerald-400', label: 'Everyone' },
                { color: 'bg-green-100 border-green-300', label: 'Most' },
                { color: 'bg-amber-200 border-amber-400', label: 'Some' },
                { color: 'bg-red-100 border-red-300', label: 'Conflict' },
                { color: 'bg-gray-50 border-gray-200', label: 'No data' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md border-2 ${l.color}`} />
                  <span className="text-xs text-[#5C605E]">{l.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md border-2 border-emerald-400 ring-2 ring-emerald-400 ring-offset-1 bg-white" />
                <span className="text-xs text-emerald-600 font-medium">Best period</span>
              </div>
            </div>

            {/* Doodle-Style Participant Grid */}
            <div className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden" data-testid="doodle-grid">
              <div className="px-6 py-4 border-b border-[#E5E4DE] flex items-center justify-between">
                <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#2C4234]" /> Who's available when
                </h3>
                <span className="text-xs text-[#5C605E]">Scroll right to see all dates →</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-[#E5E4DE]">
                      <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-bold text-[#5C605E] min-w-[140px] border-r border-[#E5E4DE]">
                        Participant
                      </th>
                      {monthDates.map((dateStr, i) => {
                        const day = i + 1;
                        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                        const wknd = d.getDay() === 0 || d.getDay() === 6;
                        const inBest = isInBestPeriod(dateStr);
                        return (
                          <th key={dateStr} className={`px-1 py-2 text-center min-w-[40px] ${inBest ? 'bg-emerald-50' : wknd ? 'bg-[#D96A53]/5' : ''}`}>
                            <div className={`text-[9px] font-bold ${wknd ? 'text-[#D96A53]' : 'text-[#5C605E]'}`}>{dayName}</div>
                            <div className="text-xs font-bold text-[#1C1E1D]">{day}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {participantGrid.map((p, pi) => (
                      <tr key={pi} className="border-b border-[#E5E4DE] last:border-0 hover:bg-[#F7F6F2]/50">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 border-r border-[#E5E4DE]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#2C4234]/10 flex items-center justify-center text-[#2C4234] text-[10px] font-bold shrink-0">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-[#1C1E1D]">{p.name}</span>
                              {p.pending && <span className="text-[9px] text-amber-500 block">Pending</span>}
                            </div>
                          </div>
                        </td>
                        {monthDates.map((dateStr) => {
                          const isAvailable = p.dates?.[dateStr] === true;
                          const isPending = p.pending;
                          const inBest = isInBestPeriod(dateStr);
                          return (
                            <td key={dateStr} className={`px-1 py-2 text-center ${inBest ? 'bg-emerald-50' : ''}`}>
                              {isPending ? (
                                <div className="w-7 h-7 mx-auto rounded-lg bg-gray-100 flex items-center justify-center">
                                  <span className="text-gray-300 text-xs font-bold">?</span>
                                </div>
                              ) : isAvailable ? (
                                <div className="w-7 h-7 mx-auto rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 mx-auto rounded-lg bg-red-100 flex items-center justify-center">
                                  <X className="w-4 h-4 text-red-300" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="bg-[#F7F6F2] font-bold">
                      <td className="sticky left-0 z-10 bg-[#F7F6F2] px-4 py-2.5 border-r border-[#E5E4DE]">
                        <span className="text-xs font-bold text-[#2C4234]">Total Available</span>
                      </td>
                      {monthDates.map((dateStr) => {
                        const cell = heatmap[dateStr];
                        const count = cell?.count || 0;
                        const isAll = count === totalWithPrefs && totalWithPrefs > 0;
                        const inBest = isInBestPeriod(dateStr);
                        return (
                          <td key={dateStr} className={`px-1 py-2 text-center ${inBest ? 'bg-emerald-100' : ''}`}>
                            <span className={`text-xs font-bold ${isAll ? 'text-emerald-600' : count > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                              {count > 0 ? count : '-'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Most Probable Travel Dates */}
            {mostProbableRanges.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5 shadow-sm" data-testid="most-probable-ranges">
                <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] mb-1 flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4 text-emerald-600" /> Most Probable Travel Dates
                </h3>
                <p className="text-[10px] text-[#5C605E] mb-4">Best overlapping schedules from everyone</p>
                <div className="space-y-3">
                  {mostProbableRanges.slice(0, 5).map((r, i) => {
                    const startLabel = new Date(r.start + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const endLabel = new Date(r.end + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-3.5 rounded-xl border transition-all ${
                          i === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-[#E5E4DE] bg-[#F7F6F2]'
                        }`} data-testid={`probable-range-${i}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {i === 0 && <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">TOP PICK</span>}
                            {i > 0 && <span className="bg-[#E5E4DE] text-[#5C605E] text-[9px] font-bold px-1.5 py-0.5 rounded-full">#{i + 1}</span>}
                          </div>
                          <span className={`text-base font-['Outfit'] font-bold ${i === 0 ? 'text-emerald-600' : 'text-[#1C1E1D]'}`}>
                            {r.score}%
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[#1C1E1D] mb-1">{startLabel} &rarr; {endLabel}</div>
                        <div className="text-[10px] text-[#5C605E] space-y-0.5">
                          <div>{r.days} days</div>
                          <div>{r.full_overlap_count}/{totalWithPrefs} fully available</div>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#E5E4DE] overflow-hidden">
                            <div className={`h-full rounded-full ${r.score >= 80 ? 'bg-emerald-500' : r.score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${r.score}%` }} />
                          </div>
                        </div>
                        {/* Who's in */}
                        {r.full_overlap_users?.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 flex-wrap">
                            {r.full_overlap_users.map((name, ni) => (
                              <span key={ni} className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                <Check className="w-2.5 h-2.5" />{name}
                              </span>
                            ))}
                          </div>
                        )}
                        {r.partial_overlap_users?.length > 0 && (
                          <div className="mt-1 text-[9px] text-amber-600">
                            Partial: {r.partial_overlap_users.join(', ')}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Participants with their ranges */}
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5">
              <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] mb-4 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[#2C4234]" /> Participants & Ranges
              </h3>
              <div className="space-y-3">
                {participantGrid.map((p, i) => (
                  <div key={i} className="py-2">
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
                    {/* Show ranges if any */}
                    {p.ranges && p.ranges.length > 0 && (
                      <div className="ml-9 space-y-1">
                        {p.ranges.map((r, ri) => {
                          const sLabel = new Date(r.start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const eLabel = new Date(r.end + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          return (
                            <div key={ri} className="text-[10px] text-[#5C605E] flex items-center gap-1">
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

            {/* Best Weekends */}
            {data?.best_weekends?.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5">
                <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] mb-4 flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-[#D96A53]" /> Best Weekends
                </h3>
                <div className="space-y-3">
                  {data.best_weekends.slice(0, 5).map((wk, i) => {
                    const friLabel = new Date(wk.friday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const sunLabel = new Date(wk.sunday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div key={i} className={`p-3 rounded-xl border transition-all ${
                        i === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-[#E5E4DE] bg-[#F7F6F2]'
                      }`} data-testid={`best-weekend-${i}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-[#1C1E1D]">{friLabel} – {sunLabel}</span>
                          {i === 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Best</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#E5E4DE] overflow-hidden">
                            <div className={`h-full rounded-full ${wk.score >= 80 ? 'bg-emerald-500' : wk.score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${wk.score}%` }} />
                          </div>
                          <span className="text-xs font-bold text-[#1C1E1D] w-10 text-right">{wk.score}%</span>
                        </div>
                        <div className="text-[10px] text-[#5C605E] mt-1">
                          {wk.min_available} available all 3 days
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredDate && heatmap[hoveredDate] && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed z-50 pointer-events-none"
              style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}>
              <div className="bg-[#1C1E1D] text-white rounded-xl px-4 py-3 shadow-xl text-xs min-w-[200px]">
                <div className="font-bold mb-1.5">
                  {new Date(hoveredDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                <div className="mb-2 font-medium text-sm">
                  {heatmap[hoveredDate].count}/{heatmap[hoveredDate].total_with_prefs} available
                </div>
                {heatmap[hoveredDate].available?.length > 0 && (
                  <div className="mb-1 flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                    <span><span className="text-emerald-400 font-medium">Available: </span>{heatmap[hoveredDate].available.join(', ')}</span>
                  </div>
                )}
                {heatmap[hoveredDate].unavailable?.length > 0 && (
                  <div className="mb-1 flex items-start gap-1.5">
                    <X className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                    <span><span className="text-red-400 font-medium">Unavailable: </span>{heatmap[hoveredDate].unavailable.join(', ')}</span>
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
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
