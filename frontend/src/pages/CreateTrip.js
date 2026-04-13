import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Globe, ArrowLeft, ArrowRight, Users, Wallet, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const TRIP_TYPES = [
  { value: "weekend", label: "Weekend Getaway", icon: "🌴", desc: "2-3 day escape" },
  { value: "evg", label: "EVG / Bachelor Party", icon: "🎉", desc: "Legendary stag do" },
  { value: "evjf", label: "EVJF / Bachelorette", icon: "💃", desc: "Girls trip to remember" },
  { value: "birthday", label: "Birthday Trip", icon: "🎂", desc: "Celebrate in style" },
  { value: "romantic", label: "Romantic Getaway", icon: "❤️", desc: "Couples escape" },
  { value: "family", label: "Family Trip", icon: "👨‍👩‍👧‍👦", desc: "All ages welcome" },
  { value: "adventure", label: "Adventure Trip", icon: "⛰️", desc: "Thrill seekers" },
  { value: "beach", label: "Beach & Relax", icon: "🏖️", desc: "Sun and sand" },
  { value: "city_break", label: "City Break", icon: "🏙️", desc: "Urban exploration" },
];

export default function CreateTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', trip_type: '', description: '',
    group_size: 4, per_person_budget: 500, currency: 'EUR',
    start_date: '', end_date: '', flexible_dates: true
  });

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleCreate = async () => {
    if (!form.name || !form.trip_type) {
      toast.error('Please fill in trip name and type');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/trips', form);
      toast.success('Trip created! Share the invite link with your group.');
      navigate(`/trip/${data.id}`);
    } catch (err) {
      toast.error('Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D] transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-lg text-[#1C1E1D]">TripSync</span>
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10" data-testid="create-trip-page">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-[#2C4234]' : 'bg-[#E5E4DE]'}`} />
          ))}
        </div>

        {/* Step 1: Trip Type */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D] mb-2">What's the occasion?</h1>
            <p className="text-[#5C605E] mb-8">Choose the type of trip you're planning</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TRIP_TYPES.map(tt => (
                <button key={tt.value} onClick={() => { update('trip_type', tt.value); setStep(2); }}
                  data-testid={`trip-type-${tt.value}`}
                  className={`p-5 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-0.5
                    ${form.trip_type === tt.value ? 'border-[#2C4234] bg-[#2C4234]/5 shadow-sm' : 'border-[#E5E4DE] bg-white hover:border-[#2C4234]/30'}`}>
                  <div className="text-2xl mb-2">{tt.icon}</div>
                  <div className="font-['Outfit'] font-medium text-[#1C1E1D] text-sm">{tt.label}</div>
                  <div className="text-xs text-[#5C605E] mt-0.5">{tt.desc}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D] mb-2">Trip details</h1>
              <p className="text-[#5C605E]">Give your trip a name and set the basics</p>
            </div>
            <div>
              <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block">Trip Name</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="e.g., Thomas's Bachelor in Barcelona"
                className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="trip-name-input" />
            </div>
            <div>
              <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block">Description (optional)</Label>
              <Textarea value={form.description} onChange={e => update('description', e.target.value)}
                placeholder="Any notes about the trip..."
                className="rounded-xl border-[#E5E4DE] bg-white min-h-[80px]" data-testid="trip-description-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Group Size
                </Label>
                <Input type="number" min={2} max={20} value={form.group_size}
                  onChange={e => update('group_size', parseInt(e.target.value) || 2)}
                  className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="group-size-input" />
              </div>
              <div>
                <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" /> Budget/Person
                </Label>
                <div className="flex gap-2">
                  <Input type="number" min={50} value={form.per_person_budget}
                    onChange={e => update('per_person_budget', parseInt(e.target.value) || 50)}
                    className="h-12 rounded-xl border-[#E5E4DE] bg-white flex-1" data-testid="budget-input" />
                  <Select value={form.currency} onValueChange={v => update('currency', v)}>
                    <SelectTrigger className="h-12 w-24 rounded-xl border-[#E5E4DE] bg-white" data-testid="currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl text-[#5C605E]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-6"
                data-testid="next-step-btn" disabled={!form.name}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Dates */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D] mb-2">When?</h1>
              <p className="text-[#5C605E]">Set dates or let the group decide</p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E5E4DE]">
              <Switch checked={form.flexible_dates} onCheckedChange={v => update('flexible_dates', v)}
                data-testid="flexible-dates-switch" />
              <div>
                <div className="text-sm font-medium text-[#1C1E1D]">Flexible dates</div>
                <div className="text-xs text-[#5C605E]">Let participants suggest their availability</div>
              </div>
            </div>
            {!form.flexible_dates && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Start Date
                  </Label>
                  <Input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)}
                    className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="start-date-input" />
                </div>
                <div>
                  <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> End Date
                  </Label>
                  <Input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)}
                    className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="end-date-input" />
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-6 mt-4">
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-3">Trip Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[#5C605E]">Type:</span> <span className="text-[#1C1E1D] font-medium">{TRIP_TYPES.find(t => t.value === form.trip_type)?.label}</span></div>
                <div><span className="text-[#5C605E]">Group:</span> <span className="text-[#1C1E1D] font-medium">{form.group_size} people</span></div>
                <div><span className="text-[#5C605E]">Budget:</span> <span className="text-[#1C1E1D] font-medium">{form.per_person_budget} {form.currency}/person</span></div>
                <div><span className="text-[#5C605E]">Total:</span> <span className="text-[#D96A53] font-medium">{form.per_person_budget * form.group_size} {form.currency}</span></div>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl text-[#5C605E]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}
                className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-8"
                data-testid="create-trip-submit-btn">
                {loading ? 'Creating...' : 'Create Trip'} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
