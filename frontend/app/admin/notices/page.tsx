'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api } from '@/services/api';
import { User, Notice } from '@/types';
import { Bell, Plus, Edit3, Trash2, X } from 'lucide-react';

export default function AdminNoticesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
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

  const loadNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notices?limit=100');
      if (res.data.success) setNotices(res.data.data || []);
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleOpenAddModal = () => {
    setEditingNotice(null);
    setTitle('');
    setDescription('');
    setPriority('NORMAL');
    setExpiryDate('');
    setFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (n: Notice) => {
    setEditingNotice(n);
    setTitle(n.title);
    setDescription(n.description);
    setPriority(n.priority || 'NORMAL');
    setExpiryDate(n.expiry_date || '');
    setFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('priority', priority);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (file) formData.append('attachment', file);

      if (editingNotice) {
        await api.put(`/notices/${editingNotice.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/notices', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      loadNotices();
    } catch (err) {
      alert('Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.delete(`/notices/${id}`);
      loadNotices();
    } catch (err) {
      alert('Failed to delete notice');
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
              <h2 className="text-xl font-bold text-slate-900">Notice Board Manager</h2>
              <p className="text-xs text-slate-500">Publish urgent circulars, meeting notices, and official announcements</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Publish Notice
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading notices..." />
          ) : notices.length === 0 ? (
            <EmptyState title="No Notices Posted" message="Click '+ Publish Notice' to post a circular." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Posted Date</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notices.map((n) => (
                      <tr key={n.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase ${
                            n.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                            n.priority === 'IMPORTANT' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {n.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{n.title}</td>
                        <td className="py-3 px-4 text-slate-600">{n.notice_date}</td>
                        <td className="py-3 px-4 text-rose-600 font-semibold">{n.expiry_date || 'No Expiry'}</td>
                        <td className="py-3 px-4 text-slate-600">{n.author_name}</td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(n)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Notice"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Notice"
                          >
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
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">{editingNotice ? 'Edit Notice' : 'Publish Notice'}</h3>
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Parent Teacher Meeting"
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Content *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Notice details..."
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Attachment PDF / Image (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 border rounded-xl bg-slate-50"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  {saving ? 'Saving...' : editingNotice ? 'Update Notice' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
