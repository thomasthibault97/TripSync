import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Globe, ArrowLeft, ArrowRight, Save, MapPin, Plane, Train, Car, Clock, Thermometer, Bed, Footprints, AlertTriangle, Heart, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import DateRangePicker from '@/components/DateRangePicker';

const TRANSPORT_TYPES = [
  { id: 'plane', label: 'Plane', icon: <Plane className="w-4 h-4" /> },
  { id: 'train', label: 'Train', icon: <Train className="w-4 h-4" /> },
  { id: 'car', label: 'Car', icon: <Car className="w-4 h-4" /> },
  { id: 'mixed', label: 'Mixed', icon: <MapPin className="w-4 h-4" /> },
];

const DEST_TYPES = [
  { id: 'beach', label: 'Beach' }, { id: 'city', label: 'City' },
  { id: 'nature', label: 'Nature' }, { id: 'mountains', label: 'Mountains' },
  { id: 'culture', label: 'Culture' }, { id: 'party', label: 'Party' },
  { id: 'family-friendly', label: 'Family-friendly' }, { id: 'quiet', label: 'Quiet' },
  { id: 'luxury', label: 'Luxury' }, { id: 'adventure', label: 'Adventure' },
  { id: 'romantic', label: 'Romantic' }, { id: 'shopping', label: 'Shopping' },
];

