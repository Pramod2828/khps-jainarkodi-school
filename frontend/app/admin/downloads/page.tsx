'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api } from '@/services/api';
import { User, DownloadItem, ClassItem } from '@/types';
import { Download, Plus, Pencil, Trash2, X, FileText } from 'lucide-react';

export default function AdminDownloadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DownloadItem | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('all');
  const [category, setCategory] = useState('Worksheets');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const [meRes, cRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/classes')
        ]);
        if (meRes.data.success) setUser(meRes.data.data);
        if (cRes.data.success) setClasses(cRes.data.data);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/downloads');
      if (res.data.success) setDownloads(res.data.data || []);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const openUploadModal = () => {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setClassId('all');
    setCategory('Worksheets');
    setFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: DownloadItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setClassId(item.class_id ? String(item.class_id) : 'all');
    setCategory(item.category || 'Worksheets');
    setFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (!editingItem && !file) {
      alert('Please select a file to upload.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (classId && classId !== 'all') formData.append('class_id', classId);
      formData.append('category', category);
      if (file) formData.append('file', file);

      if (editingItem) {
        await api.put(`/downloads/${editingItem.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/downloads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setTitle('');
      setDescription('');
      setFile(null);
      loadDownloads();
    } catch (err) {
      alert('Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/downloads/${id}`);
      loadDownloads();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-8 space-y-6 flex-1">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Study Materials & Downloads Repository</h2>
              <p className="text-xs text-slate-500">Upload & edit worksheets, circulars, practice sheets, and forms</p>
            </div>
            <button
              onClick={openUploadModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Upload Material
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading study materials..." />
          ) : downloads.length === 0 ? (
            <EmptyState title="No Study Materials" message="Click '+ Upload Material' to add worksheets or circulars." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Uploader</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {downloads.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" /> {d.title}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {d.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{d.class_name || 'All Classes'}</td>
                        <td className="py-3 px-4 text-slate-600">{d.uploader_name}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(d)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit Material"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete Material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-fadeIn">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              {editingItem ? 'Edit Study Document' : 'Upload Study Document / Worksheet'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Class 3 Maths Practice Sheet"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none font-semibold text-slate-800 bg-slate-50"
                  >
                    <option value="Worksheets">Worksheets</option>
                    <option value="Study Material">Study Material</option>
                    <option value="Circulars">Circulars</option>
                    <option value="School Forms">School Forms</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Class</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none font-semibold text-slate-800 bg-slate-50"
                  >
                    <option value="all">All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short instructions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingItem ? 'Replace File (Optional)' : 'Select File (PDF / Word / Image) *'}
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  required={!editingItem}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
