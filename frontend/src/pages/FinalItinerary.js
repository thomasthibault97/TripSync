import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, MapPin, Plane, Hotel, Utensils, Clock, Wallet, ExternalLink, CheckCircle, Calendar, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FinalItinerary() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [recs, setRecs] = useState([]);
  const [votes, setVotes] = useState([]);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/trips/${tripId}/recommendations`),
      api.get(`/trips/${tripId}/votes`)
    ]).then(([t, r, v]) => {
      setTrip(t.data);
      setRecs(r.data);
      setVotes(v.data);
      // Find winner (most votes)
      const tally = {};
      v.data.forEach(vote => {
        tally[vote.destination_id] = (tally[vote.destination_id] || 0) + vote.score;
      });
      const winnerId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
      const winnerDest = r.data.find(d => d.id === winnerId) || r.data[0];
      setWinner(winnerDest);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const dest = winner || recs[0];
  if (!dest) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="text-center">
        <p className="text-[#5C605E] mb-4">No destination selected yet. Vote first!</p>
        <Link to={`/trip/${tripId}/voting`}><Button className="rounded-xl">Go to Voting</Button></Link>
      </div>
    </div>
  );

  // Generate sample itinerary
  const days = [
    {
      label: "Day 1 - Arrival",
      items: [
        { time: "10:00", activity: `Arrive at ${dest.name}`, type: "travel", icon: <Plane className="w-4 h-4" /> },
        { time: "12:00", activity: "Check-in at accommodation", type: "stay", icon: <Hotel className="w-4 h-4" /> },
        { time: "13:00", activity: dest.restaurants?.[0] ? `Lunch at ${dest.restaurants[0].name}` : "Lunch", type: "food", icon: <Utensils className="w-4 h-4" />, link: dest.restaurants?.[0]?.link },
        { time: "15:00", activity: dest.activities?.[0]?.name || "Explore the area", type: "activity", icon: <MapPin className="w-4 h-4" /> },
        { time: "19:00", activity: dest.restaurants?.[1] ? `Dinner at ${dest.restaurants[1].name}` : "Dinner out", type: "food", icon: <Utensils className="w-4 h-4" />, link: dest.restaurants?.[1]?.link },
      ]
    },
    {
      label: "Day 2 - Explore",
      items: [
        { time: "09:00", activity: "Breakfast at hotel/apartment", type: "food", icon: <Utensils className="w-4 h-4" /> },
        { time: "10:00", activity: dest.activities?.[1]?.name || "Morning activity", type: "activity", icon: <MapPin className="w-4 h-4" /> },
        { time: "13:00", activity: "Lunch break", type: "food", icon: <Utensils className="w-4 h-4" /> },
        { time: "14:30", activity: dest.activities?.[2]?.name || "Afternoon exploration", type: "activity", icon: <MapPin className="w-4 h-4" /> },
        { time: "18:00", activity: "Free time / Shopping", type: "activity", icon: <MapPin className="w-4 h-4" /> },
        { time: "20:00", activity: "Group dinner", type: "food", icon: <Utensils className="w-4 h-4" /> },
      ]
    },
    {
      label: "Day 3 - Departure",
      items: [
        { time: "09:00", activity: "Breakfast & check-out", type: "stay", icon: <Hotel className="w-4 h-4" /> },
        { time: "10:00", activity: dest.activities?.[3]?.name || "Last morning activity", type: "activity", icon: <MapPin className="w-4 h-4" /> },
        { time: "12:00", activity: "Lunch", type: "food", icon: <Utensils className="w-4 h-4" /> },
        { time: "14:00", activity: "Transfer to airport/station", type: "travel", icon: <Plane className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}`} className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Back to trip
          </Link>
          <Globe className="w-6 h-6 text-[#2C4234]" />
          <div className="w-20" />
        </div>
      </nav>

      <div data-testid="final-itinerary-page">
        {/* Hero */}
        <div className="relative h-64">
          <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="max-w-5xl mx-auto flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Group Choice</span>
                </div>
                <h1 className="font-['Outfit'] text-3xl lg:text-4xl font-medium text-white">{dest.name}</h1>
                <p className="text-white/70">{dest.country}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-10 relative z-10 mb-8">
            <div className="bg-white rounded-2xl p-4 border border-[#E5E4DE] shadow-sm text-center">
              <Wallet className="w-5 h-5 text-[#D96A53] mx-auto mb-1" />
              <div className="font-medium text-[#1C1E1D]">{dest.avg_budget_per_person} {dest.currency}</div>
              <div className="text-xs text-[#5C605E]">Per person</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#E5E4DE] shadow-sm text-center">
              <Users className="w-5 h-5 text-[#2C4234] mx-auto mb-1" />
              <div className="font-medium text-[#1C1E1D]">{trip?.participants?.length || 0}</div>
              <div className="text-xs text-[#5C605E]">Travelers</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#E5E4DE] shadow-sm text-center">
              <Calendar className="w-5 h-5 text-[#D96A53] mx-auto mb-1" />
              <div className="font-medium text-[#1C1E1D]">3 days</div>
              <div className="text-xs text-[#5C605E]">Duration</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#E5E4DE] shadow-sm text-center">
              <Wallet className="w-5 h-5 text-[#2C4234] mx-auto mb-1" />
              <div className="font-medium text-[#D96A53]">{dest.avg_budget_per_person * (trip?.participants?.length || 1)} {dest.currency}</div>
              <div className="text-xs text-[#5C605E]">Total group cost</div>
            </div>
          </div>

          {/* Booking Links */}
          <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE] mb-8">
            <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-4">Quick Book</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(dest.transport_from || {}).slice(0, 1).flatMap(([city, modes]) =>
                Object.entries(modes).map(([mode, info]) => (
                  <a key={`${city}-${mode}`} href={info.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-[#F7F6F2] rounded-xl hover:bg-[#2C4234]/5 transition-all" data-testid={`quick-book-flight`}>
                    <Plane className="w-4 h-4 text-[#2C4234]" />
                    <div>
                      <div className="text-xs font-medium text-[#1C1E1D]">{mode} from {city}</div>
                      <div className="text-xs text-[#D96A53]">{info.price} EUR</div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#5C605E] ml-auto" />
                  </a>
                ))
              )}
              {dest.accommodations?.slice(0, 2).map((acc, i) => (
                <a key={i} href={acc.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-[#F7F6F2] rounded-xl hover:bg-[#2C4234]/5 transition-all" data-testid={`quick-book-hotel-${i}`}>
                  <Hotel className="w-4 h-4 text-[#2C4234]" />
                  <div>
                    <div className="text-xs font-medium text-[#1C1E1D] truncate">{acc.name}</div>
                    <div className="text-xs text-[#D96A53]">{acc.price_night} EUR/night</div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-[#5C605E] ml-auto" />
                </a>
              ))}
            </div>
          </div>

          {/* Itinerary Timeline */}
          <h2 className="font-['Outfit'] text-2xl font-medium text-[#1C1E1D] mb-6">Your Itinerary</h2>
          <div className="space-y-8">
            {days.map((day, di) => (
              <motion.div key={di} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: di * 0.1 }}>
                <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-4 text-lg">{day.label}</h3>
                <div className="space-y-0 relative">
                  <div className="absolute left-[27px] top-4 bottom-4 w-px bg-[#E5E4DE]" />
                  {day.items.map((item, ii) => (
                    <div key={ii} className="flex items-start gap-4 relative py-3">
                      <div className="w-14 text-right text-xs text-[#5C605E] font-medium pt-1">{item.time}</div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10
                        ${item.type === 'travel' ? 'bg-blue-100 text-blue-600' :
                          item.type === 'food' ? 'bg-orange-100 text-orange-600' :
                          item.type === 'stay' ? 'bg-purple-100 text-purple-600' :
                          'bg-[#2C4234]/10 text-[#2C4234]'}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 bg-white rounded-xl p-3 border border-[#E5E4DE]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#1C1E1D]">{item.activity}</span>
                          {item.link && (
                            <a href={item.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 text-[#5C605E] hover:text-[#2C4234]" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
