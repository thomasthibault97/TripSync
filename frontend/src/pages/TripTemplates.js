import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, ArrowRight, Users, Wallet, MapPin, Sparkles, Star, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const TYPE_COLORS = {
  evg: "from-orange-500 to-red-500", evjf: "from-pink-500 to-rose-500",
  romantic: "from-red-400 to-pink-500", birthday: "from-purple-500 to-violet-500",
  family: "from-green-500 to-emerald-500", adventure: "from-amber-500 to-orange-500",
  city_break: "from-blue-500 to-indigo-500", beach: "from-cyan-400 to-blue-500",
};

export default function TripTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/templates').then(r => setTemplates(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleUseTemplate = async (templateId) => {
    setCreating(templateId);
    try {
      const { data } = await api.post(`/trips/from-template/${templateId}`);
      toast.success('Trip created from template!');
      navigate(`/trip/${data.id}`);
    } catch {
      toast.error('Failed to create trip');
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-lg text-[#1C1E1D]">TripSync</span>
          </Link>
          <Link to="/create-trip">
            <Button size="sm" variant="outline" className="rounded-xl border-[#E5E4DE]">Custom Trip</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8" data-testid="trip-templates-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#D96A53]/10 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-4 h-4 text-[#D96A53]" />
            <span className="text-[#D96A53] text-sm font-medium">Quick Start</span>
          </div>
          <h1 className="font-['Outfit'] text-3xl lg:text-4xl font-medium text-[#1C1E1D] tracking-tight">Trip Templates</h1>
          <p className="text-[#5C605E] mt-2 max-w-lg mx-auto">Pre-built trip plans curated by travelers. Pick one and customize it.</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-white rounded-2xl animate-pulse border border-[#E5E4DE]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(44,66,52,0.08)] transition-all duration-300 group">
                <div className="relative h-44">
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className={`bg-gradient-to-r ${TYPE_COLORS[t.trip_type] || 'from-gray-500 to-gray-600'} text-white text-[10px] font-medium px-3 py-1 rounded-full`}>
                      {t.trip_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-white text-xs font-medium">{t.popularity}%</span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <h3 className="font-['Outfit'] text-lg font-medium text-white">{t.name}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-[#5C605E] mb-4 line-clamp-2">{t.description}</p>
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div>
                      <Users className="w-4 h-4 text-[#2C4234] mx-auto mb-1" />
                      <div className="text-xs font-medium text-[#1C1E1D]">{t.group_size}</div>
                      <div className="text-[10px] text-[#5C605E]">people</div>
                    </div>
                    <div>
                      <Wallet className="w-4 h-4 text-[#D96A53] mx-auto mb-1" />
                      <div className="text-xs font-medium text-[#1C1E1D]">{t.per_person_budget}</div>
                      <div className="text-[10px] text-[#5C605E]">{t.currency}/pp</div>
                    </div>
                    <div>
                      <Clock className="w-4 h-4 text-[#2C4234] mx-auto mb-1" />
                      <div className="text-xs font-medium text-[#1C1E1D]">{t.duration_days}</div>
                      <div className="text-[10px] text-[#5C605E]">days</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {t.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-[#2C4234]/5 text-[#2C4234] px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <Button onClick={() => handleUseTemplate(t.id)} disabled={creating === t.id}
                    className="w-full bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl text-sm"
                    data-testid={`use-template-${t.id}`}>
                    {creating === t.id ? 'Creating...' : 'Use This Template'} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
