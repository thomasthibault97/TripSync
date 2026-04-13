import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatApiError } from '@/lib/api';
import { Globe, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      // Check for pending invite
      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingInvite');
        navigate(`/join/${pendingInvite}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <Globe className="w-7 h-7 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-xl text-[#1C1E1D]">TripSync</span>
          </Link>
          <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D] mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-[#5C605E] mb-8">
            {mode === 'login' ? 'Log in to manage your group trips.' : 'Start planning unforgettable trips together.'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 text-red-600 text-sm" data-testid="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson"
                  className="h-12 rounded-xl border-[#E5E4DE] bg-white focus:ring-[#2C4234] focus:border-[#2C4234]"
                  data-testid="register-name-input" required />
              </div>
            )}
            <div>
              <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className="h-12 rounded-xl border-[#E5E4DE] bg-white focus:ring-[#2C4234] focus:border-[#2C4234]"
                data-testid="auth-email-input" required />
            </div>
            <div>
              <Label className="text-[#1C1E1D] text-sm font-medium mb-1.5 block">Password</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="h-12 rounded-xl border-[#E5E4DE] bg-white focus:ring-[#2C4234] focus:border-[#2C4234] pr-12"
                  data-testid="auth-password-input" required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C605E] hover:text-[#1C1E1D]">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading}
              className="w-full h-12 bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl text-base"
              data-testid="auth-submit-btn">
              {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E4DE]" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-3 bg-[#F7F6F2] text-[#5C605E]">or</span></div>
          </div>

          {/* REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH */}
          <Button type="button" variant="outline"
            className="w-full h-12 rounded-xl border-[#E5E4DE] bg-white hover:bg-[#F7F6F2] text-[#1C1E1D] text-base"
            data-testid="google-login-btn"
            onClick={() => {
              const redirectUrl = window.location.origin + '/dashboard';
              window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
            }}>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <p className="text-center mt-6 text-sm text-[#5C605E]">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-[#2C4234] font-medium hover:underline" data-testid="auth-toggle-mode">
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src="https://images.unsplash.com/photo-1743611847941-79f1b9bd5626?w=1200" alt="Travel"
          className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#2C4234]/30" />
        <div className="absolute bottom-12 left-12 right-12">
          <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
            <p className="text-white text-lg font-['Outfit'] font-medium mb-2">
              "TripSync made planning our bachelor weekend so easy. Everyone's preferences in one place!"
            </p>
            <p className="text-white/70 text-sm">- Thomas, planned a trip for 8 friends</p>
          </div>
        </div>
      </div>
    </div>
  );
}
