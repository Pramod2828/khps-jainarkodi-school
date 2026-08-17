'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { api } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'SUPER_ADMIN' | 'TEACHER' | 'CUSTOM'>('TEACHER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Ping health check in background on page load to wake up server from cold sleep instantly
    api.get('/health').catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token, user } = res.data.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        router.push('/admin');
      } else {
        setError(res.data.error?.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role: 'SUPER_ADMIN' | 'TEACHER') => {
    setError('');
    setSelectedRole(role);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6 relative z-10 border border-slate-100">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <GraduationCap className="w-7 h-7" />
            </div>
          </Link>
          <h2 className="text-xl font-black text-slate-900 tracking-tight pt-2">
            Teacher & Admin Portal
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Government Primary School Jainarkodi
          </p>
        </div>

        {/* Dynamic Role Indicator Badge */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block text-center">
            Select Account Role to Login:
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectRole('TEACHER')}
              className={`p-3 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition border ${
                selectedRole === 'TEACHER'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span>Teacher Portal</span>
            </button>

            <button
              type="button"
              onClick={() => selectRole('SUPER_ADMIN')}
              className={`p-3 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition border ${
                selectedRole === 'SUPER_ADMIN'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-105'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Super Admin</span>
            </button>
          </div>

          <div className="pt-2 text-center">
            {selectedRole === 'SUPER_ADMIN' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logging in as: <strong>SUPER ADMIN</strong>
              </span>
            )}
            {selectedRole === 'TEACHER' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logging in as: <strong>TEACHER PORTAL</strong>
              </span>
            )}
            {selectedRole === 'CUSTOM' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Logging in with Custom Email
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} noValidate className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email / Username *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedRole('CUSTOM');
                }}
                required
                placeholder="Teacher or Admin"
                className="w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : `Sign In as ${selectedRole === 'SUPER_ADMIN' ? 'Super Admin' : selectedRole === 'TEACHER' ? 'Teacher Portal' : 'Portal User'}`} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link href="/" className="text-xs text-slate-500 hover:text-emerald-600 font-medium">
            ← Back to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}
