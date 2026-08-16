'use client';

import { useEffect, useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '@/services/api';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  // Active Tab: 'SELF' (Super Admin Portal) or 'TEACHER' (Teacher Portal)
  const [activeTab, setActiveTab] = useState<'SELF' | 'TEACHER'>('SELF');

  const [superAdminEmail, setSuperAdminEmail] = useState('admin@jainarkodi.edu.in');
  const [teacherEmail, setTeacherEmail] = useState('teacher@jainarkodi.edu.in');
  
  const [email, setEmail] = useState('admin@jainarkodi.edu.in');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Eye Toggle State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadEmails() {
      try {
        const meRes = await api.get('/auth/me');
        if (meRes.data.success && meRes.data.data) {
          setSuperAdminEmail(meRes.data.data.email || 'admin@jainarkodi.edu.in');
          setEmail(meRes.data.data.email || 'admin@jainarkodi.edu.in');
        }

        const teachRes = await api.get('/teachers');
        if (teachRes.data.success && teachRes.data.data && teachRes.data.data.length > 0) {
          const tUser = teachRes.data.data.find((t: any) => t.role !== 'SUPER_ADMIN') || teachRes.data.data[0];
          setTeacherEmail(tUser.email || 'teacher@jainarkodi.edu.in');
        }
      } catch (err) {
        console.error('Failed to load credentials:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEmails();
  }, []);

  const handleTabChange = (tab: 'SELF' | 'TEACHER') => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    if (tab === 'SELF') {
      setEmail(superAdminEmail);
    } else {
      setEmail(teacherEmail);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Current Super Admin password is required for verification.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await api.put('/auth/update-credentials', {
        target_role: activeTab,
        current_password: currentPassword,
        new_password: newPassword ? newPassword.trim() : undefined
      });

      if (res.data.success) {
        const label = activeTab === 'SELF' ? 'Super Admin' : 'Teacher Account';
        setSuccess(`${label} credentials updated successfully!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.data.error?.message || 'Failed to update credentials.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update credentials. Please check current Super Admin password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Edit Account Credentials</h3>
            <p className="text-xs text-slate-500">Update password for Super Admin or Teacher Portal</p>
          </div>
        </div>

        {/* 2 Switcher Tabs: Super Admin Portal vs Teacher Portal */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => handleTabChange('SELF')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'SELF'
                ? 'bg-purple-700 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Super Admin Portal
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('TEACHER')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'TEACHER'
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Teacher Portal (All Teachers)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500">Loading account details...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">


            {/* Current Password Field with Eye Toggle */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {activeTab === 'SELF' ? 'Current Super Admin Password *' : 'Current Teacher Password *'}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-semibold text-slate-900"
                  placeholder={activeTab === 'SELF' ? 'Enter current Super Admin password...' : 'Enter current Teacher password...'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password Entry Card with Eye Toggles */}
            <div className={`p-3 rounded-2xl border space-y-2.5 ${
              activeTab === 'SELF' ? 'bg-purple-50/80 border-purple-200' : 'bg-blue-50/80 border-blue-200'
            }`}>
              <label className={`block font-extrabold flex items-center gap-1 ${
                activeTab === 'SELF' ? 'text-purple-900' : 'text-blue-900'
              }`}>
                <KeyRound className="w-3.5 h-3.5" /> Change Password (Optional)
              </label>
              <p className="text-[11px] text-slate-500">Leave blank to keep current password unchanged.</p>

              <div>
                <label className="block font-bold text-slate-700 text-[11px] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter new password (min 6 chars)..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 text-[11px] mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="Confirm new password..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 ${
                  activeTab === 'SELF' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
