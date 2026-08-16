'use client';

import { useState, useEffect, useRef } from 'react';
import { X, KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck, UserCheck, ChevronDown } from 'lucide-react';
import { api } from '@/services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialRole?: 'SUPER_ADMIN' | 'TEACHER';
  onClose: () => void;
  onSuccessReset?: (newPassword: string) => void;
}

interface TeacherOption {
  id: number;
  name: string;
  masked_phone: string;
  phone: string;
}

export default function ForgotPasswordModal({
  isOpen,
  initialRole = 'TEACHER',
  onClose,
  onSuccessReset
}: ForgotPasswordModalProps) {
  const [selectedRole, setSelectedRole] = useState<'SUPER_ADMIN' | 'TEACHER'>(initialRole);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1 -> Step 2 transition state
  const [resetToken, setResetToken] = useState('');
  const [targetMaskedPhone, setTargetMaskedPhone] = useState('');
  const [targetName, setTargetName] = useState('');

  // Step 2: 6 OTP Input Boxes State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend Countdown Timer (60s)
  const [resendCountdown, setResendCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Step 3: New Password State
  const [verifyToken, setVerifyToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch registered teachers list for dropdown
  useEffect(() => {
    if (isOpen) {
      async function fetchTeachers() {
        try {
          const res = await api.get('/auth/teachers-list');
          if (res.data.success) {
            const list: TeacherOption[] = res.data.data || [];
            setTeachers(list);
            if (list.length > 0) {
              setSelectedTeacherId(String(list[0].id));
            }
          }
        } catch (err) {
          console.error('Failed to fetch teachers:', err);
        }
      }
      fetchTeachers();
    }
  }, [isOpen]);

  // Resend Countdown Effect
  useEffect(() => {
    let timer: any = null;
    if (step === 2 && resendCountdown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCountdown]);

  if (!isOpen) return null;

  // Selected Teacher Object
  const currentSelectedTeacher = teachers.find(t => String(t.id) === selectedTeacherId) || teachers[0];

  // Masked Phone Display in Step 1
  const displayMaskedPhone = selectedRole === 'SUPER_ADMIN'
    ? '+91 ******2052'
    : (currentSelectedTeacher ? currentSelectedTeacher.masked_phone : '+91 ******1234');

  // Handle OTP digit box input auto-advance
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    // Auto-advance to next input box
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // STEP 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = selectedRole === 'SUPER_ADMIN'
        ? { role: 'SUPER_ADMIN' }
        : { user_id: selectedTeacherId ? Number(selectedTeacherId) : undefined, role: 'TEACHER' };

      const res = await api.post('/auth/forgot-password/request', payload);

      if (res.data.success) {
        const { reset_token, user_name, masked_phone } = res.data.data;
        setResetToken(reset_token);
        setTargetName(user_name);
        setTargetMaskedPhone(masked_phone);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCountdown(60);
        setStep(2); // Immediately transition to Verify OTP step
      } else {
        setError(res.data.error?.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP. Please check account selection.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/verify-otp', {
        reset_token: resetToken,
        otp_code: fullOtp
      });

      if (res.data.success) {
        setVerifyToken(res.data.data.verify_token);
        setStep(3); // Advance to Create New Password
      } else {
        setError(res.data.error?.message || 'Invalid OTP code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid 6-digit OTP code. Please check your mobile and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResend) return;
    setError('');
    setLoading(true);

    try {
      const payload = selectedRole === 'SUPER_ADMIN'
        ? { role: 'SUPER_ADMIN' }
        : { user_id: selectedTeacherId ? Number(selectedTeacherId) : undefined, role: 'TEACHER' };

      const res = await api.post('/auth/forgot-password/request', payload);

      if (res.data.success) {
        setResetToken(res.data.data.reset_token);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCountdown(60);
        setCanResend(false);
      } else {
        setError(res.data.error?.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/reset', {
        verify_token: verifyToken,
        new_password: newPassword.trim(),
        role: selectedRole
      });

      if (res.data.success) {
        setStep(4);
        setSuccessMsg(res.data.message || 'Your password has been updated successfully.');
        if (onSuccessReset) {
          onSuccessReset(newPassword.trim());
        }
      } else {
        setError(res.data.error?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update password. Session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 relative">
        {/* Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">🔑 Forgot Password?</h3>
              <p className="text-xs text-slate-500 font-medium pt-0.5">
                Reset your account password securely using OTP verification.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-[11px] font-extrabold">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
            step === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
          }`}>
            <span>1 Account</span>
          </div>
          <span className="text-slate-300 font-bold">→</span>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
            step === 2 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
          }`}>
            <span>2 OTP</span>
          </div>
          <span className="text-slate-300 font-bold">→</span>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
            step >= 3 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
          }`}>
            <span>3 New Password</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* STEP 1 — SELECT ACCOUNT */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                Select Account Type
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('TEACHER')}
                  className={`p-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition border ${
                    selectedRole === 'TEACHER'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Teacher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('SUPER_ADMIN')}
                  className={`p-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition border ${
                    selectedRole === 'SUPER_ADMIN'
                      ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-102'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Super Admin</span>
                </button>
              </div>
            </div>

            {/* If Teacher selected -> Show Select Teacher Dropdown */}
            {selectedRole === 'TEACHER' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  Select Teacher
                </label>
                <div className="relative">
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 appearance-none cursor-pointer"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.masked_phone})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Masked Phone Info Card */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold text-center">
              OTP will be sent to <strong>{displayMaskedPhone}</strong>
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
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? 'Sending OTP...' : 'Send OTP →'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2 — OTP VERIFICATION */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-slate-900">Verify OTP</h4>
              <p className="text-xs text-slate-600 font-medium">
                Enter the 6-digit OTP sent to <strong className="text-slate-900">{targetMaskedPhone}</strong>
              </p>
            </div>

            {/* 6 Individual OTP Input Boxes */}
            <div className="flex justify-center items-center gap-2 pt-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="w-10 h-12 text-center text-lg font-black font-mono border-2 border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-slate-50 text-slate-900"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? 'Verifying OTP...' : 'Verify OTP →'}
            </button>

            {/* Resend OTP & 60s Countdown */}
            <div className="text-center pt-2 space-y-1">
              <p className="text-xs font-semibold text-slate-600">
                Didn't receive the OTP?{' '}
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-emerald-600 hover:underline font-extrabold cursor-pointer"
                  >
                    Resend OTP
                  </button>
                ) : (
                  <span className="text-slate-400 font-bold">
                    Resend OTP in {resendCountdown}s
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                OTP expires in 10 minutes.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                ← Select Different Account
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 — CREATE NEW PASSWORD */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center space-y-1">
              <h4 className="text-sm font-black text-slate-900">Create New Password</h4>
              <p className="text-xs text-slate-500 font-medium">
                Set a strong new password for your account.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1 text-xs">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min 6 chars)..."
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1 text-xs">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password..."
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Saving Password...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4 — SUCCESS CONFIRMATION */}
        {step === 4 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">Password Changed Successfully ✓</h4>
              <p className="text-xs text-slate-600 font-medium">
                {successMsg || 'Your password has been updated successfully.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition text-xs"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
