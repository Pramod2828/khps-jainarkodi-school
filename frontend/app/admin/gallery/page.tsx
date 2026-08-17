'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl } from '@/services/api';
import { User, GalleryItem, GalleryCategory } from '@/types';
import { Image as ImageIcon, Plus, Trash2, X } from 'lucide-react';

export default function AdminGalleryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const [meRes, catRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/gallery/categories')
        ]);
        if (meRes.data.success) setUser(meRes.data.data);
        if (catRes.data.success) setCategories(catRes.data.data);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/gallery?limit=100&category_id=${selectedCategory}`);
      if (res.data.success) setPhotos(res.data.data || []);
    } catch (err) {
      console.error('Failed to load gallery photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [selectedCategory]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !categoryId || !file) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category_id', categoryId);
      formData.append('photo', file);

      await api.post('/gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsModalOpen(false);
      setTitle('');
      setFile(null);
      loadPhotos();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to upload photo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete photo?')) return;
    try {
      await api.delete(`/gallery/${id}`);
      loadPhotos();
    } catch (err) {
      alert('Failed to delete photo');
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
              <h2 className="text-xl font-bold text-slate-900">Photo Gallery Manager</h2>
              <p className="text-xs text-slate-500">Upload campus and event photos (Max 5MB JPG/PNG)</p>
            </div>
            <button
              onClick={() => {
                setCategoryId(categories[0] ? String(categories[0].id) : '1');
                setIsModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Upload Photo
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 mr-2">Category:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl ${
                selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              All Photos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(String(c.id))}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl ${
                  selectedCategory === String(c.id) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {c.category_name}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingState message="Loading photos..." />
          ) : photos.length === 0 ? (
            <EmptyState title="No Photos Uploaded" message="Click '+ Upload Photo' to upload images." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative group">
                  <div className="h-40 bg-slate-100 overflow-hidden">
                    <img src={getAssetUrl(p.image_url)} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{p.title}</span>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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
            <h3 className="text-lg font-bold mb-4">Upload Gallery Photo</h3>
            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Science Exhibition Project" className="w-full p-2.5 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category *</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="w-full p-2.5 border rounded-xl">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Photo File (JPG/PNG - Max 5MB) *</label>
                <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full p-2 border rounded-xl bg-slate-50" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">{saving ? 'Uploading...' : 'Upload Photo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
