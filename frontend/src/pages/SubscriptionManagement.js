import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Check, X, Crown, Zap, Sparkles, ArrowRight, AlertTriangle, Shield, Calendar, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PLAN_ICONS = { free: Globe, pro: Zap, team: Crown };
const PLAN_COLORS = { free: 'from-[#2A3B32] to-[#3D5A47]', pro: 'from-[#E07A5F] to-[#C25944]', team: 'from-indigo-600 to-purple-700' };

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [abStats, setAbStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/subscription/status'),
      api.get('/analytics/pricing-stats').catch(() => ({ data: null }))
    ]).then(([s, a]) => {
      setSub(s.data);
      setAbStats(a.data);
    }).catch(err => { console.error('Sub fetch failed:', err); })
    .finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.post('/subscription/cancel');
      toast.success('Subscription cancelled. You keep access until billing cycle ends.');
      setSub(p => ({ ...p, plan: 'free', subscription: null }));
      setShowCancel(false);
    } catch (err) {
      console.error('Cancel failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
      <div className="w-10 h-10 border-3 border-[#2A3B32] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const plan = sub?.plan || 'free';
  const details = sub?.details || {};
  const usage = sub?.usage || {};
  const Icon = PLAN_ICONS[plan] || Globe;
  const color = PLAN_COLORS[plan] || PLAN_COLORS.free;
  const isFree = plan === 'free';
  const tripsUsed = usage.trips_created || 0;
  const tripsLimit = usage.trips_limit || 5;
  const tripsPercent = tripsLimit === -1 ? 0 : Math.min(100, Math.round((tripsUsed / tripsLimit) * 100));

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#1A1A1A]">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2A3B32]" />
            <span className="font-['Cormorant_Garamond'] font-semibold text-lg">TripSync</span>
          </Link>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10" data-testid="subscription-management-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-['Cormorant_Garamond'] text-3xl font-medium text-[#2A3B32] mb-2">Subscription</h1>
          <p className="text-[#5C5C5C] font-['Outfit'] mb-8">Manage your plan and billing</p>

          {/* Current Plan Card */}
          <div className="bg-white rounded-3xl border border-[#E8E4DF] overflow-hidden mb-8" data-testid="current-plan-card">
            <div className={`bg-gradient-to-r ${color} p-6 flex items-center justify-between`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-['Outfit'] text-xl font-bold text-white">{details.name || 'Explorer'}</h2>
                  <p className="text-white/70 text-sm font-['Outfit']">
                    {isFree ? 'Free forever' : `$${sub?.billing === 'annual' ? details.price_annual : details.price_monthly}/${sub?.billing === 'annual' ? 'year' : 'month'}`}
                  </p>
                </div>
              </div>
              {!isFree && (
                <span className="bg-white/20 text-white text-xs font-['Outfit'] font-bold px-3 py-1 rounded-full">
                  {sub?.billing === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              )}
            </div>
            <div className="p-6">
              {/* Usage */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm font-['Outfit'] mb-2">
                  <span className="text-[#5C5C5C]">Trips created</span>
                  <span className="font-medium text-[#1A1A1A]">{tripsUsed}{tripsLimit !== -1 ? ` / ${tripsLimit}` : ' (unlimited)'}</span>
                </div>
                {tripsLimit !== -1 && (
                  <div className="h-2 bg-[#E8E4DF] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${tripsPercent >= 80 ? 'bg-[#E07A5F]' : 'bg-emerald-500'}`}
                      style={{ width: `${tripsPercent}%` }} />
                  </div>
                )}
                {tripsPercent >= 80 && tripsLimit !== -1 && (
                  <p className="text-xs text-[#E07A5F] font-['Outfit'] mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Approaching trip limit. <Link to="/pricing" className="underline font-medium">Upgrade for unlimited</Link>
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  { label: 'Participants/trip', value: details.participants === -1 ? 'Unlimited' : details.participants },
                  { label: 'Flight coordination', value: details.flight_coord },
                  { label: 'Calendar export', value: details.export },
                  { label: 'Cost splitting', value: details.cost_split_pay },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 text-sm font-['Outfit']">
                    {typeof f.value === 'boolean' ? (
                      f.value ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-[#B0AEA6]" />
                    ) : (
                      <Shield className="w-4 h-4 text-[#2A3B32]" />
                    )}
                    <span className="text-[#5C5C5C]">{f.label}: <span className="text-[#1A1A1A] font-medium">{typeof f.value === 'boolean' ? (f.value ? 'Yes' : 'No') : f.value}</span></span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                {isFree ? (
                  <Link to="/pricing">
                    <Button className="bg-[#E07A5F] hover:bg-[#D26A4F] text-white rounded-full px-6 font-['Outfit']" data-testid="upgrade-btn">
                      <Sparkles className="w-4 h-4 mr-1.5" /> Upgrade Plan
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/pricing">
                      <Button variant="outline" className="rounded-full border-[#E8E4DF] font-['Outfit']" data-testid="change-plan-btn">
                        Change Plan
                      </Button>
                    </Link>
                    <Button onClick={() => setShowCancel(true)} variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full font-['Outfit']" data-testid="cancel-btn">
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </div>

              {/* Cancel Confirmation */}
              {showCancel && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-800 font-['Outfit'] mb-3">
                    Are you sure? You'll lose access to premium features at the end of your billing cycle.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} disabled={cancelling}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-['Outfit']" data-testid="confirm-cancel-btn">
                      {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                    </Button>
                    <Button onClick={() => setShowCancel(false)} variant="ghost" className="rounded-full text-sm font-['Outfit']">
                      Keep my plan
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* A/B Test Dashboard — Only for admin */}
          {user?.role === 'admin' && abStats && (
            <div className="bg-white rounded-3xl border border-[#E8E4DF] p-6 mb-8" data-testid="ab-dashboard">
              <h3 className="font-['Outfit'] font-bold text-[#1A1A1A] mb-1 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#E07A5F]" /> A/B Test Dashboard
              </h3>
              <p className="text-xs text-[#5C5C5C] font-['Outfit'] mb-4">Pricing page variant performance</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F7F5F0] rounded-xl p-4 text-center">
                  <div className="text-2xl font-['Outfit'] font-bold text-[#1A1A1A]">{abStats.total_events}</div>
                  <div className="text-[10px] text-[#5C5C5C] uppercase tracking-wider">Total Events</div>
                </div>
                <div className="bg-[#F7F5F0] rounded-xl p-4 text-center">
                  <div className="text-2xl font-['Outfit'] font-bold text-[#1A1A1A]">{abStats.unique_sessions}</div>
                  <div className="text-[10px] text-[#5C5C5C] uppercase tracking-wider">Unique Visitors</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-lg font-['Outfit'] font-bold text-emerald-700">{abStats.recommendation}</div>
                  <div className="text-[10px] text-emerald-600 uppercase tracking-wider">Winning Variant</div>
                </div>
              </div>

              {/* Variant comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {['A', 'B'].map(v => {
                  const s = abStats.stats?.[v] || {};
                  return (
                    <div key={v} className={`rounded-xl border p-4 ${abStats.recommendation === `Variant ${v}` ? 'border-emerald-300 bg-emerald-50' : 'border-[#E8E4DF]'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-['Outfit'] font-bold text-[#1A1A1A]">Variant {v}</span>
                        {abStats.recommendation === `Variant ${v}` && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">WINNER</span>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs font-['Outfit']">
                        <div className="flex justify-between"><span className="text-[#5C5C5C]">Page views</span><span className="font-medium">{s.page_view || 0}</span></div>
                        <div className="flex justify-between"><span className="text-[#5C5C5C]">Plan clicks</span><span className="font-medium">{s.plan_click || 0}</span></div>
                        <div className="flex justify-between"><span className="text-[#5C5C5C]">Subscribe clicks</span><span className="font-medium">{s.subscribe_click || 0}</span></div>
                        <div className="flex justify-between border-t border-[#E8E4DF] pt-1.5 mt-1.5">
                          <span className="text-[#5C5C5C] font-medium">Conversion</span>
                          <span className={`font-bold ${(s.conversion_rate || 0) > 0 ? 'text-emerald-600' : 'text-[#5C5C5C]'}`}>{s.conversion_rate || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#5C5C5C]">Engagement</span>
                          <span className="font-medium">{s.engagement_rate || 0}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Billing preference */}
              {abStats.billing_prefs && Object.keys(abStats.billing_prefs).length > 0 && (
                <div className="bg-[#F7F5F0] rounded-xl p-4">
                  <div className="text-xs font-['Outfit'] font-bold text-[#5C5C5C] uppercase tracking-wider mb-2">Billing Preference</div>
                  <div className="flex gap-4">
                    {Object.entries(abStats.billing_prefs).map(([k, v]) => (
                      <div key={k} className="text-sm font-['Outfit']">
                        <span className="text-[#5C5C5C] capitalize">{k}:</span> <span className="font-bold text-[#1A1A1A]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-admin: simple stats */}
          {user?.role !== 'admin' && !isFree && sub?.subscription && (
            <div className="bg-white rounded-3xl border border-[#E8E4DF] p-6">
              <h3 className="font-['Outfit'] font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#2A3B32]" /> Billing Info
              </h3>
              <div className="space-y-2 text-sm font-['Outfit']">
                <div className="flex justify-between">
                  <span className="text-[#5C5C5C]">Started</span>
                  <span className="text-[#1A1A1A]">{sub.subscription.started_at ? new Date(sub.subscription.started_at).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5C5C]">Billing cycle</span>
                  <span className="text-[#1A1A1A] capitalize">{sub.billing}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
