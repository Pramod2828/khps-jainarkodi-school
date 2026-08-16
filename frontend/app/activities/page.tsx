'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl } from '@/services/api';
import { Activity } from '@/types';
import { Activity as ActivityIcon, Calendar, Video, X, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function ActivitiesPublicPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await api.get('/activities?limit=50');
        if (res.data.success) {
          setActivities(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load activities:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  const openActivityDetail = async (id: number) => {
    try {
      const res = await api.get(`/activities/${id}`);
      if (res.data.success) {
        setSelectedActivity(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load activity details:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-800/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            <ActivityIcon className="w-4 h-4" /> Extra-Curricular & School Events
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">School Activities & Celebrations</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
            Explore sports competitions, cultural programs, environmental drives, science exhibitions, and memorable classroom moments.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {loading ? (
          <LoadingState message="Fetching school activities..." />
        ) : activities.length === 0 ? (
          <EmptyState
            title="No Activities Posted"
            message="School activity stories will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((act) => (
              <div
                key={act.id}
                onClick={() => openActivityDetail(act.id)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-lg transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="h-52 bg-slate-200 relative overflow-hidden">
                    {act.cover_image ? (
                      <img
                        src={getAssetUrl(act.cover_image)}
                        alt={act.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-emerald-800 to-teal-700 flex items-center justify-center text-white">
                        <ActivityIcon className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {act.activity_date}
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                      {act.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 group-hover:translate-x-1 transition">
                    View Photos & Details <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedActivity(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full bg-slate-100"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-4">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                📅 {selectedActivity.activity_date}
              </span>
              <h2 className="text-2xl font-black text-slate-900">{selectedActivity.title}</h2>
              
              {selectedActivity.cover_image && (
                <div className="h-64 sm:h-80 rounded-2xl overflow-hidden shadow-sm">
                  <img
                    src={getAssetUrl(selectedActivity.cover_image)}
                    alt={selectedActivity.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedActivity.description}
              </p>

              {selectedActivity.video_url && (
                <div className="pt-2">
                  <a
                    href={selectedActivity.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
                  >
                    <Video className="w-4 h-4" /> Watch Event Video
                  </a>
                </div>
              )}

              {selectedActivity.images && selectedActivity.images.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" /> Additional Event Photos
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedActivity.images.map((img) => (
                      <div key={img.id} className="h-32 rounded-xl overflow-hidden border border-slate-200">
                        <img
                          src={getAssetUrl(img.image_url)}
                          alt="Activity photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
