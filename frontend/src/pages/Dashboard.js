import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, Plus, Users, Calendar, MapPin, ArrowRight, LogOut, Copy, Check, Settings, LayoutTemplate, Plane, CheckCircle, ChevronRight, Clock, Sparkles } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const STATUS_COLORS = {
  planning: "bg-blue-50 text-blue-600 border-blue-200",
  voting: "bg-purple-50 text-purple-600 border-purple-200",
  booked: "bg-green-50 text-green-600 border-green-200",
  completed: "bg-[#2C4234]/5 text-[#2C4234] border-[#2C4234]/20",
};
const STATUS_LABELS = {
  planning: "Collecting Preferences", voting: "Voting", booked: "Booked", completed: "Completed",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    api.get('/trips').then(r => setTrips(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const active = trips.filter(t => t.status !== 'completed').length;
    const completed = trips.filter(t => t.status === 'completed').length;
    const totalParticipants = trips.reduce((sum, t) => sum + (t.participants?.length || 0), 0);
    return { active, completed, totalParticipants };
  }, [trips]);

  const copyInvite = (e, code, tripId) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    setCopiedId(tripId);
    toast.success('Invite link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-7 h-7 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-xl text-[#1C1E1D]">TripSync</span>
          </Link>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-[#5C605E] rounded-xl" data-testid="admin-link">
                  <Settings className="w-4 h-4 mr-1" /> Admin
                </Button>
              </Link>
            )}
            <NotificationCenter />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2C4234]/5 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-[#2C4234] flex items-center justify-center text-white text-xs font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-[#1C1E1D] font-medium hidden sm:block">{user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[#5C605E] rounded-xl" data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10" data-testid="dashboard-page">
        {/* Welcome Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl font-medium text-[#1C1E1D] tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-[#5C605E] font-['Outfit']">Ready to plan your next adventure?</p>
            <Link to="/pricing" className="inline-flex items-center gap-1 text-xs font-['Outfit'] font-bold text-[#E07A5F] bg-[#E07A5F]/10 px-3 py-1 rounded-full hover:bg-[#E07A5F]/20 transition-colors" data-testid="upgrade-badge">
              <Sparkles className="w-3 h-3" /> Upgrade
            </Link>
          </div>
        </motion.div>

        {/* Stat Cards - matching screenshot design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Link to="/create-trip" data-testid="stat-create-trip">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
              className="bg-white rounded-2xl p-6 border border-[#E5E4DE] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(44,66,52,0.06)] transition-all duration-300 cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-[#D96A53]/10 flex items-center justify-center mb-4">
                <Plus className="w-5 h-5 text-[#D96A53]" />
              </div>
              <div className="font-['Outfit'] font-bold text-[#1C1E1D]">Create New Trip</div>
              <div className="text-xs text-[#5C605E] mt-0.5">Start planning with your group</div>
            </motion.div>
          </Link>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-6 border border-[#E5E4DE]">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Plane className="w-5 h-5 text-blue-500" />
            </div>
            <div className="font-['Outfit'] font-bold text-[#1C1E1D]">Active Trips</div>
            <div className="font-['Outfit'] text-2xl font-bold text-[#1C1E1D] mt-0.5" data-testid="active-trips-count">{stats.active}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-[#E5E4DE]">
            <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="font-['Outfit'] font-bold text-[#1C1E1D]">Completed</div>
            <div className="font-['Outfit'] text-2xl font-bold text-[#1C1E1D] mt-0.5">{stats.completed}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 border border-[#E5E4DE]">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div className="font-['Outfit'] font-bold text-[#1C1E1D]">Total Participants</div>
            <div className="font-['Outfit'] text-2xl font-bold text-[#1C1E1D] mt-0.5" data-testid="total-participants">{stats.totalParticipants}</div>
          </motion.div>
        </div>

        {/* Your Trips */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-['Outfit'] text-2xl font-bold text-[#1C1E1D]">Your Trips</h2>
          <div className="flex items-center gap-3">
            <Link to="/templates">
              <Button variant="outline" size="sm" className="border-[#E5E4DE] text-[#5C605E] rounded-xl" data-testid="templates-btn">
                <LayoutTemplate className="w-4 h-4 mr-1.5" /> Templates
              </Button>
            </Link>
            <Link to="/create-trip">
              <Button size="sm" className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-5" data-testid="create-trip-btn">
                <Plus className="w-4 h-4 mr-1.5" /> New Trip
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl p-6 border border-[#E5E4DE] animate-pulse h-48" />)}
          </div>
        ) : trips.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-[#2C4234]/10 flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-8 h-8 text-[#2C4234]" />
            </div>
            <h2 className="font-['Outfit'] text-xl font-bold text-[#1C1E1D] mb-2">No trips yet</h2>
            <p className="text-[#5C605E] mb-6">Create your first group trip and invite your friends!</p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/templates">
                <Button variant="outline" className="rounded-xl border-[#E5E4DE]">
                  <LayoutTemplate className="w-4 h-4 mr-2" /> Browse Templates
                </Button>
              </Link>
              <Link to="/create-trip">
                <Button className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-6" data-testid="empty-create-trip-btn">
                  Create Your First Trip <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip, i) => (
              <motion.div key={trip.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-[#E5E4DE] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(44,66,52,0.06)] transition-all duration-300">
                <Link to={`/trip/${trip.id}`} className="block p-6" data-testid={`trip-card-${trip.id}`}>
                  {/* Status + Arrow */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[trip.status] || 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                      {STATUS_LABELS[trip.status] || trip.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#E5E4DE]" />
                  </div>
                  {/* Name + Description */}
                  <h3 className="font-['Outfit'] text-lg font-bold text-[#1C1E1D] mb-1">{trip.name}</h3>
                  {trip.description && (
                    <p className="text-sm text-[#5C605E] line-clamp-2 mb-3">{trip.description}</p>
                  )}
                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-[#5C605E] mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{trip.participants?.length || 0} participants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{trip.trip_type?.replace('_', ' ') || 'weekend'}</span>
                    </div>
                  </div>
                  {/* Participant Avatars */}
                  <div className="flex items-center -space-x-2">
                    {(trip.participants || []).slice(0, 5).map((p, j) => (
                      <div key={j} className="w-8 h-8 rounded-full bg-[#2C4234]/10 border-2 border-white flex items-center justify-center text-[#2C4234] text-[10px] font-bold">
                        {p.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    ))}
                    {(trip.participants?.length || 0) > 5 && (
                      <div className="w-8 h-8 rounded-full bg-[#E5E4DE] border-2 border-white flex items-center justify-center text-[#5C605E] text-[10px] font-bold">
                        +{trip.participants.length - 5}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
