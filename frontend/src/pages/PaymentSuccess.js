import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Check, Loader2, PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PaymentSuccess() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  const pollStatus = useCallback(async () => {
    if (!sessionId || attempts >= 10) {
      if (attempts >= 10) setStatus('timeout');
      return;
    }
    try {
      const { data } = await api.get(`/payments/status/${sessionId}`);
      if (data.payment_status === 'paid') {
        setStatus('paid');
        toast.success('Payment confirmed!');
        return;
      } else if (data.status === 'expired') {
        setStatus('expired');
        return;
      }
      setStatus('pending');
      setAttempts(prev => prev + 1);
    } catch {
      setAttempts(prev => prev + 1);
    }
  }, [sessionId, attempts]);

  useEffect(() => {
    if (status === 'checking' || status === 'pending') {
      const timer = setTimeout(pollStatus, attempts === 0 ? 500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [status, attempts, pollStatus]);

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-6" data-testid="payment-success-page">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl border border-[#E5E4DE] p-8 text-center">

        {(status === 'checking' || status === 'pending') && (
          <>
            <Loader2 className="w-12 h-12 text-[#2C4234] mx-auto mb-4 animate-spin" />
            <h2 className="font-['Outfit'] text-xl font-medium text-[#1C1E1D] mb-2">Confirming your payment...</h2>
            <p className="text-[#5C605E] text-sm">This usually takes a few seconds.</p>
          </>
        )}

        {status === 'paid' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <PartyPopper className="w-8 h-8 text-[#D96A53] mx-auto mb-2" />
            <h2 className="font-['Outfit'] text-2xl font-medium text-[#1C1E1D] mb-2">Payment Confirmed!</h2>
            <p className="text-[#5C605E] mb-6">Your share has been collected. You're all set for the trip!</p>
            <div className="flex flex-col gap-3">
              <Link to={`/trip/${tripId}/cost-splitter`}>
                <Button className="w-full bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl" data-testid="back-to-splitter-btn">
                  View Cost Splitter
                </Button>
              </Link>
              <Link to={`/trip/${tripId}`}>
                <Button variant="outline" className="w-full rounded-xl border-[#E5E4DE]">
                  Back to Trip
                </Button>
              </Link>
            </div>
          </>
        )}

        {(status === 'expired' || status === 'timeout') && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-['Outfit'] text-xl font-medium text-[#1C1E1D] mb-2">
              {status === 'expired' ? 'Session Expired' : 'Status Check Timeout'}
            </h2>
            <p className="text-[#5C605E] text-sm mb-4">Please check your payment status on the cost splitter page.</p>
            <Link to={`/trip/${tripId}/cost-splitter`}>
              <Button className="w-full bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl">
                Go to Cost Splitter
              </Button>
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
