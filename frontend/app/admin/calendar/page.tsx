'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api } from '@/services/api';
import { User, CalendarEvent } from '@/types';
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, X } from 'lucide-react';

export default function AdminCalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventType, setEventType] = useState('SCHOOL_EVENT');
  const [saving, setSaving] = useState(false);

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

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/calendar');
      if (res.data.success) setEvents(res.data.data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEventType('SCHOOL_EVENT');
    setIsModalOpen(true);
  };

  const openEditModal = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setDescription(ev.description || '');
    setStartDate(ev.start_date);
    setEventType(ev.event_type || 'SCHOOL_EVENT');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate) return;
    setSaving(true);
    try {
      if (editingEvent) {
        // PUT update existing event
        await api.put(`/calendar/${editingEvent.id}`, {
          title,
          description,
          start_date: startDate,
          end_date: startDate,
          event_type: eventType
        });
      } else {
        // POST create new event
        await api.post('/calendar', {
          title,
          description,
          start_date: startDate,
          end_date: startDate,
          event_type: eventType
        });
      }
      setIsModalOpen(false);
      setEditingEvent(null);
      setTitle('');
      setDescription('');
      loadEvents();
    } catch (err) {
      alert('Failed to save calendar event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/calendar/${id}`);
      loadEvents();
    } catch (err) {
      alert('Failed to delete event');
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
              <h2 className="text-xl font-bold text-slate-900">Academic Calendar Event Manager</h2>
              <p className="text-xs text-slate-500">Add & edit exams, holidays, parent-teacher meetings, and celebrations</p>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Add Event
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading calendar events..." />
          ) : events.length === 0 ? (
            <EmptyState title="No Calendar Events" message="Click '+ Add Event' to schedule an entry." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Event Title</th>
                      <th className="py-3 px-4">Start Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            {ev.event_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{ev.title}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{ev.start_date}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(ev)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit Event"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete Event"
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
              {editingEvent ? 'Edit Calendar Event' : 'Add Calendar Event'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Mid-Term Exam 2026"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Type *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none font-semibold text-slate-800 bg-slate-50"
                >
                  <option value="SCHOOL_EVENT">School Event</option>
                  <option value="EXAM">Examination</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="PARENT_MEETING">Parent Meeting</option>
                  <option value="CELEBRATION">Celebration</option>
                  <option value="IMPORTANT_DATE">Important Date</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
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
                  {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
