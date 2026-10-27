import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { InstallAppButton } from '../components/AppActions';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';

/**
 * Standalone staff sign-in. Not linked from the storefront; rendered without the
 * store's navbar/footer. Authorization is still enforced server-side on every
 * /api/admin request — this page only gates the UI.
 */
export const AdminLoginPage: React.FC = () => {
  const { user, authLoading, refreshAuth, logout } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Staff Sign In';
    if (!authLoading && user?.role === 'admin') navigate('/admin', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.success && res.user?.role === 'admin') {
        await refreshAuth();
        navigate('/admin', { replace: true });
      } else if (res.user && res.user.role !== 'admin') {
        // A valid customer login must not leave a session open on the staff page
        await logout();
        setError('This account does not have administrator privileges. Please sign in with an admin account.');
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090B] flex items-center justify-center px-4 grain relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(197,160,89,0.12),transparent_60%)]" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-[#111215] border border-[#C5A059]/25 rounded-2xl p-8 space-y-6 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <img
            src="/brand/logo-full.png"
            alt="BinFareed Store"
            width={112}
            height={112}
            className="h-28 w-28 rounded-full mx-auto mb-3 object-contain drop-shadow-[0_4px_16px_rgba(197,160,89,0.3)]"
          />
          <h1 className="font-serif-luxury text-3xl text-[#FAF8F5] font-semibold">Staff Console</h1>
          <p className="text-xs text-[#FAF8F5]/50">Authorized personnel only. Access is logged.</p>
        </div>

        <label className="block text-xs text-[#FAF8F5]/70">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full px-3.5 py-3 rounded-lg bg-[#08090B] border border-white/10 text-[#FAF8F5] focus:border-[#C5A059] outline-none placeholder:text-white/20"
          />
        </label>
        <label className="block text-xs text-[#FAF8F5]/70">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full px-3.5 py-3 rounded-lg bg-[#08090B] border border-white/10 text-[#FAF8F5] focus:border-[#C5A059] outline-none placeholder:text-white/20"
          />
        </label>

        {error && (
          <p role="alert" className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-center">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-lux-gold w-full justify-center disabled:opacity-60">
          <Lock className="w-4 h-4" />
          {loading ? 'Verifying…' : 'Sign In'}
        </button>

        <div className="pt-2 text-center">
          <InstallAppButton
            label="Install Admin Console App"
            appName="BinFareed Admin Console"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-[#C5A059]/40 hover:border-[#C5A059] bg-[#C5A059]/10 text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold transition-colors"
          />
        </div>
      </form>
    </div>
  );
};
