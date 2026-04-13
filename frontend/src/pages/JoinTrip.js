import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, Users, ArrowRight, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function JoinTrip() {
  const { inviteCode } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tripInfo, setTripInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api.get(`/trips/invite/${inviteCode}`)
      .then(r => setTripInfo(r.data))
      .catch(() => toast.error('Invalid invite link'))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!user) {
      localStorage.setItem('pendingInvite', inviteCode);
      navigate('/auth');
      return;
    }
    setJoining(true);
    try {
      const { data } = await api.post(`/trips/join/${inviteCode}`);
      toast.success('Joined the trip!');
      navigate(`/trip/${data.id}`);
    } catch {
      toast.error('Failed to join trip');
    } finally {
      setJoining(false);
    }
  };

  // Auto-join if authenticated
  useEffect(() => {
    if (user && tripInfo && !joining) {
      handleJoin();
    }
  }, [user, tripInfo]);

  if (loading || authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-6" data-testid="join-trip-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl border border-[#E5E4DE] p-8 text-center">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <Globe className="w-7 h-7 text-[#2C4234]" />
          <span className="font-['Outfit'] font-semibold text-xl text-[#1C1E1D]">TripSync</span>
        </Link>

        {tripInfo ? (
          <>
            <h2 className="font-['Outfit'] text-2xl font-medium text-[#1C1E1D] mb-2">You're invited!</h2>
            <p className="text-[#5C605E] mb-6">
              <span className="font-medium text-[#1C1E1D]">{tripInfo.owner_name}</span> invited you to join
            </p>
            <div className="bg-[#F7F6F2] rounded-xl p-5 mb-6">
              <h3 className="font-['Outfit'] text-lg font-medium text-[#1C1E1D] mb-2">{tripInfo.name}</h3>
              <div className="flex items-center justify-center gap-4 text-sm text-[#5C605E]">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {tripInfo.participants?.length || 0}/{tripInfo.group_size}</span>
              </div>
            </div>
            {user ? (
              <Button onClick={handleJoin} disabled={joining}
                className="w-full bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl h-12" data-testid="join-trip-btn">
                {joining ? 'Joining...' : 'Join Trip'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Link to="/auth" onClick={() => localStorage.setItem('pendingInvite', inviteCode)}>
                <Button className="w-full bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl h-12" data-testid="login-to-join-btn">
                  <LogIn className="w-4 h-4 mr-2" /> Log in to Join
                </Button>
              </Link>
            )}
          </>
        ) : (
          <div>
            <h2 className="font-['Outfit'] text-xl font-medium text-[#1C1E1D] mb-2">Invalid Invite</h2>
            <p className="text-[#5C605E] mb-4">This invite link is invalid or has expired.</p>
            <Link to="/"><Button className="rounded-xl">Go Home</Button></Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
