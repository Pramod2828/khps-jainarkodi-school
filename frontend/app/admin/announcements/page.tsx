'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api } from '@/services/api';
import { User, Announcement } from '@/types';
import { Megaphone, Plus, Trash2, X, Power } from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) setUser(res.data.data);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      if (res.data.success) setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setSaving(true);
    try {
      await api.post('/announcements', { content });
      setIsModalOpen(false);
      setContent('');
      loadAnnouncements();
    } catch (err) {
      alert('Failed to add announcement');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      await api.put(`/announcements/${announcement.id}`, { is_active: !announcement.is_active });
      loadAnnouncements();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      loadAnnouncements();
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-8 space-y-6 flex-1">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Homepage Banner Ticker Manager</h2>
              <p className="text-xs text-slate-500">Add scrolling ticker announcements displayed at the top of the homepage</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Add Ticker Message
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading announcements..." />
          ) : announcements.length === 0 ? (
            <EmptyState title="No Ticker Messages" message="Click '+ Add Ticker Message' to create one." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Message Content</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {announcements.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleActive(a)}
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded flex items-center gap-1 ${
                              a.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Power className="w-3 h-3" /> {a.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{a.content}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(a.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">Add Homepage Ticker Announcement</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ticker Message Text *</label>
                <textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} required placeholder="e.g. Admissions open for Academic Year 2026-27!" className="w-full p-2.5 border rounded-xl" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">{saving ? 'Saving...' : 'Add Message'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
