'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl, openFileUrl } from '@/services/api';
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

      <section className="bg-gradient-to-r from-rose-950 via-slate-900 to-emerald-950 text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 bg-rose-800/60 text-rose-200 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30">
            <Bell className="w-3.5 h-3.5" /> School Bulletins & Circulars
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">School Notice Board</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            Official announcements, event notifications, parent-teacher meetings, and examination schedules.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6 sm:space-y-8 w-full overflow-x-hidden">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <button
                onClick={() => setIsArchivedTab(false)}
                className={`px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  !isArchivedTab
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5" /> Active Notices
              </button>
              <button
                onClick={() => setIsArchivedTab(true)}
                className={`px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isArchivedTab
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Archive className="w-3.5 h-3.5" /> Notice Archive
              </button>
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notice title..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto scrollbar-none pt-0.5">
            <div className="flex items-center gap-2 min-w-max pb-0.5">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Priority:</span>
              {['all', 'urgent', 'important', 'normal'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition shrink-0 ${
                    priorityFilter === p
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading notices..." />
        ) : notices.length === 0 ? (
          <div className="py-4 sm:py-8 flex justify-center">
            <div className="w-full max-w-lg">
              <EmptyState
                title="No Notices Available"
                message={isArchivedTab ? 'No archived notices in history.' : 'There are currently no active notices available.'}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {notices.map((n) => {
              const isUrgent = n.priority === 'URGENT';
              const isImportant = n.priority === 'IMPORTANT';
              return (
                <div
                  key={n.id}
                  className={`p-4 sm:p-6 rounded-2xl border transition shadow-xs hover:shadow-md w-full ${
                    isUrgent
                      ? 'bg-rose-50/80 border-rose-300'
                      : isImportant
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-3 border-b border-slate-200/50 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md uppercase tracking-wider ${
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
                        <span className="text-[11px] sm:text-xs font-bold text-rose-700 flex items-center gap-1 animate-pulse">
                          <ShieldAlert className="w-3.5 h-3.5" /> URGENT NOTICE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Posted: {n.notice_date} at {n.notice_time}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-2 leading-snug break-words">{n.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-4 break-words">
                    {n.description}
                  </p>

                  <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 w-full">
                    <span className="truncate">Issued By: <strong>{n.author_name || 'School Management'}</strong></span>
                    {n.expiry_date && (
                      <span className="text-rose-600 font-semibold shrink-0">Valid Until: {n.expiry_date}</span>
                    )}
                    {n.attachment_url && (
                      <button
                        type="button"
                        onClick={() => openFileUrl(n.attachment_url, n.title || 'notice')}
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition w-full sm:w-auto text-center cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Notice PDF
                      </button>
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
