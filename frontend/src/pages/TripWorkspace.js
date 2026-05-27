import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Globe, Users, Calendar, Wallet, ArrowRight, Copy, Check, MapPin, Sparkles, MessageSquare, Vote, ClipboardList, ChevronRight, CreditCard, Zap, Sun, TrendingDown, CalendarDays, BarChart3 } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import AiChatbot from '@/components/AiChatbot';
import BudgetWidget from '@/components/BudgetWidget';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const TRIP_TYPE_LABELS = {
  weekend: "Weekend", evg: "EVG / Bachelor", evjf: "EVJF / Bachelorette",
  birthday: "Birthday", romantic: "Romantic", family: "Family",
  adventure: "Adventure", beach: "Beach & Relax", city_break: "City Break",
};

export default function TripWorkspace() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const wsRef = useRef(null);

  const fetchTrip = useCallback(() => {
    api.get(`/trips/${tripId}`).then(r => setTrip(r.data)).catch(() => navigate('/dashboard')).finally(() => setLoading(false));
  }, [tripId, navigate]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  // WebSocket for live updates
  useEffect(() => {
    if (!tripId) return;
    const wsUrl = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws/trip/${tripId}`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setLiveEvents(prev => [msg, ...prev].slice(0, 10));
        if (msg.type === 'participant_joined') {
          toast.success(`${msg.data?.user_name || 'Someone'} joined the trip!`);
          fetchTrip();
        } else if (msg.type === 'preferences_updated') {
          toast.info(`${msg.data?.user_name || 'Someone'} submitted preferences`);
          fetchTrip();
        } else if (msg.type === 'vote_cast') {
          toast.info(`${msg.data?.user_name || 'Someone'} voted`);
        } else if (msg.type === 'payment_received') {
          toast.success(`${msg.data?.user_name || 'Someone'} paid ${msg.data?.amount || ''}`);
          fetchTrip();
        } else if (msg.type === 'new_comment') {
          toast.info(`${msg.data?.user_name || 'Someone'}: ${msg.data?.text?.slice(0, 50) || ''}`);
        } else if (msg.type === 'new_poll') {
          toast.info(`New poll: "${msg.data?.question || ''}"`);
        } else if (msg.type === 'poll_vote') {
          toast.info(`${msg.data?.user_name || 'Someone'} voted on a poll`);
        } else if (msg.type === 'poll_closed') {
          toast.success(`Poll closed! Winner: ${msg.data?.winner || ''}`);
        }
      } catch (err) { console.error('WebSocket message parse error:', err); }
    };
    ws.onerror = (err) => { console.error('WebSocket error:', err); };
    return () => { ws.close(); };
  }, [tripId, fetchTrip]);

  if (loading || !trip) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const participants = trip.participants || [];
  const prefsSubmitted = participants.filter(p => p.preferences_submitted).length;
  const completionPct = participants.length > 0 ? Math.round((prefsSubmitted / participants.length) * 100) : 0;
  const isOwner = trip.owner_id === user?.id;
  const myPrefs = participants.find(p => p.user_id === user?.id);
  const inviteUrl = `${window.location.origin}/join/${trip.invite_code}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <Globe className="w-6 h-6 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-lg text-[#1C1E1D]">TripSync</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <div className="w-7 h-7 rounded-full bg-[#2C4234] flex items-center justify-center text-white text-xs font-medium">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8" data-testid="trip-workspace-page">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="trip-badge bg-[#2C4234]/10 text-[#2C4234]">{TRIP_TYPE_LABELS[trip.trip_type] || trip.trip_type}</span>
            <span className="text-xs text-[#5C605E] px-2 py-0.5 bg-[#E5E4DE] rounded-full">{trip.status}</span>
          </div>
          <h1 className="font-['Outfit'] text-3xl lg:text-4xl font-medium text-[#1C1E1D] mb-2">{trip.name}</h1>
          {trip.description && <p className="text-[#5C605E] max-w-2xl">{trip.description}</p>}
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <Users className="w-5 h-5 text-[#2C4234] mb-2" />
            <div className="text-2xl font-['Outfit'] font-medium text-[#1C1E1D]">{participants.length}/{trip.group_size}</div>
            <div className="text-xs text-[#5C605E]">Participants</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <ClipboardList className="w-5 h-5 text-[#D96A53] mb-2" />
            <div className="text-2xl font-['Outfit'] font-medium text-[#1C1E1D]">{prefsSubmitted}/{participants.length}</div>
            <div className="text-xs text-[#5C605E]">Preferences done</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <Wallet className="w-5 h-5 text-[#2C4234] mb-2" />
            <div className="text-2xl font-['Outfit'] font-medium text-[#1C1E1D]">{trip.per_person_budget} {trip.currency}</div>
            <div className="text-xs text-[#5C605E]">Per person</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <Calendar className="w-5 h-5 text-[#D96A53] mb-2" />
            <div className="text-lg font-['Outfit'] font-medium text-[#1C1E1D]">{trip.start_date || 'Flexible'}</div>
            <div className="text-xs text-[#5C605E]">Dates</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invite Section */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE]">
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2C4234]" /> Invite Your Group
              </h3>
              <p className="text-sm text-[#5C605E] mb-4">Share this link so your friends can join and submit their preferences.</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#F7F6F2] rounded-xl px-4 py-3 text-sm text-[#5C605E] truncate border border-[#E5E4DE]">
                  {inviteUrl}
                </div>
                <Button onClick={copyInvite} className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-4" data-testid="copy-invite-btn">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE]">
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-4">Group Progress</h3>
              <Progress value={completionPct} className="h-2 mb-4" />
              <div className="space-y-3">
                {participants.map((p) => (
                  <div key={p.user_id || p.name} className="flex items-center justify-between py-2 border-b border-[#E5E4DE] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2C4234]/10 flex items-center justify-center text-[#2C4234] text-xs font-medium">
                        {p.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#1C1E1D]">{p.name} {p.user_id === trip.owner_id && <span className="text-xs text-[#D96A53]">(owner)</span>}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.preferences_submitted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.preferences_submitted ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Group Availability Heatmap CTA */}
            <Link to={`/trip/${tripId}/availability`} data-testid="availability-heatmap-link">
              <div className="bg-gradient-to-r from-emerald-500 via-lime-500 to-amber-500 rounded-2xl p-5 text-white hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-['Outfit'] font-bold text-lg">Group Availability Heatmap</h4>
                      <p className="text-white/80 text-sm">See when everyone can travel — green = all, yellow = most, red = conflicts</p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </div>
            </Link>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!myPrefs?.preferences_submitted && (
                <Link to={`/trip/${tripId}/preferences`} data-testid="submit-prefs-link">
                  <div className="bg-[#D96A53] rounded-2xl p-6 text-white hover:bg-[#C25944] transition-all duration-200 cursor-pointer group">
                    <ClipboardList className="w-6 h-6 mb-3" />
                    <h4 className="font-['Outfit'] font-medium mb-1">Submit Your Preferences</h4>
                    <p className="text-white/70 text-sm">Tell us your constraints and wishes</p>
                    <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}
              <Link to={`/trip/${tripId}/recommendations`} data-testid="view-recommendations-link">
                <div className="bg-[#2C4234] rounded-2xl p-6 text-white hover:bg-[#1F3025] transition-all duration-200 cursor-pointer group">
                  <Sparkles className="w-6 h-6 mb-3" />
                  <h4 className="font-['Outfit'] font-medium mb-1">View Recommendations</h4>
                  <p className="text-white/70 text-sm">AI-scored destinations for your group</p>
                  <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to={`/trip/${tripId}/voting`} data-testid="voting-link">
                <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer group">
                  <Vote className="w-6 h-6 mb-3 text-[#D96A53]" />
                  <h4 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-1">Vote on Options</h4>
                  <p className="text-[#5C605E] text-sm">Pick your favorites</p>
                  <ArrowRight className="w-5 h-5 mt-3 text-[#5C605E] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to={`/trip/${tripId}/polls`} data-testid="polls-link">
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-200 cursor-pointer group">
                  <BarChart3 className="w-6 h-6 mb-3" />
                  <h4 className="font-['Outfit'] font-medium mb-1">Group Polls</h4>
                  <p className="text-white/70 text-sm">Quick decisions, one tap to vote</p>
                  <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to={`/trip/${tripId}/itinerary`} data-testid="itinerary-link">
                <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer group">
                  <MapPin className="w-6 h-6 mb-3 text-[#2C4234]" />
                  <h4 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-1">Final Itinerary</h4>
                  <p className="text-[#5C605E] text-sm">The chosen trip plan</p>
                  <ArrowRight className="w-5 h-5 mt-3 text-[#5C605E] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to={`/trip/${tripId}/cost-splitter`} data-testid="cost-splitter-link">
                <div className="bg-gradient-to-br from-[#D96A53] to-[#C25944] rounded-2xl p-6 text-white hover:from-[#C25944] hover:to-[#b04d38] transition-all duration-200 cursor-pointer group">
                  <CreditCard className="w-6 h-6 mb-3" />
                  <h4 className="font-['Outfit'] font-medium mb-1">Cost Splitter & Pay</h4>
                  <p className="text-white/70 text-sm">Split costs and collect payments</p>
                  <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to={`/trip/${tripId}/budget`} data-testid="budget-tracker-link">
                <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer group">
                  <Wallet className="w-6 h-6 mb-3 text-[#E07A5F]" />
                  <h4 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-1">Budget Tracker</h4>
                  <p className="text-[#5C605E] text-sm">Track expenses vs budget in real-time</p>
                  <ArrowRight className="w-5 h-5 mt-3 text-[#5C605E] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link to={`/trip/${tripId}/slot-prices`} data-testid="slot-prices-link">
                <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white hover:from-sky-600 hover:to-blue-700 transition-all duration-200 cursor-pointer group">
                  <Calendar className="w-6 h-6 mb-3" />
                  <h4 className="font-['Outfit'] font-medium mb-1">Price per Slot</h4>
                  <p className="text-white/70 text-sm">Compare flight + hotel per date range</p>
                  <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>

            {/* Live Activity Feed */}
            {liveEvents.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
                <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#D96A53]" /> Live Activity
                </h3>
                <div className="space-y-2">
                  {liveEvents.slice(0, 5).map((evt, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#5C605E] bg-[#F7F6F2] rounded-lg p-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span>{evt.data?.user_name || 'Someone'} - {evt.type?.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE]">
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-4">Budget Calculator</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5C605E]">Per person</span>
                  <span className="font-medium text-[#1C1E1D]">{trip.per_person_budget} {trip.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#5C605E]">Group ({participants.length} people)</span>
                  <span className="font-medium text-[#D96A53]">{trip.per_person_budget * participants.length} {trip.currency}</span>
                </div>
                <hr className="border-[#E5E4DE]" />
                <div className="flex justify-between text-sm">
                  <span className="text-[#5C605E]">Target ({trip.group_size} people)</span>
                  <span className="font-medium text-[#1C1E1D]">{trip.per_person_budget * trip.group_size} {trip.currency}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#2C4234] rounded-2xl p-6 text-white">
              <Sparkles className="w-5 h-5 mb-3 text-[#D96A53]" />
              <h3 className="font-['Outfit'] font-medium mb-2">AI Trip Assistant</h3>
              <p className="text-white/70 text-sm mb-4">Once everyone submits preferences, get AI-powered recommendations.</p>
              <Link to={`/trip/${tripId}/recommendations`}>
                <Button className="w-full bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl" data-testid="ai-recs-btn">
                  Get Recommendations <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <Link to={`/trip/${tripId}/smart-weekends`} data-testid="smart-weekends-link">
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer group">
                <Sun className="w-5 h-5 mb-3" />
                <h3 className="font-['Outfit'] font-medium mb-1">Smart Weekend Finder</h3>
                <p className="text-white/80 text-sm mb-3">Best dates based on weather, prices & group availability</p>
                <div className="flex items-center text-white/70 text-xs group-hover:text-white transition-colors">
                  Find best weekends <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <Link to={`/trip/${tripId}/deals`} data-testid="deal-finder-link">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-6 text-white hover:from-green-700 hover:to-emerald-700 transition-all cursor-pointer group">
                <TrendingDown className="w-5 h-5 mb-3" />
                <h3 className="font-['Outfit'] font-medium mb-1">Deal Finder</h3>
                <p className="text-white/80 text-sm mb-3">Live flight & hotel prices with alerts</p>
                <div className="flex items-center text-white/70 text-xs group-hover:text-white transition-colors">
                  Find deals <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Calendar Export */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
              <CalendarDays className="w-5 h-5 text-[#2C4234] mb-3" />
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-2 text-sm">Export to Calendar</h3>
              <Button onClick={async () => {
                try {
                  const { data: cal } = await api.get(`/trips/${tripId}/calendar-export`);
                  if (cal.google_calendar_url) window.open(cal.google_calendar_url, '_blank');
                } catch { toast.error('Set dates first to export'); }
              }} size="sm" variant="outline" className="w-full rounded-xl border-[#E5E4DE] text-xs" data-testid="export-calendar-btn">
                <CalendarDays className="w-3 h-3 mr-1" /> Google Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* AI Chatbot FAB */}
      <AiChatbot tripId={tripId} />
      {/* Budget Widget */}
      <BudgetWidget tripId={tripId} />
    </div>
  );
}