export default function PreferencesForm() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    departure_city: '', return_city: '', same_return_city: true,
    date_start: '', date_end: '', flexible_dates: true,
    duration_days: 3, max_budget: 500, transport_types: [],
    destination_types: [], weather_preference: 'any',
    accommodation_type: 'any', travel_pace: 'moderate',
    hard_constraints: [], nice_to_haves: [],
    passport_constraint: 'none', long_distance_ok: true,
    departure_time_preference: 'flexible', return_time_preference: 'flexible',
    available_dates: [],
    date_ranges: []
  });
  const [hardConstraintInput, setHardConstraintInput] = useState('');
  const [niceToHaveInput, setNiceToHaveInput] = useState('');

  useEffect(() => {
    api.get(`/trips/${tripId}/my-preferences`).then(r => {
      if (r.data && Object.keys(r.data).length > 0) {
        setForm(prev => ({ ...prev, ...r.data }));
      }
    }).catch(() => {});
  }, [tripId]);

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggleArray = (key, val) => {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val]
    }));
  };

  const addConstraint = (type) => {
    const input = type === 'hard' ? hardConstraintInput : niceToHaveInput;
    const key = type === 'hard' ? 'hard_constraints' : 'nice_to_haves';
    if (input.trim()) {
      update(key, [...form[key], input.trim()]);
      type === 'hard' ? setHardConstraintInput('') : setNiceToHaveInput('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/trips/${tripId}/preferences`, form);
      toast.success('Preferences saved!');
      navigate(`/trip/${tripId}`);
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}`} className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Back to trip
          </Link>
          <Globe className="w-6 h-6 text-[#2C4234]" />
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl"
            data-testid="save-prefs-btn">
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8" data-testid="preferences-form-page">
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-[#2C4234]' : i === step ? 'bg-[#D96A53]' : 'bg-[#E5E4DE]'}`} />
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="font-['Outfit'] text-2xl font-bold text-[#1C1E1D] mb-1">Your travel basics</h2>
              <p className="text-[#5C605E] text-sm">Where are you traveling from, and when?</p>
            </div>
            {/* Departure & Return Cities */}
            <div>
              <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block">Departure City / Airport</Label>
              <Input value={form.departure_city} onChange={e => update('departure_city', e.target.value)}
                placeholder="e.g., Paris CDG, London Heathrow, Madrid"
                className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="departure-city-input" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E4DE]">
              <Switch checked={form.same_return_city} onCheckedChange={v => { update('same_return_city', v); if (v) update('return_city', ''); }} />
              <span className="text-sm text-[#1C1E1D]">Return to same city</span>
            </div>
            {!form.same_return_city && (
              <div>
                <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block">Return City / Airport</Label>
                <Input value={form.return_city} onChange={e => update('return_city', e.target.value)}
                  placeholder="e.g., Lyon, Marseille, different from departure"
                  className="h-12 rounded-xl border-[#E5E4DE] bg-white" data-testid="return-city-input" />
              </div>
            )}

            {/* Departure Time Preference - Card selector matching screenshot */}
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5" data-testid="departure-time-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <Label className="text-[#1C1E1D] text-sm font-bold">Departure time preference</Label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'very_early', label: 'Very Early (5h-8h)', desc: 'Maximize time at destination' },
                  { id: 'morning', label: 'Morning (8h-12h)', desc: 'Comfortable departure' },
                  { id: 'afternoon', label: 'Afternoon (12h-18h)', desc: 'Relaxed departure' },
                  { id: 'evening', label: 'Evening (18h+)', desc: 'Arrive at night' },
                  { id: 'flexible', label: 'Flexible', desc: 'Any time works' },
                ].map(t => (
                  <button key={t.id} onClick={() => update('departure_time_preference', t.id)}
                    data-testid={`dep-time-${t.id}`}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.departure_time_preference === t.id
                        ? 'border-[#D96A53] bg-[#D96A53]/5'
                        : 'border-[#E5E4DE] bg-[#F7F6F2] hover:border-[#D96A53]/30'}`}>
                    <div className="text-sm font-bold text-[#1C1E1D]">{t.label}</div>
                    <div className="text-[10px] text-[#5C605E] mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Return Time Preference */}
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5" data-testid="return-time-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Plane className="w-4 h-4 text-blue-600" />
                </div>
                <Label className="text-[#1C1E1D] text-sm font-bold">Return time preference</Label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'very_early', label: 'Very Early (5h-8h)', desc: 'Back home early' },
                  { id: 'morning', label: 'Morning (8h-12h)', desc: 'Morning departure' },
                  { id: 'afternoon', label: 'Afternoon (12h-18h)', desc: 'Last afternoon' },
                  { id: 'evening', label: 'Evening (18h+)', desc: 'Maximize last day' },
                  { id: 'flexible', label: 'Flexible', desc: 'Any time works' },
                ].map(t => (
                  <button key={t.id} onClick={() => update('return_time_preference', t.id)}
                    data-testid={`ret-time-${t.id}`}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.return_time_preference === t.id
                        ? 'border-[#D96A53] bg-[#D96A53]/5'
                        : 'border-[#E5E4DE] bg-[#F7F6F2] hover:border-[#D96A53]/30'}`}>
                    <div className="text-sm font-bold text-[#1C1E1D]">{t.label}</div>
                    <div className="text-[10px] text-[#5C605E] mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E4DE]">
              <Switch checked={form.flexible_dates} onCheckedChange={v => update('flexible_dates', v)} />
              <span className="text-sm text-[#1C1E1D]">I have multiple possible travel dates</span>
            </div>
            {form.flexible_dates ? (
              <DateRangePicker dateRanges={form.date_ranges || []} onChange={ranges => update('date_ranges', ranges)} />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-[#1C1E1D] mb-1 block">Available from</Label>
                  <Input type="date" value={form.date_start} onChange={e => update('date_start', e.target.value)}
                    className="h-12 rounded-xl border-[#E5E4DE] bg-white" />
                </div>
                <div>
                  <Label className="text-sm text-[#1C1E1D] mb-1 block">Available until</Label>
                  <Input type="date" value={form.date_end} onChange={e => update('date_end', e.target.value)}
                    className="h-12 rounded-xl border-[#E5E4DE] bg-white" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-2 block">Preferred trip duration: {form.duration_days} days</Label>
              <Slider value={[form.duration_days]} onValueChange={v => update('duration_days', v[0])}
                min={1} max={14} step={1} className="mt-2" />
            </div>
            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-2 block">Maximum budget (per person): {form.max_budget} EUR</Label>
              <Slider value={[form.max_budget]} onValueChange={v => update('max_budget', v[0])}
                min={50} max={3000} step={50} className="mt-2" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-6" data-testid="prefs-next-btn">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Transport & Destination */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="font-['Outfit'] text-2xl font-medium text-[#1C1E1D] mb-1">What do you prefer?</h2>
              <p className="text-[#5C605E] text-sm">Select your transport and destination preferences</p>
            </div>
            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-3 block">Transport (select all that work)</Label>
              <div className="grid grid-cols-2 gap-3">
                {TRANSPORT_TYPES.map(t => (
                  <button key={t.id} onClick={() => toggleArray('transport_types', t.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${form.transport_types.includes(t.id) ? 'border-[#2C4234] bg-[#2C4234]/5' : 'border-[#E5E4DE] bg-white hover:border-[#2C4234]/30'}`}>
                    {t.icon}
                    <span className="text-sm text-[#1C1E1D]">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-3 block">Destination style (select all you like)</Label>
              <div className="grid grid-cols-3 gap-2">
                {DEST_TYPES.map(d => (
                  <button key={d.id} onClick={() => toggleArray('destination_types', d.id)}
                    className={`p-2.5 rounded-xl border text-sm transition-all ${form.destination_types.includes(d.id) ? 'border-[#D96A53] bg-[#D96A53]/5 text-[#D96A53]' : 'border-[#E5E4DE] bg-white text-[#5C605E] hover:border-[#D96A53]/30'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl text-[#5C605E]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-6">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Accommodation & Pace */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="font-['Outfit'] text-2xl font-medium text-[#1C1E1D] mb-1">Your comfort zone</h2>
              <p className="text-[#5C605E] text-sm">Weather, accommodation, and travel pace</p>
            </div>
            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-1.5 block">Weather preference</Label>
              <Select value={form.weather_preference} onValueChange={v => update('weather_preference', v)}>
                <SelectTrigger className="h-12 rounded-xl border-[#E5E4DE] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">No preference</SelectItem>
                  <SelectItem value="warm">Warm & Sunny</SelectItem>
                  <SelectItem value="mild">Mild & Comfortable</SelectItem>
                  <SelectItem value="cool">Cool & Fresh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-1.5 block">Accommodation type</Label>
              <Select value={form.accommodation_type} onValueChange={v => update('accommodation_type', v)}>
                <SelectTrigger className="h-12 rounded-xl border-[#E5E4DE] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">No preference</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="airbnb">Airbnb / Apartment</SelectItem>
                  <SelectItem value="hostel">Hostel</SelectItem>
                  <SelectItem value="luxury">Luxury / Boutique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-[#1C1E1D] font-medium mb-1.5 block">Travel pace</Label>
              <Select value={form.travel_pace} onValueChange={v => update('travel_pace', v)}>
                <SelectTrigger className="h-12 rounded-xl border-[#E5E4DE] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow & Relaxed</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="fast">Fast-paced, see everything</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E5E4DE]">
              <Switch checked={form.long_distance_ok} onCheckedChange={v => update('long_distance_ok', v)} />
              <span className="text-sm text-[#1C1E1D]">OK with long-distance travel (3h+ flight)</span>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl text-[#5C605E]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-6">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Constraints */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h2 className="font-['Outfit'] text-2xl font-medium text-[#1C1E1D] mb-1">Constraints & wishes</h2>
              <p className="text-[#5C605E] text-sm">Hard limits and nice-to-haves</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <Label className="text-sm text-red-700 font-medium">Hard Constraints (must-have / cannot-do)</Label>
              </div>
              <div className="flex gap-2 mb-2">
                <Input value={hardConstraintInput} onChange={e => setHardConstraintInput(e.target.value)}
                  placeholder="e.g., No flying, Wheelchair accessible, Vegan food required"
                  className="h-10 rounded-lg border-red-200 bg-white text-sm flex-1"
                  onKeyDown={e => e.key === 'Enter' && addConstraint('hard')} data-testid="hard-constraint-input" />
                <Button onClick={() => addConstraint('hard')} size="sm" variant="outline" className="rounded-lg border-red-200 text-red-600">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.hard_constraints.map((c, i) => (
                  <span key={`hard-${c}`} className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    {c}
                    <button onClick={() => update('hard_constraints', form.hard_constraints.filter((_, j) => j !== i))} className="ml-1 hover:text-red-900">&times;</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-green-600" />
                <Label className="text-sm text-green-700 font-medium">Nice-to-Haves (soft preferences)</Label>
              </div>
              <div className="flex gap-2 mb-2">
                <Input value={niceToHaveInput} onChange={e => setNiceToHaveInput(e.target.value)}
                  placeholder="e.g., Pool, Near beach, Good nightlife, Rooftop bars"
                  className="h-10 rounded-lg border-green-200 bg-white text-sm flex-1"
                  onKeyDown={e => e.key === 'Enter' && addConstraint('nice')} data-testid="nice-to-have-input" />
                <Button onClick={() => addConstraint('nice')} size="sm" variant="outline" className="rounded-lg border-green-200 text-green-600">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.nice_to_haves.map((c, i) => (
                  <span key={`nice-${c}`} className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    {c}
                    <button onClick={() => update('nice_to_haves', form.nice_to_haves.filter((_, j) => j !== i))} className="ml-1 hover:text-green-900">&times;</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep(3)} className="rounded-xl text-[#5C605E]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSave} disabled={saving}
                className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-8"
                data-testid="submit-preferences-btn">
                {saving ? 'Saving...' : 'Submit Preferences'} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
