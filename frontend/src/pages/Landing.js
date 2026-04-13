import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Sparkles, ArrowRight, ChevronRight, Globe, Calendar, Wallet, CheckCircle, Smartphone, Sun, CreditCard, Bell, MessageSquare, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const HERO_IMG = "https://images.unsplash.com/photo-1743611847941-79f1b9bd5626?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHx0cmF2ZWwlMjBncm91cCUyMGZyaWVuZHMlMjBzdW5zZXR8ZW58MHx8fHwxNzc2MDgzNzMyfDA&ixlib=rb-4.1.0&q=85&w=1920";

const tripTypes = [
  { icon: "🎉", label: "EVG / Bachelor", tag: "evg" },
  { icon: "💃", label: "EVJF / Bachelorette", tag: "evjf" },
  { icon: "🎂", label: "Birthday", tag: "birthday" },
  { icon: "❤️", label: "Romantic Getaway", tag: "romantic" },
  { icon: "👨‍👩‍👧‍👦", label: "Family Trip", tag: "family" },
  { icon: "⛰️", label: "Adventure", tag: "adventure" },
  { icon: "🏖️", label: "Beach & Relax", tag: "beach" },
  { icon: "🏙️", label: "City Break", tag: "city_break" },
];

const steps = [
  { icon: <Users className="w-6 h-6" />, title: "Create Your Trip", desc: "Set trip type, dates, and budget. Invite your group in one click." },
  { icon: <Calendar className="w-6 h-6" />, title: "Everyone Shares Preferences", desc: "Each member fills constraints: dates, budget, departure city, style." },
  { icon: <Sparkles className="w-6 h-6" />, title: "AI Finds the Best Match", desc: "Our engine scores destinations against the whole group and suggests the best compromise." },
  { icon: <CheckCircle className="w-6 h-6" />, title: "Vote & Book Together", desc: "Compare options, vote, and get your full itinerary with transport, hotels, restaurants." },
];

