'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl } from '@/services/api';
import { Notice } from '@/types';
import { Bell, Search, Download, Calendar, ShieldAlert, Archive } from 'lucide-react';

export default function NoticesPublicPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isArchivedTab, setIsArchivedTab] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotices() {
      setLoading(true);
      try {
        let url = `/notices?priority=${priorityFilter}&is_archived=${isArchivedTab ? '1' : '0'}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        if (res.data.success) {
          setNotices(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotices();
  }, [priorityFilter, isArchivedTab, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-rose-950 via-slate-900 to-emerald-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-rose-800/60 text-rose-200 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30">
            <Bell className="w-4 h-4" /> School Bulletins & Circulars
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">School Notice Board</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
            Official announcements, event notifications, parent-teacher meetings, and examination schedules.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsArchivedTab(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  !isArchivedTab
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Bell className="w-4 h-4" /> Active Notices
              </button>
              <button
                onClick={() => setIsArchivedTab(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  isArchivedTab
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Archive className="w-4 h-4" /> Notice Archive
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notice title..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-500 mr-2">Priority:</span>
            {['all', 'urgent', 'important', 'normal'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                  priorityFilter === p
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading notices..." />
        ) : notices.length === 0 ? (
          <EmptyState
            title="No Notices Available"
            message={isArchivedTab ? 'No archived notices in history.' : 'There are currently no active notices available.'}
          />
        ) : (
          <div className="space-y-4">
            {notices.map((n) => {
              const isUrgent = n.priority === 'URGENT';
              const isImportant = n.priority === 'IMPORTANT';
              return (
                <div
                  key={n.id}
                  className={`p-6 rounded-2xl border transition shadow-xs hover:shadow-md ${
                    isUrgent
                      ? 'bg-rose-50/80 border-rose-300'
                      : isImportant
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-md uppercase tracking-wider ${
                          isUrgent
                            ? 'bg-rose-600 text-white shadow-xs'
                            : isImportant
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {n.priority}
                      </span>
                      {isUrgent && (
                        <span className="text-xs font-bold text-rose-700 flex items-center gap-1 animate-pulse">
                          <ShieldAlert className="w-4 h-4" /> URGENT NOTICE
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Posted: {n.notice_date} at {n.notice_time}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 mb-2 leading-snug">{n.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-4">
                    {n.description}
                  </p>

                  <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <span>Issued By: {n.author_name || 'School Management'}</span>
                    {n.expiry_date && (
                      <span className="text-rose-600 font-semibold">Valid Until: {n.expiry_date}</span>
                    )}
                    {n.attachment_url && (
                      <a
                        href={getAssetUrl(n.attachment_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Notice PDF
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
