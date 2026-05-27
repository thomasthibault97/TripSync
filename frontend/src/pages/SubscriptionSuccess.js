import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Globe, Check, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function SubscriptionSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState('checking');
  const [plan, setPlan] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }
    const poll = async () => {
      try {
        const { data } = await api.get(`/subscription/verify/${sessionId}`);
        if (data.status === 'paid') {
          setStatus('success');
          setPlan(data.plan);
        } else if (attempts < 5) {
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus('pending');
        }
      } catch (err) {
        console.error('Verify error:', err);
        if (attempts < 5) setTimeout(() => setAttempts(a => a + 1), 2000);
        else setStatus('error');
      }
    };
    poll();
  }, [sessionId, attempts]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2A3B32]" />
            <span className="font-['Cormorant_Garamond'] font-semibold text-lg text-[#1A1A1A]">TripSync</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-6 text-center" data-testid="subscription-success-page">
        {status === 'checking' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="w-12 h-12 text-[#E07A5F] mx-auto mb-6 animate-spin" />
            <h2 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2A3B32] mb-2">Confirming your upgrade...</h2>
            <p className="text-[#5C5C5C] font-['Outfit']">Hang tight, we're verifying your payment.</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-sm font-['Outfit'] font-bold px-4 py-1.5 rounded-full mb-4">
              <Sparkles className="w-4 h-4" /> Welcome to {plan === 'team' ? 'Odyssey' : 'Voyager'}!
            </div>
            <h2 className="font-['Cormorant_Garamond'] text-3xl font-medium text-[#2A3B32] mb-3">You're upgraded!</h2>
            <p className="text-[#5C5C5C] font-['Outfit'] mb-8 leading-relaxed">
              All premium features are now unlocked. Go plan something extraordinary.
            </p>
            <Link to="/dashboard">
              <Button className="bg-[#2A3B32] hover:bg-[#1E2A24] text-white rounded-full px-8 py-6 text-base font-['Outfit']">
                Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}

        {status === 'pending' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="w-12 h-12 text-amber-500 mx-auto mb-6" />
            <h2 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2A3B32] mb-2">Payment processing</h2>
            <p className="text-[#5C5C5C] font-['Outfit'] mb-6">Your payment is being processed. This usually takes a few seconds.</p>
            <Link to="/dashboard"><Button variant="outline" className="rounded-full font-['Outfit']">Go to Dashboard</Button></Link>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2A3B32] mb-2">Something went wrong</h2>
            <p className="text-[#5C5C5C] font-['Outfit'] mb-6">We couldn't verify your payment. Please contact support.</p>
            <Link to="/pricing"><Button className="rounded-full font-['Outfit'] bg-[#E07A5F] text-white">Try Again</Button></Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
