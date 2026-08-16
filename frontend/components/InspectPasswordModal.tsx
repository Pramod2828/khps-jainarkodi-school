'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, ShieldCheck, UserCheck, KeyRound, AlertCircle, CheckCircle2, Lock, Search, Copy, Check } from 'lucide-react';
import { api } from '@/services/api';

interface InspectPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditModal?: (targetRole: 'SELF' | 'TEACHER') => void;
}

interface Account {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  active_password?: string;
  last_login_at: string | null;
  created_at: string;
}

export default function InspectPasswordModal({ isOpen, onClose, onOpenEditModal }: InspectPasswordModalProps) {
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: number]: boolean }>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/inspect-passwords', {
        super_admin_password: adminPassword
      });

      if (res.data.success) {
        setAccounts(res.data.data.accounts || []);
        setUnlocked(true);
      } else {
        setError(res.data.error?.message || 'Incorrect Super Admin password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed. Please enter correct Super Admin password.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (id: number) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id: number, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 relative">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Inspect Active Passwords</h3>
              <p className="text-xs text-slate-500 font-medium">View & inspect saved active credentials for Super Admin & Teacher</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!unlocked ? (
          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                <Lock className="w-4 h-4" /> Super Admin Authorization Required
              </div>
              <p className="text-amber-700 font-medium">
                Enter your Super Admin current password to unlock and inspect all active saved account passwords.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Super Admin Password *</label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-semibold text-slate-900"
                  placeholder="Enter Super Admin password to unlock..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? 'Verifying...' : 'Unlock & Inspect Passwords'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search account name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {filteredAccounts.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">No accounts found matching your search.</p>
              ) : (
                filteredAccounts.map((acc) => {
                  const isVisible = !!revealedPasswords[acc.id];
                  const passwordValue = acc.active_password || 'Jainarkodi#2026!';

                  return (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-cyan-300 transition space-y-3 shadow-2xs"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs text-white shadow-2xs ${
                            acc.role === 'SUPER_ADMIN' ? 'bg-purple-700' : 'bg-blue-600'
                          }`}>
                            {acc.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                              {acc.name}
                              {acc.role === 'SUPER_ADMIN' ? (
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-0.5">
                                  <ShieldCheck className="w-3 h-3" /> Super Admin
                                </span>
                              ) : (
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-0.5">
                                  <UserCheck className="w-3 h-3" /> Teacher
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500">{acc.email}</p>
                          </div>
                        </div>

                        {onOpenEditModal && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenEditModal(acc.role === 'SUPER_ADMIN' ? 'SELF' : 'TEACHER');
                            }}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200 rounded-xl transition flex items-center gap-1 shadow-2xs shrink-0"
                          >
                            <KeyRound className="w-3 h-3" /> Update Password
                          </button>
                        )}
                      </div>

                      {/* Inspected Password Card */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Saved Active Password:
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(acc.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg transition flex items-center gap-1"
                              title={isVisible ? 'Hide Password' : 'Inspect Password'}
                            >
                              {isVisible ? <EyeOff className="w-3 h-3 text-rose-600" /> : <Eye className="w-3 h-3 text-cyan-600" />}
                              <span>{isVisible ? 'Hide' : 'Inspect Password'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => copyToClipboard(acc.id, passwordValue)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                              title="Copy Password"
                            >
                              {copiedId === acc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <div className="font-mono text-xs font-black tracking-wide text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between">
                          <span>{isVisible ? passwordValue : '••••••••••••••••'}</span>
                          <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">
                            {isVisible ? 'PLAIN TEXT' : 'HIDDEN'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
