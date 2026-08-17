'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl } from '@/services/api';
import { User, Activity } from '@/types';
import { Activity as ActivityIcon, Plus, Trash2, X, Image as ImageIcon } from 'lucide-react';

export default function AdminActivitiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [videoUrl, setVideoUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);
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

  const loadActivities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activities?limit=100');
      if (res.data.success) setActivities(res.data.data || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !activityDate) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('activity_date', activityDate);
      if (videoUrl) formData.append('video_url', videoUrl);
      if (coverFile) formData.append('cover_image', coverFile);
      if (galleryFiles) {
        for (let i = 0; i < galleryFiles.length; i++) {
          formData.append('gallery_images', galleryFiles[i]);
        }
      }

      await api.post('/activities', formData);

      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setCoverFile(null);
      setGalleryFiles(null);
      loadActivities();
    } catch (err) {
      alert('Failed to post activity');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete activity story?')) return;
    try {
      await api.delete(`/activities/${id}`);
      loadActivities();
    } catch (err) {
      alert('Failed to delete activity');
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
              <h2 className="text-xl font-bold text-slate-900">School Activity Story Manager</h2>
              <p className="text-xs text-slate-500">Post sports, cultural programs, science fairs, and event stories</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Create Activity Story
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading activities..." />
          ) : activities.length === 0 ? (
            <EmptyState title="No Activities Posted" message="Click '+ Create Activity Story' to post one." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((act) => (
                <div key={act.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="h-48 bg-slate-100 relative">
                      {act.cover_image ? (
                        <img src={getAssetUrl(act.cover_image)} alt={act.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ActivityIcon className="w-12 h-12" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded">
                        {act.activity_date}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-bold text-slate-900">{act.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{act.description}</p>
                    </div>
                  </div>
                  <div className="p-4 pt-0 border-t border-slate-100 flex justify-end">
                    <button onClick={() => handleDelete(act.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded">
                      <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">Post Activity Story</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Activity Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Annual Sports Day 2026" className="w-full p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Video Link (Optional)</label>
                  <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full p-2.5 border rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Story Description *</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Write details..." className="w-full p-2.5 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cover Photo (JPG/PNG - Max 5MB)</label>
                <input type="file" onChange={(e) => setCoverFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded-xl bg-slate-50" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Multi Gallery Photos (Optional)</label>
                <input type="file" multiple onChange={(e) => setGalleryFiles(e.target.files)} className="w-full p-2 border rounded-xl bg-slate-50" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">{saving ? 'Posting...' : 'Post Activity'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
