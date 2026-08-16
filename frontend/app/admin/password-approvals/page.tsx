'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle, Send, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/services/api';

interface PasswordRequest {
  id: number;
  request_token: string;
  user_id: number;
  role_name: string;
  requester_name: string;
  requester_phone: string;
  requester_phone_masked: string;
  code1_head_teacher: string;
  status: 'PENDING_HEAD_TEACHER_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'EXPIRED';
  head_teacher_phone: string;
  created_at: string;
  approved_at: string | null;
  expires_at: string;
}

export default function HeadTeacherPasswordApprovalsPage() {
  const [requests, setRequests] = useState<PasswordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/password-approvals');
      if (res.data.success) {
        setRequests(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch password approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000); // Auto refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (token: string) => {
    setActionLoading(prev => ({ ...prev, [token]: true }));
    setMessage(null);
    try {
      const res = await api.post('/auth/password-approvals/approve', { request_token: token });
      if (res.data.success) {
        setMessage({ text: 'Request APPROVED! Secret Verification Code 2 sent to Requester via WhatsApp.', type: 'success' });
        fetchApprovals();
      } else {
        setMessage({ text: res.data.error?.message || 'Failed to approve request.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error?.message || 'Approval failed.', type: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [token]: false }));
    }
  };

  const handleReject = async (token: string) => {
    setActionLoading(prev => ({ ...prev, [token]: true }));
    setMessage(null);
    try {
      const res = await api.post('/auth/password-approvals/reject', { request_token: token });
      if (res.data.success) {
        setMessage({ text: 'Request REJECTED.', type: 'success' });
        fetchApprovals();
      } else {
        setMessage({ text: res.data.error?.message || 'Failed to reject request.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error?.message || 'Rejection failed.', type: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [token]: false }));
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Head Teacher Approval Portal <ShieldCheck className="w-6 h-6 text-purple-600" />
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">
            Review & Approve/Reject pending 2-step WhatsApp password recovery requests
          </p>
        </div>

        <button
          onClick={fetchApprovals}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Requests
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          {message.text}
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {loading && requests.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 font-bold text-xs rounded-3xl border border-slate-200">
            Loading pending approval requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-12 text-center space-y-2 rounded-3xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-800">No Pending Requests</h3>
            <p className="text-xs text-slate-500 font-medium">All password recovery requests have been processed.</p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className={`p-5 rounded-3xl border transition shadow-sm space-y-4 ${
                req.status === 'PENDING_HEAD_TEACHER_APPROVAL'
                  ? 'bg-amber-50/60 border-amber-300'
                  : req.status === 'APPROVED'
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : req.status === 'REJECTED'
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center text-sm text-white ${
                    req.role_name === 'SUPER_ADMIN' ? 'bg-purple-700' : 'bg-blue-600'
                  }`}>
                    {req.requester_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      {req.requester_name}
                      {req.role_name === 'SUPER_ADMIN' ? (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Super Admin
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3" /> Teacher Portal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-semibold">
                      Registered Mobile: <strong>+91 {req.requester_phone}</strong>
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {req.status === 'PENDING_HEAD_TEACHER_APPROVAL' && (
                    <span className="bg-amber-500 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> PENDING HEAD TEACHER APPROVAL
                    </span>
                  )}
                  {req.status === 'APPROVED' && (
                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED (Code 2 Sent)
                    </span>
                  )}
                  {req.status === 'REJECTED' && (
                    <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> REJECTED
                    </span>
                  )}
                  {req.status === 'COMPLETED' && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED & UPDATED
                    </span>
                  )}
                  {req.status === 'EXPIRED' && (
                    <span className="bg-slate-500 text-white text-xs font-bold px-3 py-1 rounded-xl">
                      EXPIRED
                    </span>
                  )}
                </div>
              </div>

              {/* Approval Info & Action Buttons */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-xs space-y-1">
                  <div className="text-slate-500 font-semibold flex items-center gap-2">
                    <span>Requested: {new Date(req.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-amber-800 font-bold">10-Min Limit</span>
                  </div>
                  <div className="text-slate-700 font-medium">
                    Head Teacher WhatsApp Notification Target: <strong>+91 {req.head_teacher_phone}</strong>
                  </div>
                </div>

                {req.status === 'PENDING_HEAD_TEACHER_APPROVAL' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleReject(req.request_token)}
                      disabled={actionLoading[req.request_token]}
                      className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /> REJECT
                    </button>

                    <button
                      onClick={() => handleApprove(req.request_token)}
                      disabled={actionLoading[req.request_token]}
                      className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> {actionLoading[req.request_token] ? 'Approving...' : 'APPROVE & SEND CODE 2'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