const destinations = [
  { name: "Barcelona", img: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400", tag: "From 380 EUR" },
  { name: "Lisbon", img: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400", tag: "From 300 EUR" },
  { name: "Marrakech", img: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400", tag: "From 280 EUR" },
  { name: "Amsterdam", img: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400", tag: "From 430 EUR" },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }) };

export default function Landing() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/40" data-testid="landing-navbar">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-7 h-7 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-xl text-[#1C1E1D]">TripSync</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-[#5C605E] hover:text-[#1C1E1D] transition-colors">How it works</a>
            <a href="#destinations" className="text-sm text-[#5C605E] hover:text-[#1C1E1D] transition-colors">Destinations</a>
            <a href="#trip-types" className="text-sm text-[#5C605E] hover:text-[#1C1E1D] transition-colors">Trip Types</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-5" data-testid="go-to-dashboard-btn">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden md:block">
                  <Button variant="ghost" className="text-[#2C4234] hover:bg-[#2C4234]/5 rounded-xl" data-testid="login-btn">Log in</Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-5" data-testid="get-started-btn">
                    Get Started <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Friends traveling" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-32 md:py-44 lg:py-56">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-1.5 mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-[#D96A53]" />
              <span className="text-white/90 text-sm font-medium">AI-Powered Group Travel Planning</span>
            </div>
            <h1 className="font-['Outfit'] text-4xl sm:text-5xl lg:text-6xl font-medium text-white tracking-tight leading-none mb-6">
              Plan group trips<br />without the chaos
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-lg leading-relaxed">
              Collect everyone's preferences, find the perfect destination, and book together. From bachelor weekends to family holidays.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={user ? "/create-trip" : "/auth"}>
                <Button className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-8 py-6 text-base" data-testid="hero-cta-btn">
                  Plan a Trip Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl px-8 py-6 text-base backdrop-blur-sm">
                  See How It Works
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sound Familiar - Pain Points */}
      <section className="py-24 px-6 bg-white" data-testid="pain-points-section">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-['Outfit'] text-3xl lg:text-4xl font-bold text-[#1C1E1D] tracking-tight mb-4">Sound familiar?</h2>
            <p className="text-[#5C605E] text-base lg:text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
              Planning group trips usually means endless chats, mismatched schedules, and compromises that make no one happy.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <MessageSquare className="w-7 h-7 text-[#5C605E]" />, title: "Endless group chats", desc: "Messages get lost, decisions never stick" },
              { icon: <Calendar className="w-7 h-7 text-[#5C605E]" />, title: "Date conflicts", desc: "Finding dates that work for everyone is a nightmare" },
              { icon: <Wallet className="w-7 h-7 text-[#5C605E]" />, title: "Budget mismatches", desc: "Someone always feels left out or overspends" },
            ].map((item, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-[#F7F6F2] rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#E5E4DE] flex items-center justify-center mx-auto mb-5">
                  {item.icon}
                </div>
                <h3 className="font-['Outfit'] text-lg font-bold text-[#1C1E1D] mb-2">{item.title}</h3>
                <p className="text-sm text-[#5C605E] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - Three Steps */}
      <section id="how-it-works" className="py-24 px-6 bg-[#F7F6F2]" data-testid="how-it-works-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#D96A53] text-sm font-medium uppercase tracking-[0.2em]">How It Works</span>
            <h2 className="font-['Outfit'] text-3xl lg:text-4xl font-bold text-[#1C1E1D] mt-3 tracking-tight">Three steps to your perfect trip</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Users className="w-6 h-6 text-[#D96A53]" />, num: "01", title: "Invite your group", desc: "Create a trip and share the link. Everyone joins in seconds." },
              { icon: <Sparkles className="w-6 h-6 text-[#D96A53]" />, num: "02", title: "Share preferences", desc: "Each person enters their dates, budget, and what they want from the trip." },
              { icon: <MapPin className="w-6 h-6 text-[#D96A53]" />, num: "03", title: "Get matched", desc: "We analyze everyone's input and suggest the best destinations that fit your group." },
            ].map((step, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white rounded-2xl p-8 border border-[#E5E4DE] relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(44,66,52,0.08)] transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#D96A53]/10 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="font-['Outfit'] text-5xl font-bold text-[#E5E4DE] leading-none">{step.num}</span>
                </div>
                <h3 className="font-['Outfit'] text-lg font-bold text-[#1C1E1D] mb-2">{step.title}</h3>
                <p className="text-sm text-[#5C605E] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Matching - Feature Showcase */}
      <section className="py-24 px-6 bg-white" data-testid="smart-matching-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-[#D96A53] text-sm font-medium uppercase tracking-[0.2em]">Smart Matching</span>
              <h2 className="font-['Outfit'] text-3xl lg:text-4xl font-bold text-[#1C1E1D] mt-3 tracking-tight leading-tight mb-6">
                Find the best compromise, automatically
              </h2>
              <p className="text-[#5C605E] text-base leading-relaxed mb-8">
                Our algorithm considers everyone's constraints and preferences to find destinations where the whole group wins. See exactly why each option fits - or doesn't.
              </p>
              <div className="space-y-4">
                {[
                  "Date overlap detection",
                  "Budget compatibility scoring",
                  "Transport convenience analysis",
                  "Preference matching algorithm",
                  "Hard constraint filtering",
                ].map((item, i) => (
                  <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                    className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#2C4234]/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#2C4234]" />
                    </div>
                    <span className="text-[#1C1E1D] text-sm font-medium">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="relative">
              <div className="rounded-2xl overflow-hidden shadow-[0_16px_64px_rgba(44,66,52,0.12)]">
                <img src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800" alt="Travel planning" className="w-full h-80 lg:h-96 object-cover" />
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                className="absolute -bottom-6 left-8 bg-white rounded-2xl shadow-lg border border-[#E5E4DE] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2C4234] flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-['Outfit'] font-bold text-[#1C1E1D]">92% Match</div>
                  <div className="text-xs text-[#5C605E]">Barcelona fits best!</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trip Types */}
      <section id="trip-types" className="py-24 px-6 bg-[#2C4234]" data-testid="trip-types-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#D96A53] text-sm font-medium uppercase tracking-[0.2em]">Trip Types</span>
            <h2 className="font-['Outfit'] text-3xl lg:text-4xl font-medium text-white mt-3 tracking-tight">Every occasion, covered</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tripTypes.map((tt, i) => (
              <motion.div key={tt.tag} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-all duration-300 cursor-pointer text-center">
                <div className="text-3xl mb-3">{tt.icon}</div>
                <div className="text-white font-medium text-sm">{tt.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Preview */}
      <section id="destinations" className="py-24 px-6" data-testid="destinations-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#D96A53] text-sm font-medium uppercase tracking-[0.2em]">Popular Destinations</span>
            <h2 className="font-['Outfit'] text-3xl lg:text-4xl font-medium text-[#1C1E1D] mt-3 tracking-tight">Where groups love to go</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {destinations.map((d, i) => (
              <motion.div key={d.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="group relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer">
                <img src={d.img} alt={d.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-['Outfit'] text-white font-medium text-lg">{d.name}</h3>
                  <span className="text-white/70 text-sm">{d.tag}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Features */}
      <section className="py-24 px-6 bg-white" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#D96A53] text-sm font-medium uppercase tracking-[0.2em]">Premium Features</span>
            <h2 className="font-['Outfit'] text-3xl lg:text-4xl font-medium text-[#1C1E1D] mt-3 tracking-tight">Everything you need, in one place</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Sun className="w-6 h-6" />, title: "Smart Weekend Finder", desc: "AI matches group availability with weather data and flight price trends to find the perfect weekend.", color: "text-amber-500", bg: "bg-amber-50" },
              { icon: <CreditCard className="w-6 h-6" />, title: "Cost Splitter & Pay", desc: "Collect payments from everyone via Stripe. Track who paid, generate receipts automatically.", color: "text-[#D96A53]", bg: "bg-red-50" },
              { icon: <Bell className="w-6 h-6" />, title: "Real-time Updates", desc: "Get instant notifications when someone joins, votes, or pays. Live activity feed in workspace.", color: "text-blue-500", bg: "bg-blue-50" },
              { icon: <Smartphone className="w-6 h-6" />, title: "Install as App", desc: "Add TripSync to your phone's home screen. Works offline, sends push notifications.", color: "text-[#2C4234]", bg: "bg-green-50" },
            ].map((f, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="p-6 rounded-2xl border border-[#E5E4DE] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(44,66,52,0.08)] transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center ${f.color} mb-4`}>{f.icon}</div>
                <h3 className="font-['Outfit'] text-lg font-medium text-[#1C1E1D] mb-2">{f.title}</h3>
                <p className="text-sm text-[#5C605E] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Install App Banner */}
      {installPrompt && (
        <section className="py-12 px-6 bg-[#F7F6F2]">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-white rounded-2xl border border-[#E5E4DE] p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[#2C4234] flex items-center justify-center shrink-0">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-['Outfit'] text-xl font-medium text-[#1C1E1D] mb-1">Get the TripSync App</h3>
                <p className="text-sm text-[#5C605E]">Install on your phone for the best experience. Access trips, get notifications, and plan on the go.</p>
              </div>
              <Button onClick={handleInstall} className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl px-6 py-5 shrink-0" data-testid="install-app-btn">
                <Smartphone className="w-4 h-4 mr-2" /> Install App
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 px-6 bg-[#2C4234]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-['Outfit'] text-3xl lg:text-4xl font-medium text-white mb-6 tracking-tight">Ready to plan your next group trip?</h2>
          <p className="text-white/70 text-lg mb-8">Stop the endless WhatsApp debates. Let TripSync find the best compromise for everyone.</p>
          <Link to={user ? "/create-trip" : "/auth"}>
            <Button className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-10 py-6 text-base" data-testid="cta-plan-trip-btn">
              Start Planning <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#E5E4DE]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-[#1C1E1D]">TripSync</span>
          </div>
          <p className="text-sm text-[#5C605E]">The AI platform for all-inclusive group travel</p>
        </div>
      </footer>
    </div>
  );
}
