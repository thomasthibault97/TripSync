import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Sparkles, MapPin, Wallet, Clock, ArrowRight, Award, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function ScoreRing({ score, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#D96A53' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E4DE" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="score-ring" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-['Outfit'] font-medium" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export default function Recommendations() {
  const { tripId } = useParams();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    api.get(`/trips/${tripId}/recommendations`).then(r => setRecs(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [tripId]);

  const getAiSummary = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/trips/${tripId}/ai-summary`);
      setAiSummary(data.summary);
    } catch {
      toast.error('AI summary failed');
    } finally {
      setAiLoading(false);
    }
  };

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

      <div className="max-w-7xl mx-auto px-6 py-8" data-testid="recommendations-page">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D]">Recommended Destinations</h1>
            <p className="text-[#5C605E] mt-1">Ranked by group compatibility score</p>
          </div>
          <Button onClick={getAiSummary} disabled={aiLoading}
            className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-5" data-testid="ai-summary-btn">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI Group Summary
          </Button>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#2C4234] rounded-2xl p-6 text-white mb-8" data-testid="ai-summary-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-[#D96A53]" />
              <h3 className="font-['Outfit'] font-medium">AI Trip Advisor</h3>
            </div>
            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-[#E5E4DE]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recs.map((rec, i) => (
              <motion.div key={rec.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(44,66,52,0.08)] transition-all duration-300">
                <div className="relative h-48">
                  <img src={rec.image} alt={rec.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-4 right-4">
                    <ScoreRing score={rec.match_score?.overall || 0} />
                  </div>
                  {rec.badges?.length > 0 && (
                    <div className="absolute top-4 left-4 flex gap-2">
                      {rec.badges.map((b, j) => (
                        <span key={j} className="bg-[#D96A53] text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" /> {b}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4">
                    <h3 className="font-['Outfit'] text-xl font-medium text-white">{rec.name}</h3>
                    <span className="text-white/70 text-sm">{rec.country}</span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-[#5C605E] mb-4 line-clamp-2">{rec.description}</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Wallet className="w-4 h-4 text-[#D96A53]" />
                      <span className="text-[#1C1E1D] font-medium">{rec.avg_budget_per_person} {rec.currency}/pp</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-[#2C4234]" />
                      <span className="text-[#5C605E]">{rec.types?.slice(0, 3).join(', ')}</span>
                    </div>
                  </div>
                  {/* Score Breakdown */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {[
                      { label: 'Budget', val: rec.match_score?.budget },
                      { label: 'Dates', val: rec.match_score?.date_fit },
                      { label: 'Access', val: rec.match_score?.convenience },
                      { label: 'Match', val: rec.match_score?.preference },
                      { label: 'Time', val: rec.match_score?.time_fit },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className={`text-xs font-medium ${(s.val || 0) >= 70 ? 'text-green-600' : (s.val || 0) >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.val || 0}</div>
                        <div className="text-[10px] text-[#5C605E]">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Departure cities */}
                  {rec.match_score?.departure_cities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rec.match_score.departure_cities.map((dc, j) => (
                        <span key={j} className="text-[10px] bg-[#2C4234]/5 text-[#2C4234] px-2 py-0.5 rounded-full">
                          {dc.user?.split(' ')[0]}: {dc.city}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Time consensus */}
                  {rec.match_score?.time_summary?.best_departure && rec.match_score.time_summary.best_departure !== 'flexible' && (
                    <div className="text-[10px] text-[#5C605E] mb-3 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Best departure: {rec.match_score.time_summary.best_departure.replace('_', ' ')} · Return: {rec.match_score.time_summary.best_return?.replace('_', ' ') || 'flexible'}
                    </div>
                  )}
                  {rec.match_score?.notes?.length > 0 && (
                    <div className="text-xs text-[#5C605E] mb-4 space-y-1">
                      {rec.match_score.notes.slice(0, 2).map((n, j) => (
                        <div key={j} className="flex items-start gap-1">
                          <span className="text-amber-500 mt-0.5">*</span> {n}
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to={`/trip/${tripId}/destination/${rec.id}`} data-testid={`dest-detail-${rec.id}`}>
                    <Button className="w-full bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl">
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
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
