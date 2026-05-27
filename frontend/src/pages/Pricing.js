import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, Check, X, Sparkles, Zap, Crown, ArrowRight, Users, Plane, Calendar, MapPin, PiggyBank, Share2, BarChart3, Download, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// A/B variant is assigned per session (sticky)
function getVariant() {
  let v = sessionStorage.getItem('pricing_variant');
  if (!v) {
    v = Math.random() < 0.5 ? 'A' : 'B';
    sessionStorage.setItem('pricing_variant', v);
  }
  return v;
}

function getSessionId() {
  let s = sessionStorage.getItem('pricing_session');
  if (!s) { s = Math.random().toString(36).slice(2); sessionStorage.setItem('pricing_session', s); }
  return s;
}

const FEATURES = [
  { key: 'trips', label: (v) => v === -1 ? 'Unlimited trips' : `Up to ${v} trips`, icon: MapPin },
  { key: 'participants', label: (v) => v === -1 ? 'Unlimited participants' : `Up to ${v} participants`, icon: Users },
  { key: 'ai', label: () => 'AI destination matching', icon: Sparkles },
  { key: 'budget_tracker', label: () => 'Budget tracker', icon: PiggyBank },
  { key: 'guest_links', label: () => 'Guest availability links', icon: Share2 },
  { key: 'deal_finder', label: () => 'Deal finder', icon: Zap },
  { key: 'templates', label: () => 'Trip templates', icon: BarChart3 },
  { key: 'flight_coord', label: () => 'Flight coordination', icon: Plane },
  { key: 'export', label: () => 'Calendar & itinerary export', icon: Download },
  { key: 'cost_split_pay', label: () => 'Stripe cost splitting', icon: CreditCard },
];

const PLAN_ICONS = { free: Globe, pro: Zap, team: Crown };
const PLAN_COLORS = {
  free: 'from-[#2A3B32] to-[#3D5A47]',
  pro: 'from-[#E07A5F] to-[#C25944]',
  team: 'from-indigo-600 to-purple-700',
};
const PLAN_BADGES = { free: null, pro: 'MOST POPULAR', team: 'BEST VALUE' };
const PLAN_TAGLINES_A = { free: 'Everything you need to start planning', pro: 'For serious travel planners', team: 'For groups who go all-in' };
const PLAN_TAGLINES_B = { free: 'Generous. Forever free.', pro: 'The sweet spot for explorers', team: 'Go big. No limits.' };

