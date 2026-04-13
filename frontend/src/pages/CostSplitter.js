import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Globe, ArrowLeft, Wallet, CreditCard, Check, Clock, Users, ExternalLink, ArrowRight, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function CostSplitter() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/trips/${tripId}/cost-summary`),
      api.get(`/trips/${tripId}/payments`)
    ]).then(([t, s, p]) => {
      setTrip(t.data);
      setSummary(s.data);
      setPayments(p.data || []);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [tripId]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const origin = window.location.origin;
      const { data } = await api.post('/payments/create-checkout', {
        trip_id: tripId,
        origin_url: origin
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error('Payment setup failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const paidPct = summary ? Math.round((summary.paid_total / Math.max(summary.total_budget, 1)) * 100) : 0;
  const myPayment = summary?.participants?.find(p => p.user_id === user?.id);
  const hasPaid = myPayment?.status === 'paid';

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

      <div className="max-w-3xl mx-auto px-6 py-8" data-testid="cost-splitter-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D] mb-2">Trip Cost Splitter</h1>
          <p className="text-[#5C605E] mb-8">{trip?.name} - Split costs equally among the group</p>
        </motion.div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <Wallet className="w-5 h-5 text-[#D96A53] mb-2" />
            <div className="text-xl font-['Outfit'] font-medium text-[#1C1E1D]">{summary?.total_budget} {summary?.currency}</div>
            <div className="text-xs text-[#5C605E]">Total Budget</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <Users className="w-5 h-5 text-[#2C4234] mb-2" />
            <div className="text-xl font-['Outfit'] font-medium text-[#1C1E1D]">{summary?.per_person} {summary?.currency}</div>
            <div className="text-xs text-[#5C605E]">Per Person</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <Check className="w-5 h-5 text-green-600 mb-2" />
            <div className="text-xl font-['Outfit'] font-medium text-green-600">{summary?.paid_total} {summary?.currency}</div>
            <div className="text-xs text-[#5C605E]">Collected</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#E5E4DE]">
            <Clock className="w-5 h-5 text-amber-500 mb-2" />
            <div className="text-xl font-['Outfit'] font-medium text-amber-600">{summary?.remaining} {summary?.currency}</div>
            <div className="text-xs text-[#5C605E]">Remaining</div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5E4DE] mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-['Outfit'] font-medium text-[#1C1E1D]">Collection Progress</h3>
            <span className="text-sm font-medium text-[#2C4234]">{paidPct}%</span>
          </div>
          <Progress value={paidPct} className="h-3 mb-4" />
          <div className="text-xs text-[#5C605E]">{summary?.paid_count} of {summary?.participants_count} participants have paid</div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden mb-8">
          <div className="p-5 border-b border-[#E5E4DE]">
            <h3 className="font-['Outfit'] font-medium text-[#1C1E1D]">Payment Status</h3>
          </div>
          <div className="divide-y divide-[#E5E4DE]">
            {summary?.participants?.map((p, i) => (
              <div key={i} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2C4234]/10 flex items-center justify-center text-[#2C4234] text-sm font-medium">
                    {p.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1C1E1D]">{p.name} {p.user_id === user?.id && <span className="text-xs text-[#D96A53]">(you)</span>}</div>
                    <div className="text-xs text-[#5C605E]">Share: {p.share} {summary?.currency}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.status === 'paid' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                      <Check className="w-3 h-3" /> Paid {p.paid} {summary?.currency}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pay Button */}
        {!hasPaid && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#2C4234] rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-['Outfit'] font-medium text-lg mb-1">Your Share</h3>
                <p className="text-white/70 text-sm">Pay {summary?.per_person} {summary?.currency} to secure your spot</p>
              </div>
              <Button onClick={handlePay} disabled={paying}
                className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-6 py-5"
                data-testid="pay-share-btn">
                {paying ? 'Setting up...' : (
                  <><CreditCard className="w-4 h-4 mr-2" /> Pay {summary?.per_person} {summary?.currency}</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {hasPaid && (
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center">
            <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-['Outfit'] font-medium text-green-800 mb-1">Payment Complete!</h3>
            <p className="text-green-600 text-sm">You've paid your share for this trip.</p>
          </div>
        )}

        {/* Payment History & Receipts */}
        {payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden mt-6">
            <div className="p-5 border-b border-[#E5E4DE]">
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2C4234]" /> Payment History
              </h3>
            </div>
            <div className="divide-y divide-[#E5E4DE]">
              {payments.map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#1C1E1D]">{p.user_name}</div>
                    <div className="text-xs text-[#5C605E]">
                      {p.amount} {p.currency} - {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.payment_status}
                    </span>
                    {p.payment_status === 'paid' && p.session_id && (
                      <Link to={`/trip/${tripId}/receipt?session_id=${p.session_id}`} data-testid={`receipt-link-${i}`}>
                        <Button size="sm" variant="ghost" className="text-[#2C4234] hover:bg-[#2C4234]/5 rounded-lg h-7 px-2 text-xs">
                          <FileText className="w-3 h-3 mr-1" /> Receipt
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
