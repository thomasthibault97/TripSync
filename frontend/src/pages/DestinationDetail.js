import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, ArrowLeft, Plane, Train, Car, Hotel, Utensils, MapPin, ExternalLink, Wallet, Clock, Star, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DestinationDetail() {
  const { tripId, destId } = useParams();
  const [dest, setDest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/destinations/${destId}`).then(r => setDest(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [destId]);

  if (loading || !dest) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const transportIcon = (type) => {
    if (type === 'plane') return <Plane className="w-4 h-4" />;
    if (type === 'train') return <Train className="w-4 h-4" />;
    return <Car className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}/recommendations`} className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Back to recommendations
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2C4234]" />
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div data-testid="destination-detail-page">
        {/* Hero */}
        <div className="relative h-72 md:h-96">
          <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="max-w-7xl mx-auto">
              <h1 className="font-['Outfit'] text-4xl lg:text-5xl font-medium text-white mb-2">{dest.name}</h1>
              <p className="text-white/70">{dest.country}</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Quick info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 -mt-12 relative z-10">
            <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE] shadow-sm">
              <Wallet className="w-5 h-5 text-[#D96A53] mb-2" />
              <div className="text-xl font-['Outfit'] font-medium text-[#1C1E1D]">{dest.avg_budget_per_person} {dest.currency}</div>
              <div className="text-xs text-[#5C605E]">Avg. per person</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE] shadow-sm">
              <MapPin className="w-5 h-5 text-[#2C4234] mb-2" />
              <div className="text-sm font-medium text-[#1C1E1D]">{dest.types?.slice(0, 3).join(', ')}</div>
              <div className="text-xs text-[#5C605E]">Destination type</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE] shadow-sm">
              <Clock className="w-5 h-5 text-[#D96A53] mb-2" />
              <div className="text-sm font-medium text-[#1C1E1D]">{dest.best_months?.slice(0, 4).join(', ')}</div>
              <div className="text-xs text-[#5C605E]">Best months</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE] shadow-sm">
              <Star className="w-5 h-5 text-amber-500 mb-2" />
              <div className="flex flex-wrap gap-1">
                {dest.trip_type_tags?.slice(0, 4).map(t => (
                  <span key={t} className="text-xs bg-[#2C4234]/10 text-[#2C4234] px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
              <div className="text-xs text-[#5C605E] mt-1">Trip types</div>
            </div>
          </div>

          <p className="text-[#5C605E] max-w-3xl mb-8">{dest.description}</p>

          <Tabs defaultValue="transport" className="w-full">
            <TabsList className="bg-white border border-[#E5E4DE] rounded-xl p-1 mb-6">
              <TabsTrigger value="transport" className="rounded-lg text-sm data-[state=active]:bg-[#2C4234] data-[state=active]:text-white">Transport</TabsTrigger>
              <TabsTrigger value="accommodation" className="rounded-lg text-sm data-[state=active]:bg-[#2C4234] data-[state=active]:text-white">Stay</TabsTrigger>
              <TabsTrigger value="restaurants" className="rounded-lg text-sm data-[state=active]:bg-[#2C4234] data-[state=active]:text-white">Eat</TabsTrigger>
              <TabsTrigger value="activities" className="rounded-lg text-sm data-[state=active]:bg-[#2C4234] data-[state=active]:text-white">Do</TabsTrigger>
              <TabsTrigger value="transfers" className="rounded-lg text-sm data-[state=active]:bg-[#2C4234] data-[state=active]:text-white">Transfers</TabsTrigger>
            </TabsList>

            <TabsContent value="transport">
              <div className="space-y-4">
                {Object.entries(dest.transport_from || {}).map(([city, modes]) => (
                  <div key={city} className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
                    <h4 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-3">From {city}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(modes).map(([mode, info]) => (
                        <div key={mode} className="flex items-center justify-between p-3 bg-[#F7F6F2] rounded-xl">
                          <div className="flex items-center gap-3">
                            {transportIcon(mode)}
                            <div>
                              <div className="text-sm font-medium text-[#1C1E1D] capitalize">{mode}</div>
                              <div className="text-xs text-[#5C605E]">{info.duration}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-[#D96A53]">{info.price} EUR</span>
                            {info.link && (
                              <a href={info.link} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="rounded-lg text-xs border-[#E5E4DE]" data-testid={`book-${city}-${mode}`}>
                                  Book <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="accommodation">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dest.accommodations?.map((acc, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="trip-badge bg-[#2C4234]/10 text-[#2C4234] text-xs">{acc.type}</span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-current" /> <span className="text-xs">{acc.rating}</span>
                      </div>
                    </div>
                    <h4 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-1">{acc.name}</h4>
                    <div className="text-sm text-[#D96A53] font-medium mb-3">{acc.price_night} EUR/night</div>
                    <a href={acc.link} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl text-sm" data-testid={`book-acc-${i}`}>
                        View on {acc.type === 'airbnb' ? 'Airbnb' : 'Booking.com'} <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="restaurants">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dest.restaurants?.map((r, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#5C605E]">{r.cuisine}</span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-current" /> <span className="text-xs">{r.rating}</span>
                      </div>
                    </div>
                    <h4 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-1">{r.name}</h4>
                    <div className="text-sm text-[#5C605E] mb-3">{r.price_range}</div>
                    <a href={r.link} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full rounded-xl text-sm border-[#E5E4DE]" data-testid={`view-restaurant-${i}`}>
                        <Utensils className="w-3 h-3 mr-1" /> View on Maps <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activities">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dest.activities?.map((a, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#E5E4DE] flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[#D96A53] font-medium uppercase tracking-wider mb-1">{a.type}</div>
                      <h4 className="font-['Outfit'] font-medium text-[#1C1E1D]">{a.name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#5C605E]">
                        <span><Clock className="w-3 h-3 inline mr-1" />{a.duration}</span>
                        <span><Wallet className="w-3 h-3 inline mr-1" />{a.price === 0 ? 'Free' : `${a.price} EUR`}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="transfers">
              {dest.transfers?.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-[#E5E4DE] mb-4">
                  <h4 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-3">{t.from} → {t.to}</h4>
                  <div className="space-y-3">
                    {t.options?.map((o, j) => (
                      <div key={j} className="flex items-center justify-between p-3 bg-[#F7F6F2] rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-[#1C1E1D]">{o.type}</div>
                          <div className="text-xs text-[#5C605E]">{o.duration}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#D96A53]">{o.price} EUR</span>
                          {o.link && (
                            <a href={o.link} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="rounded-lg text-xs border-[#E5E4DE]">
                                Book <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-8">
            <Link to={`/trip/${tripId}/voting`}>
              <Button className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-6" data-testid="vote-for-dest-btn">
                Vote for {dest.name} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to={`/trip/${tripId}/recommendations`}>
              <Button variant="outline" className="rounded-xl border-[#E5E4DE]">
                Compare Others
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