const FAQ = [
  { q: "Can I really plan a full trip for free?", a: "Yes! The Explorer plan includes AI matching, date coordination, budget tracking, guest links, and deal finder. Most groups never need more." },
  { q: "What happens if I hit the trip limit?", a: "You'll be prompted to upgrade. Your existing trips continue working — we never lock you out of data you created." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel in one click from your dashboard. You keep access until the end of your billing cycle." },
  { q: "Is my payment info secure?", a: "100%. We use Stripe — the same payment processor as Shopify, Amazon, and Google. We never see your card number." },
  { q: "What's the difference between monthly and annual?", a: "Annual billing saves you 20%. You pay once for the full year and can cancel anytime with a prorated refund." },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState('monthly');
  const [variant] = useState(getVariant);
  const [sessionId] = useState(getSessionId);

  const trackEvent = useCallback((event_type, extra = {}) => {
    api.post('/analytics/pricing-event', { variant, event_type, session_id: sessionId, billing, ...extra }).catch(() => {});
  }, [variant, sessionId, billing]);

  useEffect(() => {
    trackEvent('page_view');
    if (user) {
      api.get('/subscription/status').then(r => setCurrentPlan(r.data.plan || 'free')).catch(() => {});
    }
  }, [user, trackEvent]);

  const handleSubscribe = async (planId) => {
    trackEvent('subscribe_click', { plan_id: planId });
    if (!user) { navigate('/auth'); return; }
    if (planId === 'free' || planId === currentPlan) return;
    setLoading(true);
    try {
      const { data } = await api.post('/subscription/checkout', {
        plan_id: planId, origin_url: window.location.origin, billing
      });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.detail || 'Failed to start checkout');
    } finally { setLoading(false); }
  };

  const planOrder = variant === 'B' ? ['pro', 'free', 'team'] : ['free', 'pro', 'team'];
  const headlineA = <><br />Upgrade when<br />you're hooked.</>;
  const headlineB = <><br />Scale when<br />your group grows.</>;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
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
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-12 text-center" data-testid="pricing-page">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 bg-[#E07A5F]/10 text-[#E07A5F] text-sm font-['Outfit'] font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" /> Simple, transparent pricing
          </span>
          <h1 className="font-['Cormorant_Garamond'] text-4xl sm:text-5xl lg:text-7xl font-medium text-[#2A3B32] tracking-tighter leading-[0.95] mb-6">
            Start free.{variant === 'A' ? headlineA : headlineB}
          </h1>
          <p className="text-lg text-[#5C5C5C] font-['Outfit'] max-w-xl mx-auto leading-relaxed mb-10">
            {variant === 'A'
              ? "Our free tier is generous on purpose. We want you to love TripSync before you spend a cent."
              : "Most groups plan their entire trip for free. Upgrade only if you need superpowers."}
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 bg-white border border-[#E8E4DF] rounded-full p-1 mb-4" data-testid="billing-toggle">
            <button onClick={() => { setBilling('monthly'); trackEvent('billing_toggle', { billing: 'monthly' }); }}
              className={`px-6 py-2.5 rounded-full text-sm font-['Outfit'] font-medium transition-all ${billing === 'monthly' ? 'bg-[#2A3B32] text-white' : 'text-[#5C5C5C] hover:text-[#1A1A1A]'}`}
              data-testid="billing-monthly">Monthly</button>
            <button onClick={() => { setBilling('annual'); trackEvent('billing_toggle', { billing: 'annual' }); }}
              className={`px-6 py-2.5 rounded-full text-sm font-['Outfit'] font-medium transition-all relative ${billing === 'annual' ? 'bg-[#2A3B32] text-white' : 'text-[#5C5C5C] hover:text-[#1A1A1A]'}`}
              data-testid="billing-annual">
              Annual
              <span className="absolute -top-2.5 -right-3 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {planOrder.map((planId, i) => {
            const Icon = PLAN_ICONS[planId];
            const color = PLAN_COLORS[planId];
            const badge = PLAN_BADGES[planId];
            const tagline = variant === 'A' ? PLAN_TAGLINES_A[planId] : PLAN_TAGLINES_B[planId];
            const isCurrentPlan = currentPlan === planId;
            const isPro = planId === 'pro';
            const monthlyPrice = planId === 'free' ? 0 : planId === 'pro' ? 9 : 19;
            const annualPrice = planId === 'free' ? 0 : planId === 'pro' ? 86 : 182;
            const displayPrice = billing === 'annual' ? annualPrice : monthlyPrice;
            const monthlyEquiv = billing === 'annual' && planId !== 'free' ? (annualPrice / 12).toFixed(2) : null;

            return (
              <motion.div key={planId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-3xl overflow-hidden ${isPro ? 'ring-2 ring-[#E07A5F] shadow-xl shadow-[#E07A5F]/10' : 'border border-[#E8E4DF]'}`}
                data-testid={`plan-${planId}`}>
                {badge && (
                  <div className={`absolute top-0 left-0 right-0 bg-gradient-to-r ${color} text-white text-center text-[10px] font-bold py-1.5 tracking-wider font-['Outfit']`}>
                    {badge}
                  </div>
                )}
                <div className={`bg-white p-8 ${badge ? 'pt-12' : ''}`}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-['Cormorant_Garamond'] text-2xl font-medium text-[#2A3B32] mb-1">
                    {planId === 'free' ? 'Explorer' : planId === 'pro' ? 'Voyager' : 'Odyssey'}
                  </h3>
                  <p className="text-sm text-[#5C5C5C] font-['Outfit'] mb-6">{tagline}</p>

                  <div className="flex items-baseline gap-1 mb-2">
                    {planId === 'free' ? (
                      <span className="text-4xl font-['Outfit'] font-bold text-[#2A3B32]">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-['Outfit'] font-bold text-[#2A3B32]">${displayPrice}</span>
                        <span className="text-[#5C5C5C] font-['Outfit']">/{billing === 'annual' ? 'year' : 'month'}</span>
                      </>
                    )}
                  </div>
                  {monthlyEquiv && (
                    <p className="text-xs text-emerald-600 font-['Outfit'] font-medium mb-6">
                      That's ${monthlyEquiv}/mo — save {billing === 'annual' ? '20%' : ''}
                    </p>
                  )}
                  {!monthlyEquiv && <div className="mb-6" />}

                  <Button
                    onClick={() => { trackEvent('plan_click', { plan_id: planId }); handleSubscribe(planId); }}
                    disabled={loading || isCurrentPlan || (planId === 'free' && !isCurrentPlan)}
                    className={`w-full rounded-full py-6 text-base font-['Outfit'] font-medium mb-8 ${
                      isCurrentPlan ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                      isPro ? 'bg-gradient-to-r from-[#E07A5F] to-[#C25944] text-white hover:opacity-90 shadow-lg shadow-[#E07A5F]/20' :
                      planId === 'team' ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white hover:opacity-90' :
                      'bg-[#2A3B32] text-white hover:bg-[#1E2A24]'
                    }`}
                    data-testid={`subscribe-${planId}`}>
                    {isCurrentPlan ? <><Check className="w-4 h-4 mr-2" /> Current Plan</> :
                     planId === 'free' ? 'Get Started Free' :
                     loading ? 'Redirecting...' :
                     <>{variant === 'A' ? `Upgrade to ${planId === 'pro' ? 'Voyager' : 'Odyssey'}` : `Go ${planId === 'pro' ? 'Voyager' : 'Odyssey'}`} <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>

                  <div className="space-y-3">
                    {FEATURES.map((f) => {
                      const val = planId === 'free'
                        ? { trips: 5, participants: 6, ai: true, budget_tracker: true, guest_links: true, deal_finder: true, templates: true, flight_coord: false, export: false, cost_split_pay: false }[f.key]
                        : planId === 'pro'
                        ? { trips: -1, participants: 15, ai: true, budget_tracker: true, guest_links: true, deal_finder: true, templates: true, flight_coord: true, export: true, cost_split_pay: false }[f.key]
                        : { trips: -1, participants: -1, ai: true, budget_tracker: true, guest_links: true, deal_finder: true, templates: true, flight_coord: true, export: true, cost_split_pay: true }[f.key];
                      const included = typeof val === 'boolean' ? val : true;
                      const label = typeof val === 'number' ? f.label(val) : f.label(val);
                      const FIcon = f.icon;
                      return (
                        <div key={f.key} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${included ? 'bg-emerald-100' : 'bg-[#E8E4DF]'}`}>
                            {included ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-[#B0AEA6]" />}
                          </div>
                          <span className={`text-sm font-['Outfit'] ${included ? 'text-[#1A1A1A]' : 'text-[#B0AEA6]'}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Social Proof — Variant B only */}
        {variant === 'B' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-16 text-center">
            <p className="text-sm text-[#5C5C5C] font-['Outfit'] mb-3">Trusted by 2,400+ travel groups worldwide</p>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[#2A3B32]/10 flex items-center justify-center text-[10px] font-bold text-[#2A3B32]">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-[#E07A5F]/10 flex items-center justify-center text-[10px] font-bold text-[#E07A5F]">+2k</div>
            </div>
          </motion.div>
        )}

        {/* FAQ */}
        <div className="mt-24 text-center">
          <h2 className="font-['Cormorant_Garamond'] text-3xl font-medium text-[#2A3B32] mb-8">Frequently asked</h2>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            {FAQ.map((faq) => (
              <details key={faq.q} className="bg-white rounded-2xl border border-[#E8E4DF] p-5 group"
                onClick={() => trackEvent('faq_open', { question: faq.q.slice(0, 40) })}>
                <summary className="font-['Outfit'] font-medium text-[#1A1A1A] cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-[#5C5C5C] group-open:rotate-45 transition-transform text-xl leading-none">+</span>
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
          <h2 className="font-['Cormorant_Garamond'] text-3xl lg:text-4xl font-medium text-white mb-4">
            {variant === 'A' ? 'Start planning. It\'s free.' : 'Your next trip starts here.'}
          </h2>
          <p className="text-white/60 font-['Outfit'] mb-8">Join thousands of groups who plan trips without the chaos.</p>
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button className="bg-[#E07A5F] hover:bg-[#D26A4F] text-white rounded-full px-10 py-7 text-base font-['Outfit'] shadow-lg shadow-[#E07A5F]/30"
              onClick={() => trackEvent('footer_cta_click')}>
              Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
