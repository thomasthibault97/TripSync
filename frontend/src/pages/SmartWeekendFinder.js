import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Sun, Cloud, Thermometer, Wallet, Calendar, Users, Award, Sparkles, TrendingDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function WeatherIcon({ label }) {
  if (label?.includes('Hot') || label === 'Warm') return <Sun className="w-4 h-4 text-amber-500" />;
  if (label === 'Mild') return <Sun className="w-4 h-4 text-yellow-500" />;
  return <Cloud className="w-4 h-4 text-gray-400" />;
}

function ScoreDot({ score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-400';
  return <div className={`w-2.5 h-2.5 rounded-full ${color}`} />;
}

export default function SmartWeekendFinder() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, best-weather, best-value

  useEffect(() => {
    api.get(`/trips/${tripId}/smart-weekends`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load smart weekends'))
      .finally(() => setLoading(false));
  }, [tripId]);

  const suggestions = data?.suggestions || [];
  const filtered = filter === 'all' ? suggestions
    : filter === 'best-weather' ? [...suggestions].sort((a, b) => b.scores.weather - a.scores.weather)
    : [...suggestions].sort((a, b) => a.estimated_budget - b.estimated_budget);

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

      <div className="max-w-7xl mx-auto px-6 py-8" data-testid="smart-weekend-finder-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-7 h-7 text-[#D96A53]" />
            <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D]">Smart Weekend Finder</h1>
          </div>
          <p className="text-[#5C605E] mb-2">AI-matched weekends combining group availability, weather, and price trends</p>
          {data && (
            <p className="text-sm text-[#D96A53] font-medium mb-6">
              {data.common_dates_count} common dates found across {data.total_weekends} weekends
            </p>
          )}
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'all', label: 'Best Overall', icon: <Award className="w-4 h-4" /> },
            { id: 'best-weather', label: 'Best Weather', icon: <Sun className="w-4 h-4" /> },
            { id: 'best-value', label: 'Best Value', icon: <TrendingDown className="w-4 h-4" /> },
          ].map(f => (
            <Button key={f.id} onClick={() => setFilter(f.id)} variant={filter === f.id ? 'default' : 'outline'}
              className={`rounded-xl text-sm ${filter === f.id ? 'bg-[#2C4234] text-white' : 'border-[#E5E4DE] text-[#5C605E]'}`}
              data-testid={`filter-${f.id}`}>
              {f.icon} <span className="ml-1">{f.label}</span>
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-white rounded-2xl animate-pulse border border-[#E5E4DE]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-[#5C605E] mx-auto mb-4" />
            <h2 className="font-['Outfit'] text-xl font-medium text-[#1C1E1D] mb-2">No weekends found</h2>
            <p className="text-[#5C605E]">Ask participants to submit their available dates first</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.slice(0, 30).map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(44,66,52,0.08)] transition-all duration-300">
                {/* Image */}
                <div className="relative h-36">
                  <img src={s.destination.image} alt={s.destination.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {s.badge && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#D96A53] text-white text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" /> {s.badge}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-white text-xs font-medium">{s.scores.overall}/100</span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <h3 className="font-['Outfit'] text-lg font-medium text-white">{s.destination.name}</h3>
                    <span className="text-white/70 text-xs">{s.destination.country}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Weekend dates */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#E5E4DE]">
                    <Calendar className="w-4 h-4 text-[#2C4234]" />
                    <span className="text-sm font-medium text-[#1C1E1D]">
                      {new Date(s.weekend.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(s.weekend.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs text-[#5C605E] ml-auto">{s.weekend.days} days</span>
                  </div>

                  {/* Weather + Price */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <WeatherIcon label={s.weather.label} />
                        <span className="text-sm font-medium text-[#1C1E1D]">{s.weather.temp}°C</span>
                      </div>
                      <div className="text-[10px] text-[#5C605E]">{s.weather.label}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-[#D96A53]">{s.estimated_budget} {s.currency}</div>
                      <div className="text-[10px] text-[#5C605E]">per person</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-[#2C4234]" />
                        <span className="text-sm font-medium text-[#1C1E1D]">{s.available_participants}/{s.total_participants}</span>
                      </div>
                      <div className="text-[10px] text-[#5C605E]">available</div>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="space-y-1.5 mb-3">
                    {[
                      { label: 'Weather', score: s.scores.weather },
                      { label: 'Price', score: s.scores.price },
                      { label: 'Availability', score: s.scores.availability },
                    ].map(sc => (
                      <div key={sc.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#5C605E] w-16">{sc.label}</span>
                        <div className="flex-1 h-1.5 bg-[#E5E4DE] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${sc.score >= 70 ? 'bg-green-500' : sc.score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                            style={{ width: `${sc.score}%` }} />
                        </div>
                        <span className="text-[10px] text-[#5C605E] w-6 text-right">{sc.score}</span>
                      </div>
                    ))}
                  </div>

                  {/* Price trend */}
                  <div className="flex items-center gap-1 text-[10px] text-[#5C605E] mb-3">
                    <TrendingDown className="w-3 h-3" />
                    Price trend: {s.price_trend <= 0.9 ? 'Low season' : s.price_trend <= 1.1 ? 'Normal' : s.price_trend <= 1.25 ? 'Moderate' : 'Peak season'}
                    ({s.price_trend}x)
                  </div>

                  <Link to={`/trip/${tripId}/destination/${s.destination.id}`}>
                    <Button className="w-full bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl text-sm h-9"
                      data-testid={`view-weekend-${i}`}>
                      View Details <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
