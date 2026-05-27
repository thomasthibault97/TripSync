import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, Check, X, Sparkles, Zap, Crown, ArrowRight, Users, Plane, Calendar, MapPin, PiggyBank, Share2, BarChart3, Download, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PLAN_DATA = {
  free: {
    id: 'free', name: 'Explorer', price: 0, period: 'forever',
    tagline: 'Everything you need to start planning',
    icon: Globe, color: 'from-[#2A3B32] to-[#3D5A47]', badge: null,
    features: [
      { text: 'Up to 5 trips', included: true, icon: MapPin },
      { text: 'Up to 6 participants per trip', included: true, icon: Users },
      { text: 'AI destination matching', included: true, icon: Sparkles },
      { text: 'Date range picker & heatmap', included: true, icon: Calendar },
      { text: 'Budget tracker', included: true, icon: PiggyBank },
      { text: 'Guest availability links', included: true, icon: Share2 },
      { text: 'Deal finder', included: true, icon: Zap },
      { text: 'Trip templates', included: true, icon: BarChart3 },
      { text: 'Flight coordination', included: false, icon: Plane },
      { text: 'Calendar & itinerary export', included: false, icon: Download },
      { text: 'Stripe cost splitting', included: false, icon: CreditCard },
    ]
  },
  pro: {
    id: 'pro', name: 'Voyager', price: 9, period: '/month',
    tagline: 'For serious travel planners',
    icon: Zap, color: 'from-[#E07A5F] to-[#C25944]', badge: 'MOST POPULAR',
    features: [
      { text: 'Unlimited trips', included: true, icon: MapPin },
      { text: 'Up to 15 participants', included: true, icon: Users },
      { text: 'AI destination matching', included: true, icon: Sparkles },
      { text: 'Date range picker & heatmap', included: true, icon: Calendar },
      { text: 'Budget tracker', included: true, icon: PiggyBank },
      { text: 'Guest availability links', included: true, icon: Share2 },
      { text: 'Deal finder', included: true, icon: Zap },
      { text: 'Trip templates', included: true, icon: BarChart3 },
      { text: 'Flight coordination', included: true, icon: Plane },
      { text: 'Calendar & itinerary export', included: true, icon: Download },
      { text: 'Stripe cost splitting', included: false, icon: CreditCard },
    ]
  },
  team: {
    id: 'team', name: 'Odyssey', price: 19, period: '/month',
    tagline: 'For groups who go all-in',
    icon: Crown, color: 'from-indigo-600 to-purple-700', badge: 'BEST VALUE',
    features: [
      { text: 'Unlimited trips', included: true, icon: MapPin },
      { text: 'Unlimited participants', included: true, icon: Users },
      { text: 'Priority AI recommendations', included: true, icon: Sparkles },
      { text: 'Date range picker & heatmap', included: true, icon: Calendar },
      { text: 'Budget tracker', included: true, icon: PiggyBank },
      { text: 'Guest availability links', included: true, icon: Share2 },
      { text: 'Deal finder', included: true, icon: Zap },
      { text: 'Trip templates', included: true, icon: BarChart3 },
      { text: 'Flight coordination', included: true, icon: Plane },
      { text: 'Calendar & itinerary export', included: true, icon: Download },
      { text: 'Stripe cost splitting & payments', included: true, icon: CreditCard },
    ]
  }
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);

  useEffect(() => {
    if (user) {
      api.get('/subscription/status')
        .then(r => setCurrentPlan(r.data.plan || 'free'))
        .catch(() => {})
        .finally(() => setCheckingPlan(false));
    } else {
      setCheckingPlan(false);
    }
  }, [user]);

  const handleSubscribe = async (planId) => {
    if (!user) { navigate('/auth'); return; }
    if (planId === 'free' || planId === currentPlan) return;
    setLoading(true);
    try {
      const { data } = await api.post('/subscription/checkout', {
        plan_id: planId,
        origin_url: window.location.origin
      });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.detail || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-7 h-7 text-[#2A3B32]" />
            <span className="font-['Cormorant_Garamond'] font-semibold text-xl text-[#1A1A1A]">TripSync</span>
          </Link>
          {user ? (
            <Link to="/dashboard"><Button variant="ghost" className="rounded-full font-['Outfit']">Dashboard</Button></Link>
          ) : (
            <Link to="/auth"><Button className="bg-[#2A3B32] text-white rounded-full px-6 font-['Outfit']">Get Started</Button></Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-16 text-center" data-testid="pricing-page">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 bg-[#E07A5F]/10 text-[#E07A5F] text-sm font-['Outfit'] font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" /> Simple, transparent pricing
          </span>
          <h1 className="font-['Cormorant_Garamond'] text-4xl sm:text-5xl lg:text-7xl font-medium text-[#2A3B32] tracking-tighter leading-[0.95] mb-6">
            Start free.<br />Upgrade when<br />you're hooked.
          </h1>
          <p className="text-lg text-[#5C5C5C] font-['Outfit'] max-w-xl mx-auto leading-relaxed">
            Our free tier is generous on purpose. We want you to love TripSync before you spend a cent.
          </p>
        </motion.div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {Object.values(PLAN_DATA).map((plan, i) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            const isPro = plan.id === 'pro';
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-3xl overflow-hidden ${isPro ? 'ring-2 ring-[#E07A5F] shadow-xl shadow-[#E07A5F]/10' : 'border border-[#E8E4DF]'}`}
                data-testid={`plan-${plan.id}`}>
                {plan.badge && (
                  <div className={`absolute top-0 left-0 right-0 bg-gradient-to-r ${plan.color} text-white text-center text-[10px] font-bold py-1.5 tracking-wider font-['Outfit']`}>
                    {plan.badge}
                  </div>
                )}
                <div className={`bg-white p-8 ${plan.badge ? 'pt-12' : ''}`}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2A3B32] mb-1">{plan.name}</h3>
                  <p className="text-sm text-[#5C5C5C] font-['Outfit'] mb-6">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1 mb-8">
                    {plan.price === 0 ? (
                      <span className="text-4xl font-['Outfit'] font-bold text-[#2A3B32]">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-['Outfit'] font-bold text-[#2A3B32]">${plan.price}</span>
                        <span className="text-[#5C5C5C] font-['Outfit']">{plan.period}</span>
                      </>
                    )}
                  </div>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading || isCurrentPlan || (plan.id === 'free' && !isCurrentPlan)}
                    className={`w-full rounded-full py-6 text-base font-['Outfit'] font-medium mb-8 ${
                      isCurrentPlan ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                      isPro ? 'bg-gradient-to-r from-[#E07A5F] to-[#C25944] text-white hover:opacity-90 shadow-lg shadow-[#E07A5F]/20' :
                      plan.id === 'team' ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white hover:opacity-90' :
                      'bg-[#2A3B32] text-white hover:bg-[#1E2A24]'
                    }`}
                    data-testid={`subscribe-${plan.id}`}>
                    {isCurrentPlan ? (
                      <><Check className="w-4 h-4 mr-2" /> Current Plan</>
                    ) : plan.id === 'free' ? (
                      'Get Started Free'
                    ) : loading ? (
                      'Redirecting...'
                    ) : (
                      <>Upgrade to {plan.name} <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((f) => {
                      const FIcon = f.icon;
                      return (
                        <div key={f.text} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${f.included ? 'bg-emerald-100' : 'bg-[#E8E4DF]'}`}>
                            {f.included ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-[#B0AEA6]" />}
                          </div>
                          <span className={`text-sm font-['Outfit'] ${f.included ? 'text-[#1A1A1A]' : 'text-[#B0AEA6]'}`}>{f.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ / Trust */}
        <div className="mt-24 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-3xl font-medium text-[#2A3B32] mb-4">Frequently asked</h2>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            {[
              { q: "Can I really plan a full trip for free?", a: "Yes! The Explorer plan includes AI matching, date coordination, budget tracking, guest links, and deal finder. Most groups never need more." },
              { q: "What happens if I hit the trip limit?", a: "You'll be prompted to upgrade. Your existing trips continue working — we never lock you out of data you created." },
              { q: "Can I cancel anytime?", a: "Absolutely. Cancel in one click from your dashboard. You keep access until the end of your billing cycle." },
              { q: "Is my payment info secure?", a: "100%. We use Stripe — the same payment processor as Shopify, Amazon, and Google. We never see your card number." },
            ].map((faq) => (
              <details key={faq.q} className="bg-white rounded-2xl border border-[#E8E4DF] p-5 group">
                <summary className="font-['Outfit'] font-medium text-[#1A1A1A] cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-[#5C5C5C] group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="text-[#5C5C5C] font-['Outfit'] text-sm mt-3 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-[#2A3B32] py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl font-medium text-white mb-4">Start planning. It's free.</h2>
          <p className="text-white/60 font-['Outfit'] mb-8">Join thousands of groups who plan trips without the chaos.</p>
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button className="bg-[#E07A5F] hover:bg-[#D26A4F] text-white rounded-full px-10 py-7 text-base font-['Outfit'] shadow-lg shadow-[#E07A5F]/30">
              Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
