'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl } from '@/services/api';
import { DownloadItem, ClassItem } from '@/types';
import { Download, FileText, Search } from 'lucide-react';

export default function DownloadsPublicPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await api.get('/classes');
        if (res.data.success) setClasses(res.data.data);
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }
    fetchClasses();
  }, []);

  useEffect(() => {
    async function fetchDownloads() {
      setLoading(true);
      try {
        let url = `/downloads?class_id=${selectedClass}&category=${selectedCategory}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        if (res.data.success) {
          setDownloads(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch downloads:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDownloads();
  }, [selectedClass, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-800/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            <Download className="w-4 h-4" /> Free Educational Resources
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Study Material & Worksheets</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
            Download printable worksheets, subject study notes, circulars, and school forms.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Class / Standard</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                <option value="all">All Categories</option>
                <option value="Worksheets">Worksheets</option>
                <option value="Study Material">Study Material</option>
                <option value="Circulars">Circulars</option>
                <option value="School Forms">School Forms</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Search Title</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search materials..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading study materials..." />
        ) : downloads.length === 0 ? (
          <EmptyState
            title="No Documents Available"
            message="No study materials or worksheets match your selected filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads.map((item) => (
              <div
                key={item.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase">
                      {item.category}
                    </span>
                    {item.class_name && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {item.class_name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    {item.file_type || 'PDF'}
                  </span>
                  <a
                    href={getAssetUrl(item.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                  >
                    <Download className="w-4 h-4" /> Download File
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
