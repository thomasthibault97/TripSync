import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Globe, ArrowLeft, Wallet, Plus, Trash2, Plane, Hotel, Utensils, MapPin, Tag, PiggyBank, TrendingUp, ChevronDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const CATEGORY_META = {
  flight: { icon: Plane, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Flight' },
  hotel: { icon: Hotel, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Hotel' },
  activity: { icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Activity' },
  food: { icon: Utensils, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Food' },
  transport: { icon: Plane, color: 'text-sky-600', bg: 'bg-sky-50', label: 'Transport' },
  custom: { icon: Tag, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Other' },
};

function BudgetRing({ pct, size = 120 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 100 ? '#ef4444' : pct >= 75 ? '#E07A5F' : '#22c55e';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8E4DF" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-['Outfit'] font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[10px] text-[#5C5C5C]">used</span>
      </div>
    </div>
  );
}

export default function BudgetTracker() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState({ category: 'custom', name: '', amount: '', per_person: true, notes: '' });
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState('person'); // person | group

  const fetchBudget = useCallback(() => {
    api.get(`/trips/${tripId}/budget`)
      .then(r => setData(r.data))
      .catch(err => { console.error('Budget fetch failed:', err); toast.error('Failed to load budget'); })
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(() => { fetchBudget(); }, [fetchBudget]);

  const loadSuggestions = async () => {
    try {
      const { data: s } = await api.get(`/trips/${tripId}/budget/suggestions`);
      setSuggestions(s.suggestions || []);
      setShowSuggestions(true);
    } catch (err) { console.error('Suggestions failed:', err); }
  };

  const addItem = async () => {
    if (!form.name.trim() || !form.amount) return;
    setAdding(true);
    try {
      await api.post(`/trips/${tripId}/budget`, { ...form, amount: parseFloat(form.amount) });
      setForm({ category: 'custom', name: '', amount: '', per_person: true, notes: '' });
      setShowAdd(false);
      fetchBudget();
      toast.success('Expense added');
    } catch (err) { console.error('Add budget item failed:', err); toast.error('Failed to add'); }
    finally { setAdding(false); }
  };

  const addSuggestion = async (item) => {
    setAdding(true);
    try {
      await api.post(`/trips/${tripId}/budget`, item);
      fetchBudget();
      toast.success(`Added: ${item.name}`);
    } catch (err) { console.error('Add suggestion failed:', err); }
    finally { setAdding(false); }
  };

  const deleteItem = async (id) => {
    try {
      await api.delete(`/trips/${tripId}/budget/${id}`);
      fetchBudget();
    } catch (err) { console.error('Delete failed:', err); toast.error('Failed to delete'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
      <div className="w-10 h-10 border-3 border-[#2A3B32] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const s = data?.summary || {};
  const items = data?.items || [];
  const displayTotal = view === 'person' ? s.total_per_person : s.total_group;
  const displayTarget = view === 'person' ? s.target_per_person : s.target_group;
  const displayRemaining = view === 'person' ? s.remaining_per_person : s.remaining_group;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}`} className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#1A1A1A]">
            <ArrowLeft className="w-5 h-5" /> Back to trip
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2A3B32]" />
            <span className="font-['Cormorant_Garamond'] font-semibold text-lg text-[#1A1A1A]">TripSync</span>
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8" data-testid="budget-tracker-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <PiggyBank className="w-7 h-7 text-[#E07A5F]" />
                <h1 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl font-medium text-[#2A3B32] tracking-tight">Trip Budget</h1>
              </div>
              <p className="text-[#5C5C5C] font-['Outfit'] text-sm">{s.group_size} travelers &middot; Target: {displayTarget} {s.currency}/pp</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-full border border-[#E8E4DF] p-1 flex">
                <button onClick={() => setView('person')} data-testid="view-person-btn"
                  className={`px-4 py-1.5 rounded-full text-xs font-['Outfit'] font-medium transition-all ${view === 'person' ? 'bg-[#2A3B32] text-white' : 'text-[#5C5C5C]'}`}>Per person</button>
                <button onClick={() => setView('group')} data-testid="view-group-btn"
                  className={`px-4 py-1.5 rounded-full text-xs font-['Outfit'] font-medium transition-all ${view === 'group' ? 'bg-[#2A3B32] text-white' : 'text-[#5C5C5C]'}`}>Group total</button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-3xl border border-[#E8E4DF] p-6 flex items-center gap-6 col-span-1">
              <BudgetRing pct={s.pct_used || 0} />
              <div>
                <div className="text-sm text-[#5C5C5C] font-['Outfit']">Spent</div>
                <div className="text-2xl font-['Outfit'] font-bold text-[#1A1A1A]">{displayTotal} {s.currency}</div>
                <div className="text-xs text-[#5C5C5C]">of {displayTarget} {s.currency}</div>
              </div>
            </div>
            <div className={`rounded-3xl border p-6 ${displayRemaining >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <TrendingUp className={`w-5 h-5 mb-2 ${displayRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              <div className="text-sm text-[#5C5C5C] font-['Outfit']">Remaining</div>
              <div className={`text-2xl font-['Outfit'] font-bold ${displayRemaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {displayRemaining} {s.currency}
              </div>
              <div className="text-xs text-[#5C5C5C]">{view === 'person' ? 'per person' : 'group total'}</div>
            </div>
            <div className="bg-white rounded-3xl border border-[#E8E4DF] p-6">
              <Wallet className="w-5 h-5 mb-2 text-[#E07A5F]" />
              <div className="text-sm text-[#5C5C5C] font-['Outfit'] mb-2">By category</div>
              <div className="space-y-1.5">
                {Object.entries(s.by_category || {}).map(([cat, amt]) => {
                  const meta = CATEGORY_META[cat] || CATEGORY_META.custom;
                  return (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span className={`${meta.color} font-medium font-['Outfit']`}>{meta.label}</span>
                      <span className="text-[#1A1A1A] font-['Outfit'] font-medium">{Math.round(amt)} {s.currency}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <Button onClick={() => setShowAdd(!showAdd)} className="bg-[#E07A5F] hover:bg-[#D26A4F] text-white rounded-full px-6 font-['Outfit']" data-testid="add-expense-btn">
              <Plus className="w-4 h-4 mr-1" /> Add expense
            </Button>
            <Button onClick={loadSuggestions} variant="outline" className="rounded-full border-[#E8E4DF] font-['Outfit']" data-testid="browse-suggestions-btn">
              <MapPin className="w-4 h-4 mr-1" /> Browse destination options
            </Button>
          </div>

          {/* Add Form */}
          <AnimatePresence>
            {showAdd && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-3xl border border-[#E8E4DF] p-6 mb-6 overflow-hidden" data-testid="add-expense-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_META).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Expense name"
                    className="rounded-xl h-11" data-testid="expense-name-input" />
                  <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="Amount"
                    className="rounded-xl h-11" data-testid="expense-amount-input" />
                  <div className="flex items-center gap-2">
                    <Switch checked={form.per_person} onCheckedChange={v => setForm(p => ({ ...p, per_person: v }))} />
                    <span className="text-sm text-[#5C5C5C] font-['Outfit']">{form.per_person ? 'Per person' : 'Group total'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addItem} disabled={adding || !form.name || !form.amount}
                    className="bg-[#2A3B32] hover:bg-[#1E2A24] text-white rounded-full px-6 font-['Outfit']" data-testid="confirm-add-btn">
                    {adding ? 'Adding...' : 'Add'}
                  </Button>
                  <Button onClick={() => setShowAdd(false)} variant="ghost" className="rounded-full font-['Outfit']">Cancel</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestions Panel */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-[#F7F5F0] rounded-3xl p-6 mb-6 overflow-hidden" data-testid="suggestions-panel">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-['Outfit'] font-bold text-[#1A1A1A]">Pre-populated options from destinations</h3>
                  <button onClick={() => setShowSuggestions(false)} className="text-xs text-[#5C5C5C] hover:text-[#1A1A1A]">Close</button>
                </div>
                {suggestions.map((dest, di) => (
                  <div key={dest.destination} className="mb-4 last:mb-0">
                    <h4 className="font-['Outfit'] font-medium text-[#2A3B32] text-sm mb-2">{dest.destination}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dest.items.slice(0, 6).map((item, ii) => {
                        const meta = CATEGORY_META[item.category] || CATEGORY_META.custom;
                        const Icon = meta.icon;
                        const stableKey = `${dest.destination}-${item.category}-${item.name}-${item.amount}`;
                        return (
                          <div key={stableKey} className="bg-white rounded-xl p-3 border border-[#E8E4DF] flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                                <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-[#1A1A1A] truncate">{item.name}</div>
                                <div className="text-[10px] text-[#5C5C5C]">{item.amount} EUR{item.per_person ? '/pp' : ' total'}</div>
                              </div>
                            </div>
                            <button onClick={() => addSuggestion(item)} disabled={adding}
                              className="text-[#E07A5F] hover:text-[#D26A4F] p-1 shrink-0" data-testid={`add-suggestion-${di}-${ii}`}>
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Items List */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF] overflow-hidden" data-testid="budget-items-list">
            <div className="px-6 py-4 border-b border-[#E8E4DF]">
              <h3 className="font-['Outfit'] font-bold text-[#1A1A1A]">Expenses ({items.length})</h3>
            </div>
            {items.length === 0 ? (
              <div className="p-12 text-center">
                <Wallet className="w-10 h-10 text-[#E8E4DF] mx-auto mb-3" />
                <p className="text-[#5C5C5C] font-['Outfit']">No expenses added yet. Start tracking your trip costs!</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E4DF]">
                {items.map((item) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.custom;
                  const Icon = meta.icon;
                  const displayAmt = view === 'person'
                    ? (item.per_person ? item.amount : Math.round(item.amount / s.group_size * 100) / 100)
                    : (item.per_person ? item.amount * s.group_size : item.amount);
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="px-6 py-3.5 flex items-center gap-4 hover:bg-[#FDFBF7] transition-colors">
                      <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#1A1A1A] font-['Outfit']">{item.name}</div>
                        <div className="text-[10px] text-[#5C5C5C]">
                          {meta.label} &middot; {item.per_person ? 'per person' : 'group total'} &middot; by {item.added_by}
                        </div>
                      </div>
                      <span className="text-sm font-['Outfit'] font-bold text-[#1A1A1A]">{displayAmt} {s.currency}</span>
                      <button onClick={() => deleteItem(item.id)} className="text-[#5C5C5C] hover:text-red-500 p-1" data-testid={`delete-item-${item.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
