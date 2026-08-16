'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api } from '@/services/api';
import { CalendarEvent } from '@/types';
import { Calendar as CalendarIcon, Filter, PartyPopper, BookOpen, Users, Palmtree } from 'lucide-react';

export default function CalendarPublicPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalendar() {
      setLoading(true);
      try {
        const res = await api.get(`/calendar?event_type=${selectedType}`);
        if (res.data.success) {
          setEvents(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCalendar();
  }, [selectedType]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'HOLIDAY':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Palmtree className="w-3 h-3" /> Holiday</span>;
      case 'EXAM':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><BookOpen className="w-3 h-3" /> Examination</span>;
      case 'PARENT_MEETING':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> Parent Meeting</span>;
      case 'CELEBRATION':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"><PartyPopper className="w-3 h-3" /> Celebration</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">School Event</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-800/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            <CalendarIcon className="w-4 h-4" /> Academic Year Schedule
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Academic Calendar 2026–27</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
            Official schedule of examination dates, school holidays, parent-teacher meetings, and festival celebrations.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Event Type:
            </span>
            {['all', 'holiday', 'exam', 'parent_meeting', 'celebration', 'school_event'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition ${
                  selectedType === type
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading calendar schedule..." />
        ) : events.length === 0 ? (
          <EmptyState
            title="No Events Found"
            message="No calendar events found under this filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex items-start gap-4"
              >
                <div className="bg-emerald-700 text-white text-center p-3 rounded-2xl shrink-0 min-w-[65px] shadow-sm">
                  <div className="text-xs font-extrabold uppercase">
                    {new Date(ev.start_date).toLocaleString('default', { month: 'short' })}
                  </div>
                  <div className="text-xl font-black leading-none my-0.5">
                    {new Date(ev.start_date).getDate()}
                  </div>
                  <div className="text-[9px] font-semibold text-emerald-200">
                    {new Date(ev.start_date).getFullYear()}
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    {getEventBadge(ev.event_type)}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{ev.title}</h3>
                  {ev.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                  )}
                  <div className="text-[11px] font-semibold text-slate-500 pt-1">
                    Date: {ev.start_date} {ev.start_date !== ev.end_date ? `to ${ev.end_date}` : ''}
                  </div>
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
