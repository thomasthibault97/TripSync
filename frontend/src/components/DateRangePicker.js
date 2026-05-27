import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

const RANGE_COLORS = [
  { bg: 'bg-[#2C4234]', text: 'text-white', light: 'bg-[#2C4234]/15', border: 'border-[#2C4234]', dot: 'bg-[#2C4234]' },
  { bg: 'bg-[#D96A53]', text: 'text-white', light: 'bg-[#D96A53]/15', border: 'border-[#D96A53]', dot: 'bg-[#D96A53]' },
  { bg: 'bg-indigo-600', text: 'text-white', light: 'bg-indigo-100', border: 'border-indigo-500', dot: 'bg-indigo-600' },
  { bg: 'bg-amber-600', text: 'text-white', light: 'bg-amber-100', border: 'border-amber-500', dot: 'bg-amber-600' },
  { bg: 'bg-purple-600', text: 'text-white', light: 'bg-purple-100', border: 'border-purple-500', dot: 'bg-purple-600' },
];

function formatDateShort(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysBetween(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
}

function getCellClass(past, info, colorSet, pending, preview, wknd) {
  if (past) return 'text-[#E5E4DE] cursor-not-allowed';
  if (info.inRange && (info.isStart || info.isEnd)) return `${colorSet.bg} ${colorSet.text} shadow-sm`;
  if (info.inRange) return `${colorSet.light} ${colorSet.text === 'text-white' ? 'text-[#1C1E1D]' : colorSet.text}`;
  if (pending) return 'bg-[#2C4234] text-white shadow-sm ring-2 ring-[#2C4234]/40 animate-pulse';
  if (preview) return 'bg-[#2C4234]/20 text-[#1C1E1D]';
  if (wknd) return 'bg-[#D96A53]/10 text-[#D96A53] hover:bg-[#D96A53]/20';
  return 'text-[#1C1E1D] hover:bg-[#2C4234]/10';
}

export default function DateRangePicker({ dateRanges, onChange }) {
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

  const isPast = (day) => new Date(monthDate.getFullYear(), monthDate.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isWeekend = (day) => { const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).getDay(); return d === 0 || d === 6; };

  const getRangeInfo = (dateStr) => {
    for (let i = 0; i < dateRanges.length; i++) {
      const r = dateRanges[i];
      if (dateStr >= r.start && dateStr <= r.end) {
        return { inRange: true, rangeIndex: i, isStart: dateStr === r.start, isEnd: dateStr === r.end, isSingle: r.start === r.end };
      }
    }
    return { inRange: false };
  };

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

  return (
    <div className="bg-white rounded-xl border border-[#E5E4DE] p-4" data-testid="date-range-picker">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm text-[#1C1E1D] font-medium">Select your travel dates</Label>
        <span className="text-xs text-[#D96A53] font-medium">{dateRanges.length} trip{dateRanges.length !== 1 ? 's' : ''} added</span>
      </div>
      <p className="text-[10px] text-[#5C605E] mb-3">
        {pendingStart ? `Departure: ${formatDateShort(pendingStart)} — now tap your return date` : 'Tap a departure date, then tap a return date'}
      </p>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset(p => Math.max(0, p - 1))} disabled={monthOffset === 0}
          className="text-xs text-[#5C605E] hover:text-[#1C1E1D] disabled:opacity-30 px-2 py-1" data-testid="range-prev-month">&larr; Prev</button>
        <span className="text-sm font-medium text-[#1C1E1D]">{monthLabel}</span>
        <button onClick={() => setMonthOffset(p => Math.min(5, p + 1))} disabled={monthOffset >= 5}
          className="text-xs text-[#5C605E] hover:text-[#1C1E1D] disabled:opacity-30 px-2 py-1" data-testid="range-next-month">Next &rarr;</button>
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
          const pending = pendingStart === dateStr;
          const preview = isInPreview(dateStr);
          const colorSet = info.inRange ? RANGE_COLORS[info.rangeIndex % RANGE_COLORS.length] : null;
          const cellClass = getCellClass(past, info, colorSet, pending, preview, wknd);

          return (
            <button key={day} disabled={past}
              onClick={() => handleDateClick(dateStr)}
              onMouseEnter={() => { if (pendingStart) setHoveredDate(dateStr); }}
              onMouseLeave={() => setHoveredDate(null)}
              data-testid={`range-day-${dateStr}`}
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
          className="mt-2 text-xs text-[#D96A53] hover:underline" data-testid="cancel-pending-btn">Cancel selection</button>
      )}

      {dateRanges.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E5E4DE] space-y-2" data-testid="selected-ranges-list">
          <div className="text-[10px] text-[#5C605E] uppercase tracking-wider font-medium mb-1">Your travel options</div>
          {dateRanges.map((r, i) => {
            const color = RANGE_COLORS[i % RANGE_COLORS.length];
            return (
              <div key={`${r.start}-${r.end}`} className={`flex items-center justify-between p-2.5 rounded-lg border ${color.border} bg-white`}
                data-testid={`range-item-${i}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                  <span className="text-sm font-medium text-[#1C1E1D]">{formatDateShort(r.start)} &rarr; {formatDateShort(r.end)}</span>
                  <span className="text-[10px] text-[#5C605E]">({daysBetween(r.start, r.end)} days)</span>
                </div>
                <button onClick={() => onChange(dateRanges.filter((_, j) => j !== i))} className="text-[#D96A53] hover:text-red-700 p-1"
                  data-testid={`remove-range-${i}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
