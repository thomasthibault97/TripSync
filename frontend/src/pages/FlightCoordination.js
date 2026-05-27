import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Globe, ArrowLeft, Plane, Clock, Users, Check, X, ExternalLink, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function FlightCoordination() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/trips/${tripId}/flight-coordination`)
      .then(r => setData(r.data))
      .catch(err => { console.error('Flight coordination failed:', err); toast.error('Failed to load'); })
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
      <div className="w-10 h-10 border-3 border-[#2A3B32] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const coordination = data?.coordination || [];
  const travelers = data?.travelers || [];
  const travelDates = data?.travel_dates;
  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  if (!travelDates || data?.message) return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}/availability`} className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#1A1A1A]"><ArrowLeft className="w-5 h-5" /> Back</Link>
          <Globe className="w-6 h-6 text-[#2A3B32]" />
          <div className="w-20" />
        </div>
      </nav>
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <Lock className="w-12 h-12 text-[#E8E4DF] mx-auto mb-4" />
        <h2 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2A3B32] mb-2">Lock dates first</h2>
        <p className="text-[#5C5C5C] font-['Outfit']">{data?.message || 'Lock your travel dates on the availability page to coordinate flights.'}</p>
        <Link to={`/trip/${tripId}/availability`} className="inline-block mt-4 text-[#E07A5F] font-['Outfit'] font-medium hover:underline">Go to availability &rarr;</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}/availability`} className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#1A1A1A]"><ArrowLeft className="w-5 h-5" /> Back</Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2A3B32]" />
            <span className="font-['Cormorant_Garamond'] font-semibold text-lg">TripSync</span>
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8" data-testid="flight-coordination-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Plane className="w-7 h-7 text-[#E07A5F]" />
            <h1 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl font-medium text-[#2A3B32] tracking-tight">Flight Coordination</h1>
          </div>
          <p className="text-[#5C5C5C] font-['Outfit'] mb-1">Synchronized flights so everyone arrives within 1 hour of each other</p>
          <p className="text-xs text-[#5C5C5C] font-['Outfit'] mb-8">
            Travel dates: <strong>{formatDate(travelDates.start)} &rarr; {formatDate(travelDates.end)}</strong> &middot; {travelers.length} travelers
          </p>

          {/* Travelers summary */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF] p-5 mb-8">
            <h3 className="font-['Outfit'] font-bold text-[#1A1A1A] text-sm mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-[#2A3B32]" /> Travelers</h3>
            <div className="flex flex-wrap gap-3">
              {travelers.map(t => (
                <div key={t.name} className="bg-[#F7F5F0] rounded-xl px-4 py-2.5 text-xs font-['Outfit']">
                  <span className="font-medium text-[#1A1A1A]">{t.name}</span>
                  <span className="text-[#5C5C5C] ml-1">&middot; from {t.departure_city}</span>
                  {t.departure_city !== t.return_city && <span className="text-[#5C5C5C]"> &rarr; returns to {t.return_city}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Coordination results per destination */}
          <div className="space-y-6">
            {coordination.map((c, ci) => {
              const best = c.best_combination;
              return (
                <motion.div key={c.destination.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.05 }}
                  className="bg-white rounded-3xl border border-[#E8E4DF] overflow-hidden" data-testid={`coord-${c.destination.id}`}>
                  <div className="flex items-center gap-4 p-5 border-b border-[#E8E4DF]">
                    <img src={c.destination.image} alt={c.destination.name} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1">
                      <h3 className="font-['Cormorant_Garamond'] text-xl font-medium text-[#2A3B32]">{c.destination.name}</h3>
                      {best && (
                        <div className="flex items-center gap-2 mt-1">
                          {best.within_1h ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Within 1h spread
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> {best.arrival_spread_mins}min spread
                            </span>
                          )}
                          <span className="text-xs text-[#5C5C5C] font-['Outfit']">Total: {best.total_cost} EUR</span>
                        </div>
                      )}
                    </div>
                    {ci === 0 && best?.within_1h && (
                      <span className="bg-emerald-500 text-white text-[9px] font-bold px-3 py-1 rounded-full shrink-0">BEST MATCH</span>
                    )}
                  </div>

                  {best ? (
                    <div className="p-5">
                      <h4 className="text-xs font-['Outfit'] font-bold text-[#5C5C5C] uppercase tracking-wider mb-3">Best flight combination</h4>
                      <div className="space-y-2">
                        {best.flights.map((f, fi) => (
                          <div key={`${f.traveler}-${fi}`} className="flex items-center gap-3 p-3 bg-[#F7F5F0] rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-[#2A3B32]/10 flex items-center justify-center text-[#2A3B32] text-[10px] font-bold shrink-0">
                              {f.traveler.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-['Outfit'] font-medium text-[#1A1A1A]">{f.traveler}</div>
                              <div className="text-[10px] text-[#5C5C5C] font-['Outfit']">{f.from} &rarr; {f.to}</div>
                            </div>
                            <div className="text-center shrink-0">
                              <div className="text-xs font-['Outfit'] font-bold text-[#1A1A1A]">{f.departure_time}</div>
                              <div className="text-[9px] text-[#5C5C5C]">departs</div>
                            </div>
                            <Plane className="w-4 h-4 text-[#E07A5F] shrink-0" />
                            <div className="text-center shrink-0">
                              <div className="text-xs font-['Outfit'] font-bold text-emerald-600">{f.arrival_time}</div>
                              <div className="text-[9px] text-[#5C5C5C]">arrives</div>
                            </div>
                            <div className="text-right shrink-0 min-w-[60px]">
                              <div className="text-sm font-['Outfit'] font-bold text-[#1A1A1A]">{f.price} EUR</div>
                              <div className="text-[9px] text-[#5C5C5C]">{f.duration}</div>
                            </div>
                            {f.link && (
                              <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-[#E07A5F] hover:text-[#D26A4F] shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-sm text-[#5C5C5C] font-['Outfit']">
                      <X className="w-5 h-5 text-[#E8E4DF] mx-auto mb-1" />
                      No flight combination found for this destination
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
