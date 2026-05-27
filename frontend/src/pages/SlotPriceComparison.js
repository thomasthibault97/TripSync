import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Plane, Hotel, Calendar, TrendingDown, ExternalLink, Award, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SlotPriceComparison() {
  const { tripId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/trips/${tripId}/slot-prices`)
      .then(r => setData(r.data))
      .catch(err => { console.error('Slot prices failed:', err); toast.error('Failed to load prices'); })
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
      <div className="w-10 h-10 border-3 border-[#2A3B32] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const comparisons = data?.comparisons || [];
  const numTravelers = data?.num_travelers || 1;
  const departureCities = data?.departure_cities || [];
  const formatDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}/availability`} className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#1A1A1A]">
            <ArrowLeft className="w-5 h-5" /> Back to availability
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2A3B32]" />
            <span className="font-['Cormorant_Garamond'] font-semibold text-lg">TripSync</span>
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8" data-testid="slot-prices-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-7 h-7 text-[#E07A5F]" />
            <h1 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl font-medium text-[#2A3B32] tracking-tight">Price Comparison</h1>
          </div>
          <p className="text-[#5C5C5C] font-['Outfit'] mb-1">Compare flight + hotel prices across your available time slots</p>
          <p className="text-xs text-[#E07A5F] font-['Outfit'] font-medium mb-8">
            <Users className="w-3.5 h-3.5 inline mr-1" />{numTravelers} travelers from {departureCities.join(', ') || 'various cities'}
          </p>

          {comparisons.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E8E4DF] p-12 text-center">
              <Plane className="w-10 h-10 text-[#E8E4DF] mx-auto mb-3" />
              <p className="text-[#5C5C5C] font-['Outfit']">Submit date ranges in preferences first to see price comparisons</p>
            </div>
          ) : (
            <div className="space-y-8">
              {comparisons.map((comp, ci) => {
                const cheapest = comp.cheapest_slot;
                return (
                  <motion.div key={comp.destination.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.05 }}
                    className="bg-white rounded-3xl border border-[#E8E4DF] overflow-hidden" data-testid={`dest-comparison-${comp.destination.id}`}>
                    {/* Header with image */}
                    <div className="relative h-40">
                      <img src={comp.destination.image} alt={comp.destination.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                        <div>
                          <h2 className="font-['Cormorant_Garamond'] text-2xl font-medium text-white">{comp.destination.name}</h2>
                          <p className="text-white/70 text-sm font-['Outfit']">{comp.destination.country}</p>
                        </div>
                        {ci === 0 && cheapest && (
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full font-['Outfit']">CHEAPEST OVERALL</span>
                        )}
                      </div>
                    </div>

                    {/* Slots */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {comp.slots.map((slot, si) => {
                          const isCheapest = cheapest && slot.start === cheapest.start && slot.end === cheapest.end;
                          return (
                            <div key={`${slot.start}-${slot.end}`}
                              className={`rounded-2xl border-2 p-4 transition-all ${isCheapest ? 'border-emerald-300 bg-emerald-50' : 'border-[#E8E4DF]'}`}
                              data-testid={`slot-${comp.destination.id}-${si}`}>
                              {isCheapest && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-['Outfit']">BEST PRICE</span>}
                              <div className="flex items-center gap-1 mt-2 mb-3">
                                <Calendar className="w-3.5 h-3.5 text-[#5C5C5C]" />
                                <span className="text-sm font-['Outfit'] font-medium text-[#1A1A1A]">{formatDate(slot.start)} &rarr; {formatDate(slot.end)}</span>
                              </div>
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center justify-between text-xs font-['Outfit']">
                                  <span className="flex items-center gap-1 text-[#5C5C5C]"><Plane className="w-3 h-3" /> Flight</span>
                                  <span className="font-medium text-[#1A1A1A]">{slot.flight_price_pp} {slot.currency}/pp</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-['Outfit']">
                                  <span className="flex items-center gap-1 text-[#5C5C5C]"><Hotel className="w-3 h-3" /> Hotel ({slot.nights}n)</span>
                                  <span className="font-medium text-[#1A1A1A]">{slot.hotel_per_night}/night</span>
                                </div>
                              </div>
                              <div className="border-t border-[#E8E4DF] pt-2 flex justify-between items-center">
                                <div>
                                  <div className={`text-lg font-['Outfit'] font-bold ${isCheapest ? 'text-emerald-700' : 'text-[#1A1A1A]'}`}>{slot.per_person_total} {slot.currency}</div>
                                  <div className="text-[10px] text-[#5C5C5C]">per person</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-['Outfit'] font-medium text-[#5C5C5C]">{slot.group_total} {slot.currency}</div>
                                  <div className="text-[10px] text-[#5C5C5C]">group ({slot.num_travelers})</div>
                                </div>
                              </div>
                              {slot.flight_link && (
                                <a href={slot.flight_link} target="_blank" rel="noopener noreferrer"
                                  className="mt-2 flex items-center gap-1 text-[10px] text-[#E07A5F] hover:underline font-['Outfit']">
                                  <ExternalLink className="w-3 h-3" /> Search flights
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Accommodation & Restaurant links */}
                      {(comp.accommodations?.length > 0 || comp.restaurants?.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-[#E8E4DF] grid grid-cols-2 gap-4">
                          {comp.accommodations?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-['Outfit'] font-bold text-[#5C5C5C] uppercase tracking-wider mb-2">Accommodations</h4>
                              {comp.accommodations.map(acc => (
                                <a key={acc.name} href={acc.link} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center justify-between text-xs py-1 hover:text-[#E07A5F]">
                                  <span className="text-[#1A1A1A] font-['Outfit']">{acc.name}</span>
                                  <span className="text-[#5C5C5C]">{acc.price_night}/n <ExternalLink className="w-2.5 h-2.5 inline" /></span>
                                </a>
                              ))}
                            </div>
                          )}
                          {comp.restaurants?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-['Outfit'] font-bold text-[#5C5C5C] uppercase tracking-wider mb-2">Restaurants</h4>
                              {comp.restaurants.map(rest => (
                                <a key={rest.name} href={rest.link} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center justify-between text-xs py-1 hover:text-[#E07A5F]">
                                  <span className="text-[#1A1A1A] font-['Outfit']">{rest.name}</span>
                                  <span className="text-[#5C5C5C]">{rest.price_range} <ExternalLink className="w-2.5 h-2.5 inline" /></span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
