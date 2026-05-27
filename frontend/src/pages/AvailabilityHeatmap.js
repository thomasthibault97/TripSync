import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Calendar, ChevronLeft, ChevronRight, Check, X, Sparkles, Lock, Unlock, Share2, Copy, Link2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import HeatmapTooltip from '@/components/heatmap/HeatmapTooltip';
import BestPeriodsSection from '@/components/heatmap/BestPeriodsSection';
import { MostProbableRanges, ParticipantRangesSidebar, BestWeekendsSidebar } from '@/components/heatmap/HeatmapSidebar';

const MONTH_NAMES_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function AvailabilityHeatmap() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [locking, setLocking] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const fetchData = () => {
    api.get(`/trips/${tripId}/availability-heatmap`)
      .then(r => {
        setData(r.data);
        if (r.data.guest_share_token) {
          setShareLink(`${window.location.origin}/guest/${r.data.guest_share_token}`);
        }
      })
      .catch(() => toast.error('Failed to load availability'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const lockedDates = data?.locked_dates || null;
  const isOwner = data?.is_owner || false;
  const autoLockSuggestion = data?.auto_lock_suggestion || null;

  const handleLockDates = async (start, end) => {
    setLocking(true);
    try {
      await api.post(`/trips/${tripId}/lock-dates`, { start, end });
      toast.success('Dates locked! All participants have been notified.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to lock dates');
    } finally {
      setLocking(false);
    }
  };

  const handleUnlockDates = async () => {
    setLocking(true);
    try {
      await api.post(`/trips/${tripId}/unlock-dates`);
      toast.success('Dates unlocked.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unlock dates');
    } finally {
      setLocking(false);
    }
  };

  const handleGenerateShareLink = async () => {
    setGeneratingLink(true);
    try {
      const { data: result } = await api.post(`/trips/${tripId}/guest-share-link`);
      const link = `${window.location.origin}/guest/${result.token}`;
      setShareLink(link);
      navigator.clipboard.writeText(link);
      setShareCopied(true);
      toast.success('Share link created and copied!');
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) {
      toast.error('Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setShareCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setShareCopied(false), 2000);
  };

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

        {/* Locked Dates Banner */}
        {lockedDates && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6" data-testid="locked-dates-banner">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-bold text-emerald-800 text-base">Dates Locked In!</h3>
                  <p className="text-sm text-emerald-700">
                    {new Date(lockedDates.start + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })} &rarr; {new Date(lockedDates.end + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Locked by {lockedDates.locked_by}</p>
                </div>
              </div>
              {isOwner && (
                <Button onClick={handleUnlockDates} disabled={locking} variant="outline"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-xl" data-testid="unlock-dates-btn">
                  <Unlock className="w-4 h-4 mr-1" /> {locking ? 'Unlocking...' : 'Unlock dates'}
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Auto-suggestion Banner - All participants overlap */}
        {autoLockSuggestion && !lockedDates && isOwner && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mb-6" data-testid="auto-lock-suggestion">
            <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] font-bold text-lg">Everyone agrees!</h3>
                    <p className="text-white/90 text-sm">{autoLockSuggestion.message}</p>
                    <p className="text-white/70 text-xs mt-0.5">{autoLockSuggestion.days} days &middot; All {totalWithPrefs} participants available</p>
                  </div>
                </div>
                <Button onClick={() => handleLockDates(autoLockSuggestion.start, autoLockSuggestion.end)} disabled={locking}
                  className="bg-white text-emerald-700 hover:bg-white/90 rounded-full px-6 py-5 font-['Outfit'] font-bold shadow-lg" data-testid="auto-lock-btn">
                  <Lock className="w-4 h-4 mr-2" /> {locking ? 'Locking...' : 'Lock these dates now'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Share Availability Link */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6" data-testid="share-link-section">
          <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D96A53]/10 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-[#D96A53]" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] text-sm">Share with non-members</h3>
                  <p className="text-[10px] text-[#5C605E]">Let friends share their dates without creating an account</p>
                </div>
              </div>
              {shareLink ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-initial bg-[#F7F6F2] rounded-lg px-3 py-2 text-xs text-[#5C605E] truncate border border-[#E5E4DE] max-w-[300px]">
                    <Link2 className="w-3 h-3 inline mr-1" />{shareLink}
                  </div>
                  <Button onClick={copyShareLink} size="sm" className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-lg px-3" data-testid="copy-share-link-btn">
                    {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleGenerateShareLink} disabled={generatingLink} size="sm"
                  className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl" data-testid="generate-share-link-btn">
                  <Share2 className="w-3.5 h-3.5 mr-1" /> {generatingLink ? 'Creating...' : 'Create share link'}
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Row */}
        {lockedDates && (
          <div className="flex gap-3 mb-6 flex-wrap">
            <Link to={`/trip/${tripId}/slot-prices`}>
              <Button variant="outline" className="rounded-full border-[#E8E4DF] font-['Outfit'] hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700" data-testid="compare-prices-link">
                <Calendar className="w-4 h-4 mr-1.5" /> Compare Prices per Slot
              </Button>
            </Link>
            <Link to={`/trip/${tripId}/flights`}>
              <Button variant="outline" className="rounded-full border-[#E8E4DF] font-['Outfit'] hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700" data-testid="coordinate-flights-link">
                <Sparkles className="w-4 h-4 mr-1.5" /> Coordinate Group Flights
              </Button>
            </Link>
            <Link to={`/trip/${tripId}/budget`}>
              <Button variant="outline" className="rounded-full border-[#E8E4DF] font-['Outfit'] hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700" data-testid="budget-link">
                <Calendar className="w-4 h-4 mr-1.5" /> Budget Tracker
              </Button>
            </Link>
          </div>
        )}

        <BestPeriodsSection bestPeriods={bestPeriods} heatmap={heatmap} totalWithPrefs={totalWithPrefs} />

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
            <MostProbableRanges ranges={mostProbableRanges} totalWithPrefs={totalWithPrefs}
              isOwner={isOwner} lockedDates={lockedDates} locking={locking} onLock={handleLockDates} />
            <ParticipantRangesSidebar participantGrid={participantGrid} />
            <BestWeekendsSidebar weekends={data?.best_weekends} />
          </div>
        </div>

        {/* Tooltip */}
        <HeatmapTooltip hoveredDate={hoveredDate} heatmap={heatmap} tooltipPos={tooltipPos} isInBestPeriod={isInBestPeriod} />
      </div>
    </div>
  );
}
