'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api } from '@/services/api';
import { User, AuditLog } from '@/types';
import { FileText, Search, ShieldCheck } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          if (res.data.data.role !== 'SUPER_ADMIN') {
            router.push('/admin'); // Restrict non-Super Admins
          }
          setUser(res.data.data);
        }
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let url = `/audit-logs?limit=100&module=${selectedModule}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await api.get(url);
      if (res.data.success) setAuditLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [selectedModule, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-8 space-y-6 flex-1">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">System Audit Trail Logs</h2>
              <p className="text-xs text-slate-500">Super Admin Security: Inspection of user actions, logins, updates and deletions</p>
            </div>
            <span className="bg-purple-100 text-purple-900 text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-purple-200">
              <ShieldCheck className="w-4 h-4 text-purple-700" /> Super Admin Restricted
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Module Filter:</span>
              <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)} className="px-3 py-1.5 text-xs border rounded-xl font-medium">
                <option value="all">All Modules</option>
                <option value="HOMEWORK">HOMEWORK</option>
                <option value="NOTICES">NOTICES</option>
                <option value="ACTIVITIES">ACTIVITIES</option>
                <option value="GALLERY">GALLERY</option>
                <option value="STUDENTS">STUDENTS</option>
                <option value="AUTH">AUTH</option>
                <option value="TEACHERS">TEACHERS</option>
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search log details..." className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl outline-none" />
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading audit logs..." />
          ) : auditLogs.length === 0 ? (
            <EmptyState title="No Audit Records" message="No log entries match the selected search filter." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Module</th>
                      <th className="py-3.5 px-4">Details</th>
                      <th className="py-3.5 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{log.user_name}</td>
                        <td className="py-3 px-4">
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{log.module}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{log.details || '-'}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{log.ip_address || '::1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
