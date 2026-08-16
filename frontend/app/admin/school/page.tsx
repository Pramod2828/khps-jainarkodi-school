'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import { api } from '@/services/api';
import { User, SchoolInfo } from '@/types';
import { Info, Save, CheckCircle2 } from 'lucide-react';

export default function AdminSchoolPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [headTeacher, setHeadTeacher] = useState('');
  const [description, setDescription] = useState('');
  const [timings, setTimings] = useState('');
  const [mapUrl, setMapUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          if (res.data.data.role !== 'SUPER_ADMIN') {
            router.push('/admin');
            return;
          }
          setUser(res.data.data);
        }
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function loadSchoolData() {
      try {
        const res = await api.get('/school');
        if (res.data.success && res.data.data) {
          const s = res.data.data;
          setSchoolName(s.school_name || '');
          setTagline(s.tagline || '');
          setAddress(s.address || '');
          setPhone(s.phone || '');
          setEmail(s.email || '');
          setHeadTeacher(s.head_teacher || '');
          setDescription(s.description || '');
          setTimings(s.timings || '');
          setMapUrl(s.map_url || '');
        }
      } catch (err) {
        console.error('Failed to load school info:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSchoolData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await api.put('/school', {
        school_name: schoolName,
        tagline,
        address,
        phone,
        email,
        head_teacher: headTeacher,
        description,
        timings,
        map_url: mapUrl
      });
      setSuccessMsg('School information updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to update school information');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-8 space-y-6 flex-1 max-w-4xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">School Information Settings</h2>
            <p className="text-xs text-slate-500">Edit school details displayed automatically on public pages</p>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {loading ? (
            <LoadingState message="Loading settings..." />
          ) : (
            <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">School Name *</label>
                  <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">School Tagline</label>
                  <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Head Teacher Name *</label>
                  <input type="text" value={headTeacher} onChange={(e) => setHeadTeacher(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">School Timings *</label>
                  <input type="text" value={timings} onChange={(e) => setTimings(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address *</label>
                <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">School Description *</label>
                <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full p-2.5 border rounded-xl" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Google Maps Location Link</label>
                <input type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." className="w-full p-2.5 border rounded-xl" />
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
