import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, Plane, X, Check, Calendar, Users, Lock, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Reusable Date Range Picker for guests (same UX as preferences)
function GuestDateRangePicker({ dateRanges, onChange }) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [pendingStart, setPendingStart] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);

  const monthDate = useMemo(() => {
    return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isPast = (day) => {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };
  const isWeekend = (day) => {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const getRangeInfo = (dateStr) => {
    for (let i = 0; i < dateRanges.length; i++) {
      const r = dateRanges[i];
      if (dateStr >= r.start && dateStr <= r.end) {
        return { inRange: true, rangeIndex: i, isStart: dateStr === r.start, isEnd: dateStr === r.end, isSingle: r.start === r.end };
      }
    }
    return { inRange: false };
  };

  const isPendingStart = (dateStr) => pendingStart === dateStr;
  const isInPreview = (dateStr) => {
    if (!pendingStart || !hoveredDate) return false;
    const from = pendingStart < hoveredDate ? pendingStart : hoveredDate;
    const to = pendingStart < hoveredDate ? hoveredDate : pendingStart;
    return dateStr >= from && dateStr <= to;
  };

  const handleDateClick = (dateStr) => {
    if (!pendingStart) {
      setPendingStart(dateStr);
    } else {
      const start = pendingStart < dateStr ? pendingStart : dateStr;
      const end = pendingStart < dateStr ? dateStr : pendingStart;
      onChange([...dateRanges, { start, end }]);
      setPendingStart(null);
      setHoveredDate(null);
    }
  };

  const removeRange = (index) => onChange(dateRanges.filter((_, i) => i !== index));
  const formatDateShort = (dateStr) => new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const daysBetween = (start, end) => Math.round((new Date(end) - new Date(start)) / 86400000) + 1;

  const rangeColors = [
    { bg: 'bg-[#2C4234]', text: 'text-white', light: 'bg-[#2C4234]/15', border: 'border-[#2C4234]', dot: 'bg-[#2C4234]' },
    { bg: 'bg-[#D96A53]', text: 'text-white', light: 'bg-[#D96A53]/15', border: 'border-[#D96A53]', dot: 'bg-[#D96A53]' },
    { bg: 'bg-indigo-600', text: 'text-white', light: 'bg-indigo-100', border: 'border-indigo-500', dot: 'bg-indigo-600' },
    { bg: 'bg-amber-600', text: 'text-white', light: 'bg-amber-100', border: 'border-amber-500', dot: 'bg-amber-600' },
  ];

  return (
    <div data-testid="guest-date-range-picker">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm text-[#1C1E1D] font-medium">Select your travel dates</Label>
        <span className="text-xs text-[#D96A53] font-medium">{dateRanges.length} trip{dateRanges.length !== 1 ? 's' : ''} added</span>
      </div>
      <p className="text-[10px] text-[#5C605E] mb-3">
        {pendingStart ? `Departure: ${formatDateShort(pendingStart)} — now tap your return date` : 'Tap a departure date, then tap a return date'}
      </p>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset(p => Math.max(0, p - 1))} disabled={monthOffset === 0}
          className="text-xs text-[#5C605E] hover:text-[#1C1E1D] disabled:opacity-30 px-2 py-1">&larr; Prev</button>
        <span className="text-sm font-medium text-[#1C1E1D]">{monthLabel}</span>
        <button onClick={() => setMonthOffset(p => Math.min(5, p + 1))} disabled={monthOffset >= 5}
          className="text-xs text-[#5C605E] hover:text-[#1C1E1D] disabled:opacity-30 px-2 py-1">Next &rarr;</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-[10px] text-[#5C605E] py-1 font-medium">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const past = isPast(day);
          const wknd = isWeekend(day);
          const info = getRangeInfo(dateStr);
          const pending = isPendingStart(dateStr);
          const preview = isInPreview(dateStr);
          const colorSet = info.inRange ? rangeColors[info.rangeIndex % rangeColors.length] : null;

          let cellClass = 'text-[#1C1E1D] hover:bg-[#2C4234]/10';
          if (past) cellClass = 'text-[#E5E4DE] cursor-not-allowed';
          else if (info.inRange && (info.isStart || info.isEnd)) cellClass = `${colorSet.bg} ${colorSet.text} shadow-sm`;
          else if (info.inRange) cellClass = `${colorSet.light} text-[#1C1E1D]`;
          else if (pending) cellClass = 'bg-[#2C4234] text-white shadow-sm ring-2 ring-[#2C4234]/40 animate-pulse';
          else if (preview) cellClass = 'bg-[#2C4234]/20 text-[#1C1E1D]';
          else if (wknd) cellClass = 'bg-[#D96A53]/10 text-[#D96A53] hover:bg-[#D96A53]/20';

          return (
            <button key={day} disabled={past} onClick={() => handleDateClick(dateStr)}
              onMouseEnter={() => { if (pendingStart) setHoveredDate(dateStr); }}
              onMouseLeave={() => setHoveredDate(null)}
              data-testid={`guest-day-${dateStr}`}
              className={`w-full aspect-square rounded-lg text-xs font-medium transition-all relative ${cellClass}`}>
              {day}
              {info.isStart && !info.isSingle && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold opacity-80">DEP</span>}
              {info.isEnd && !info.isSingle && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold opacity-80">RET</span>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px] text-[#5C605E]">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#2C4234]" /> Departure / Return</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#2C4234]/15" /> Trip days</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#D96A53]/20" /> Weekend</div>
      </div>

      {pendingStart && (
        <button onClick={() => { setPendingStart(null); setHoveredDate(null); }}
          className="mt-2 text-xs text-[#D96A53] hover:underline">Cancel selection</button>
      )}

      {dateRanges.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E5E4DE] space-y-2">
          <div className="text-[10px] text-[#5C605E] uppercase tracking-wider font-medium mb-1">Your travel options</div>
          {dateRanges.map((r, i) => {
            const color = rangeColors[i % rangeColors.length];
            return (
              <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border ${color.border} bg-white`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                  <span className="text-sm font-medium text-[#1C1E1D]">{formatDateShort(r.start)} &rarr; {formatDateShort(r.end)}</span>
                  <span className="text-[10px] text-[#5C605E]">({daysBetween(r.start, r.end)} days)</span>
                </div>
                <button onClick={() => removeRange(i)} className="text-[#D96A53] hover:text-red-700 p-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GuestAvailability() {
  const { token } = useParams();
  const [tripInfo, setTripInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateRanges, setDateRanges] = useState([]);

  useEffect(() => {
    api.get(`/trips/guest/${token}`)
      .then(r => setTripInfo(r.data))
      .catch(() => toast.error('Invalid or expired link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (dateRanges.length === 0) { toast.error('Please select at least one date range'); return; }
    setSubmitting(true);
    try {
      await api.post(`/trips/guest/${token}/submit`, { name: name.trim(), email: email.trim() || null, date_ranges: dateRanges });
      setSubmitted(true);
      toast.success('Your dates have been submitted!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tripInfo) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="text-center">
        <Globe className="w-12 h-12 text-[#E5E4DE] mx-auto mb-4" />
        <h2 className="font-['Outfit'] text-xl font-bold text-[#1C1E1D] mb-2">Link not found</h2>
        <p className="text-[#5C605E]">This share link is invalid or has expired.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]" data-testid="guest-success">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-['Outfit'] text-2xl font-bold text-[#1C1E1D] mb-2">Dates submitted!</h2>
        <p className="text-[#5C605E] mb-4">
          Thanks {name}! Your travel dates for <strong>{tripInfo.name}</strong> have been shared with the group.
          The trip organizer will see your availability on the heatmap.
        </p>
        <p className="text-sm text-[#5C605E]">You can close this page now.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2]" data-testid="guest-availability-page">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-lg text-[#1C1E1D]">TripSync</span>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Trip info header */}
          <div className="bg-white rounded-2xl border border-[#E5E4DE] p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#2C4234]/10 flex items-center justify-center">
                <Plane className="w-5 h-5 text-[#2C4234]" />
              </div>
              <div>
                <h1 className="font-['Outfit'] text-xl font-bold text-[#1C1E1D]">{tripInfo.name}</h1>
                <p className="text-xs text-[#5C605E]">Organized by {tripInfo.owner_name} &middot; {tripInfo.participant_count} participants</p>
              </div>
            </div>
            <p className="text-sm text-[#5C605E]">
              You've been invited to share when you're available to travel. No account needed!
            </p>
            {tripInfo.locked_dates && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700">
                  Dates locked: {new Date(tripInfo.locked_dates.start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &rarr; {new Date(tripInfo.locked_dates.end + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {/* Already submitted guests */}
          {tripInfo.guest_submissions?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5 mb-6">
              <h3 className="font-['Outfit'] font-bold text-[#1C1E1D] mb-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[#2C4234]" /> Others who shared dates
              </h3>
              <div className="space-y-2">
                {tripInfo.guest_submissions.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-[#D96A53]/10 flex items-center justify-center text-[#D96A53] text-[9px] font-bold">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[#1C1E1D] font-medium">{g.name}</span>
                    <span className="text-[10px] text-[#5C605E]">({g.date_ranges.length} range{g.date_ranges.length !== 1 ? 's' : ''})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guest form */}
          <div className="bg-white rounded-2xl border border-[#E5E4DE] p-6 space-y-5">
            <h2 className="font-['Outfit'] text-lg font-bold text-[#1C1E1D] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D96A53]" /> Share your availability
            </h2>

            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-1.5 block">Your name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Sophie"
                className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="guest-name-input" />
            </div>

            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-1.5 block">Email (optional)</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="To receive trip updates" type="email"
                className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="guest-email-input" />
              <p className="text-[10px] text-[#5C605E] mt-1">Only used to notify you when dates are confirmed</p>
            </div>

            <GuestDateRangePicker dateRanges={dateRanges} onChange={setDateRanges} />

            <Button onClick={handleSubmit} disabled={submitting || !name.trim() || dateRanges.length === 0}
              className="w-full h-12 bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl text-base font-medium" data-testid="guest-submit-btn">
              {submitting ? 'Submitting...' : <><Send className="w-4 h-4 mr-2" /> Submit my dates</>}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
