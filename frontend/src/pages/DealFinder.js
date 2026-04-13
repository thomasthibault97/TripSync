import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, TrendingDown, TrendingUp, Minus, Bell, BellOff, Wallet, ExternalLink, Plane, Hotel, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function TrendIcon({ trend }) {
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-500" />;
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-[#5C605E]" />;
}

export default function DealFinder() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get(`/trips/${tripId}/deals`),
      api.get('/deal-alerts')
    ]).then(([d, a]) => {
      setData(d.data);
      setAlerts(a.data || []);
    }).catch(() => toast.error('Failed to load deals')).finally(() => setLoading(false));
  }, [tripId]);

  const toggleAlert = async (destId, destName) => {
    const existing = alerts.find(a => a.destination_id === destId && a.trip_id === tripId);
    if (existing) {
      await api.delete(`/deal-alerts/${existing.id}`);
      setAlerts(prev => prev.filter(a => a.id !== existing.id));
      toast.success(`Alert removed for ${destName}`);
    } else {
      const { data: alert } = await api.post('/deal-alerts', {
        trip_id: tripId, destination_id: destId,
        max_budget: data?.budget_target || 500, currency: data?.currency || 'EUR'
      });
      setAlerts(prev => [...prev, alert]);
      toast.success(`Alert set for ${destName}! We'll notify you when prices drop.`);
    }
  };

  const hasAlert = (destId) => alerts.some(a => a.destination_id === destId && a.trip_id === tripId);

  const deals = data?.deals || [];
  const filtered = filter === 'all' ? deals
    : filter === 'deals-only' ? deals.filter(d => d.is_deal)
    : [...deals].sort((a, b) => a.current_price - b.current_price);

  const dealsCount = deals.filter(d => d.is_deal).length;
  const priceDrops = deals.filter(d => d.trend === 'down').length;

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

      <div className="max-w-7xl mx-auto px-6 py-8" data-testid="deal-finder-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-7 h-7 text-[#D96A53]" />
            <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D]">Group Deal Finder</h1>
          </div>
          <p className="text-[#5C605E] mb-6">Live price monitoring across all destinations. Set alerts when prices drop below your budget.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-[#E5E4DE] text-center">
            <div className="text-2xl font-['Outfit'] font-medium text-green-600">{dealsCount}</div>
            <div className="text-xs text-[#5C605E]">Under Budget</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#E5E4DE] text-center">
            <div className="text-2xl font-['Outfit'] font-medium text-[#D96A53]">{priceDrops}</div>
            <div className="text-xs text-[#5C605E]">Price Drops</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#E5E4DE] text-center">
            <div className="text-2xl font-['Outfit'] font-medium text-[#2C4234]">{data?.budget_target || 0}</div>
            <div className="text-xs text-[#5C605E]">{data?.currency}/pp target</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'all', label: 'All Destinations' },
            { id: 'deals-only', label: `Under Budget (${dealsCount})` },
            { id: 'cheapest', label: 'Cheapest First' },
          ].map(f => (
            <Button key={f.id} onClick={() => setFilter(f.id)} variant={filter === f.id ? 'default' : 'outline'}
              className={`rounded-xl text-sm ${filter === f.id ? 'bg-[#2C4234] text-white' : 'border-[#E5E4DE]'}`}
              data-testid={`deal-filter-${f.id}`}>
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-[#E5E4DE]" />)}</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((deal, i) => (
              <motion.div key={deal.destination.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-white rounded-2xl border p-5 transition-all ${deal.is_deal ? 'border-green-200' : 'border-[#E5E4DE]'}`}>
                <div className="flex items-center gap-4">
                  <img src={deal.destination.image} alt={deal.destination.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-['Outfit'] font-medium text-[#1C1E1D]">{deal.destination.name}</h3>
                      <span className="text-xs text-[#5C605E]">{deal.destination.country}</span>
                      {deal.badge && (
                        <span className="bg-green-100 text-green-700 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> {deal.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <div className="flex items-center gap-1">
                        <Plane className="w-3 h-3 text-[#5C605E]" />
                        <span className="text-[#1C1E1D] font-medium">{deal.flight_price} {deal.currency}</span>
                        <span className="text-[10px] text-[#5C605E]">flight</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Hotel className="w-3 h-3 text-[#5C605E]" />
                        <span className="text-[#1C1E1D] font-medium">{deal.hotel_price_night} {deal.currency}</span>
                        <span className="text-[10px] text-[#5C605E]">/night</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={deal.deep_links.flights} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg border-[#E5E4DE]">
                          Flights <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </a>
                      <a href={deal.deep_links.hotels} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg border-[#E5E4DE]">
                          Hotels <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </a>
                      <a href={deal.deep_links.airbnb} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg border-[#E5E4DE]">
                          Airbnb <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </a>
                    </div>
                  </div>

                  {/* Price & Alert */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div>
                      {deal.savings > 0 && (
                        <div className="text-xs text-green-600 font-medium mb-0.5">Save {deal.savings} {deal.currency}</div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <TrendIcon trend={deal.trend} />
                        <span className={`font-['Outfit'] text-xl font-medium ${deal.is_deal ? 'text-green-600' : 'text-[#1C1E1D]'}`}>
                          {deal.current_price}
                        </span>
                        <span className="text-xs text-[#5C605E]">{deal.currency}</span>
                      </div>
                      <div className="text-[10px] text-[#5C605E]">
                        {deal.pct_change > 0 ? '+' : ''}{deal.pct_change}% vs avg
                      </div>
                    </div>
                    <button onClick={() => toggleAlert(deal.destination.id, deal.destination.name)}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all ${
                        hasAlert(deal.destination.id) ? 'bg-[#D96A53] text-white' : 'bg-[#2C4234]/5 text-[#2C4234] hover:bg-[#2C4234]/10'
                      }`}
                      data-testid={`alert-toggle-${deal.destination.id}`}>
                      {hasAlert(deal.destination.id) ? <><BellOff className="w-3 h-3" /> Alert On</> : <><Bell className="w-3 h-3" /> Set Alert</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
