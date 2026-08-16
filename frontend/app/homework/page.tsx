'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl } from '@/services/api';
import { Homework, ClassItem, SubjectItem } from '@/types';
import { BookOpen, Search, Calendar, Filter, Download, UserCheck, Clock, Building2, X, CheckCircle2, Maximize2 } from 'lucide-react';

export default function HomeworkPublicPage() {
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Homework Pop-up Modal State
  const [selectedHwModal, setSelectedHwModal] = useState<Homework | null>(null);

  useEffect(() => {
    async function initFilters() {
      try {
        const [cRes, sRes] = await Promise.all([
          api.get('/classes'),
          api.get('/classes/subjects')
        ]);
        if (cRes.data.success) setClasses(cRes.data.data || []);
        if (sRes.data.success) setSubjects(sRes.data.data || []);
      } catch (err) {
        console.error('Failed to load classes/subjects filters:', err);
      }
    }
    initFilters();
  }, []);

  useEffect(() => {
    async function fetchHomework() {
      setLoading(true);
      try {
        let url = `/homework?limit=50&class_id=${selectedClass}&subject_id=${selectedSubject}`;
        if (selectedDate) url += `&date=${selectedDate}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        const res = await api.get(url);
        if (res.data.success) {
          setHomeworkList(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch homework list:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHomework();
  }, [selectedClass, selectedSubject, selectedDate, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-700/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            <BookOpen className="w-4 h-4" /> Academic Work & Home Assignments
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Class-Wise Homework Portal</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
            Click your class box below to filter, or click any homework card to view point-wise instructions and attachments.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8">
        {/* Class Selection Boxes */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Your Class Box:
            </label>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
                selectedClass === 'all'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" /> All Classes HW
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(String(c.id))}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 border ${
                  selectedClass === String(c.id)
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>{c.class_name} HW</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, chapter..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="all">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subject_name}
                  </option>
                ))}
                <option value="OTHER">Other / Custom Subjects</option>
              </select>
            </div>

            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Fetching class homework assignments..." />
        ) : homeworkList.length === 0 ? (
          <EmptyState
            title="No Homework Found"
            message="No homework has been posted for the selected class or filters yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homeworkList.map((hw) => (
              <div
                key={hw.id}
                onClick={() => setSelectedHwModal(hw)}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between cursor-pointer group hover:-translate-y-1"
                title="Click to open point-wise homework details modal"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-emerald-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-xs">
                      {hw.class_name} {hw.section_name ? `(${hw.section_name})` : ''}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md">
                      {hw.subject_name}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug flex items-center justify-between">
                    <span className="line-clamp-1">{hw.title}</span>
                    <Maximize2 className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1" />
                  </h3>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed line-clamp-3">
                    {hw.description}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      Date: {hw.homework_date} ({hw.homework_day})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {hw.homework_time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold text-rose-600 pt-1">
                    <span>Due Date: {hw.due_date}</span>
                    <span className="text-slate-600 font-normal text-[11px] flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" /> {hw.teacher_name}
                    </span>
                  </div>

                  {hw.file_path && (
                    <div className="pt-2">
                      <span className="inline-flex items-center justify-center gap-2 w-full bg-emerald-50 text-emerald-800 text-xs font-bold py-2 rounded-xl border border-emerald-200">
                        <Download className="w-4 h-4" /> Download Attachment ({hw.file_name || 'File'})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Point-Wise Homework Detail Pop-up Modal */}
      {selectedHwModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 border border-slate-100">
            <button
              onClick={() => setSelectedHwModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-xs">
                  {selectedHwModal.class_name} {selectedHwModal.section_name ? `(${selectedHwModal.section_name})` : ''}
                </span>
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                  Subject: {selectedHwModal.subject_name}
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
                {selectedHwModal.title}
              </h3>
            </div>

            {/* Point-Wise Homework Breakdown */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" /> Point-Wise Homework Tasks to Complete:
              </span>

              <ul className="space-y-2.5 pt-1 text-xs text-slate-800">
                {selectedHwModal.description
                  .split('\n')
                  .filter((p) => p.trim().length > 0)
                  .map((point, index) => {
                    const cleanedPoint = point.replace(/^[*•\-1-9.]+\s*/, '').trim();
                    return (
                      <li key={index} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{cleanedPoint || point}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100/70 p-4 rounded-2xl border border-slate-200/60">
              <div>
                <span className="text-slate-500 block text-[11px]">Assigned Date & Time:</span>
                <span className="font-bold text-slate-900">
                  {selectedHwModal.homework_date} ({selectedHwModal.homework_day}) at {selectedHwModal.homework_time}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Submission Due Date:</span>
                <span className="font-black text-rose-600 text-sm">
                  {selectedHwModal.due_date}
                </span>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200/80 flex justify-between items-center">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Teacher: <strong>{selectedHwModal.teacher_name}</strong>
                </span>

                {selectedHwModal.file_path && (
                  <a
                    href={getAssetUrl(selectedHwModal.file_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
                  >
                    <Download className="w-4 h-4" /> Download Attachment
                  </a>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedHwModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition"
              >
                Close Homework Details
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
