'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementTicker from '@/components/AnnouncementTicker';
import LoadingState from '@/components/LoadingState';
import { api, getAssetUrl, openFileUrl } from '@/services/api';
import { Homework, Notice, Activity, CalendarEvent, SchoolInfo, ClassItem, Announcement, GalleryItem, TeacherProfile } from '@/types';
import {
  BookOpen,
  Bell,
  Activity as ActivityIcon,
  Calendar,
  Image as ImageIcon,
  Download,
  Info,
  Phone,
  ArrowRight,
  Sparkles,
  Award,
  Users,
  Building2,
  Clock,
  ChevronRight,
  Filter,
  X,
  CheckCircle2,
  UserCheck,
  Maximize2,
  Megaphone,
  GraduationCap,
  School,
  Mail
} from 'lucide-react';

export default function HomePage() {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [selectedHwClass, setSelectedHwClass] = useState<string>('all');
  const [latestHomework, setLatestHomework] = useState<Homework[]>([]);
  const [latestNotices, setLatestNotices] = useState<Notice[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryItem[]>([]);
  const [teachersList, setTeachersList] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hwLoading, setHwLoading] = useState(false);

  // Homework & Teacher Pop-up Modal State
  const [selectedHwModal, setSelectedHwModal] = useState<Homework | null>(null);
  const [selectedTeacherModal, setSelectedTeacherModal] = useState<TeacherProfile | null>(null);
  const [fullImagePreviewUrl, setFullImagePreviewUrl] = useState<string | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (fullImagePreviewUrl) {
          setFullImagePreviewUrl(null);
        } else if (selectedTeacherModal) {
          setSelectedTeacherModal(null);
        } else if (selectedHwModal) {
          setSelectedHwModal(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullImagePreviewUrl, selectedTeacherModal, selectedHwModal]);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [infoRes, cRes, noticeRes, actRes, calRes, annRes, hwRes, galRes, teacherRes] = await Promise.all([
          api.get('/school'),
          api.get('/classes'),
          api.get('/notices?limit=4'),
          api.get('/activities?limit=3'),
          api.get('/calendar?upcoming=true&limit=4'),
          api.get('/announcements'),
          api.get('/homework?limit=6&class_id=all'),
          api.get('/gallery?limit=6'),
          api.get('/teachers/public')
        ]);

        if (infoRes.data.success) setSchoolInfo(infoRes.data.data);
        if (cRes.data.success) setClassesList(cRes.data.data || []);
        if (noticeRes.data.success) setLatestNotices(noticeRes.data.data || []);
        if (actRes.data.success) setRecentActivities(actRes.data.data || []);
        if (annRes.data.success) setAnnouncements(annRes.data.data || []);
        if (hwRes.data.success) setLatestHomework(hwRes.data.data || []);
        if (galRes && galRes.data && galRes.data.success) setGalleryPhotos(galRes.data.data || []);
        if (teacherRes && teacherRes.data && teacherRes.data.success) setTeachersList(teacherRes.data.data || []);
        if (calRes.data.success) {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;

          const activeUpcoming = (calRes.data.data || []).filter(
            (ev: CalendarEvent) => (ev.end_date || ev.start_date) >= todayStr
          );
          setUpcomingEvents(activeUpcoming);
        }
      } catch (err) {
        console.error('Failed to load homepage content:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  // Fetch homework when user changes selected class box
  useEffect(() => {
    async function fetchClassHomework() {
      setHwLoading(true);
      try {
        const hwRes = await api.get(`/homework?limit=6&class_id=${selectedHwClass}`);
        if (hwRes.data.success) setLatestHomework(hwRes.data.data || []);
      } catch (err) {
        console.error('Failed to load class homework:', err);
      } finally {
        setHwLoading(false);
      }
    }
    fetchClassHomework();
  }, [selectedHwClass]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <AnnouncementTicker />
      <Navbar />

      <section className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white py-10 sm:py-24 px-3.5 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-300 text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full border border-emerald-700/60 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" /> Primary Education Excellence
            </div>

            <h1 className="text-2xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Welcome to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 uppercase">
                KHPS JAINARAKODI
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-medium max-w-2xl leading-relaxed">
              "{schoolInfo?.tagline || 'Learning today, building a better tomorrow.'}"
            </p>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Nurturing young minds from 1st to 5th Standard with dedicated teachers, interactive learning, modern activities, and strong moral values.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Link
                href="/homework"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/30 hover:scale-105 transition flex items-center gap-2 text-sm"
              >
                <BookOpen className="w-4 h-4" /> View Homework
              </Link>
              <Link
                href="/notices"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl border border-white/20 backdrop-blur-xs hover:scale-105 transition flex items-center gap-2 text-sm"
              >
                <Bell className="w-4 h-4 text-amber-300" /> View Notices
              </Link>
              <Link
                href="/activities"
                className="bg-teal-700/80 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl border border-teal-600/50 hover:scale-105 transition flex items-center gap-2 text-sm"
              >
                <ActivityIcon className="w-4 h-4" /> School Activities
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 shadow-xl space-y-3.5 text-slate-100 max-w-md mx-auto lg:max-w-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">School Information</h3>
                  <p className="text-[11px] text-emerald-300 font-semibold">Government Primary School Jainarkodi</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2.5 bg-slate-900/50 p-3 rounded-xl border border-white/10">
                  <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">School Timings</span>
                    <strong className="text-xs text-white">{schoolInfo?.timings || 'Mon – Fri (9:00 AM – 4:00 PM)'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-slate-900/50 p-3 rounded-xl border border-white/10">
                  <Users className="w-4 h-4 text-emerald-300 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Head Teacher</span>
                    <strong className="text-xs text-white">{schoolInfo?.head_teacher || 'Mrs. Savitha R. Shetty'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20 w-full overflow-hidden">
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4">
          {[
            { label: 'Homework', href: '/homework', icon: BookOpen, color: 'from-amber-500 to-amber-600' },
            { label: 'Notices', href: '/notices', icon: Bell, color: 'from-rose-500 to-rose-600' },
            { label: 'Activities', href: '/activities', icon: ActivityIcon, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Gallery', href: '/gallery', icon: ImageIcon, color: 'from-blue-500 to-blue-600' },
            { label: 'Calendar', href: '/calendar', icon: Calendar, color: 'from-purple-500 to-purple-600' },
            { label: 'Downloads', href: '/downloads', icon: Download, color: 'from-teal-500 to-teal-600' },
            { label: 'About Us', href: '/about', icon: Info, color: 'from-indigo-500 to-indigo-600' },
            { label: 'Contact', href: '/contact', icon: Phone, color: 'from-slate-700 to-slate-800' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="bg-white p-2 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs hover:shadow-md border border-slate-100 text-center group hover:-translate-y-1 transition duration-200 flex flex-col items-center justify-center min-w-0"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-lg sm:rounded-xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 group-hover:text-emerald-700 block truncate w-full">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12 sm:space-y-16 w-full overflow-hidden">
        {/* Important Announcements Banner Section */}
        {announcements.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
              <Megaphone className="w-5 h-5 text-amber-600 animate-bounce" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Important School Announcements
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="bg-amber-50/90 border-2 border-amber-200/90 p-4 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-amber-300 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded shadow-xs shrink-0 mt-0.5">
                      ANNOUNCEMENT
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {a.content}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-amber-200/80 flex justify-between items-center text-[10px] text-slate-500">
                    <span className="font-bold text-amber-900">By {a.author || 'School Admin'}</span>
                    <span className="font-medium">{a.created_at ? a.created_at.split(' ')[0] : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Class Wise Homework Section */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-slate-200 pb-3 sm:pb-4">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600">Daily Academic Tasks</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Latest Class Homework</h2>
            </div>
            <Link
              href="/homework"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
            >
              View All Homework <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          {/* Interactive Class Boxes Filter (Mobile Touch Scrollable) */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 max-w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">Select Class Box to View HW:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 no-scrollbar touch-pan-x w-full">
              <button
                onClick={() => setSelectedHwClass('all')}
                className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  selectedHwClass === 'all'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> All Classes HW
              </button>

              {classesList.map((c) => {
                const isSelected = selectedHwClass === String(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedHwClass(String(c.id))}
                    className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1.5 border shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                    <span>{c.class_name} HW</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading || hwLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-20 h-5 bg-slate-200 rounded-full" />
                    <div className="w-16 h-4 bg-slate-200 rounded-md" />
                  </div>
                  <div className="w-3/4 h-5 bg-slate-200 rounded-md" />
                  <div className="w-full h-12 bg-slate-100 rounded-xl" />
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <div className="w-24 h-4 bg-slate-200 rounded-md" />
                    <div className="w-20 h-4 bg-slate-200 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : latestHomework.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-500 text-sm space-y-2">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800">No Homework Posted for this Class Standard</p>
              <p className="text-xs text-slate-500">Select another class box above or check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestHomework.slice(0, 6).map((hw) => (
                <div
                  key={hw.id}
                  onClick={() => setSelectedHwModal(hw)}
                  className="bg-white rounded-2xl p-6 shadow-xs hover:shadow-md border border-slate-200/80 transition flex flex-col justify-between cursor-pointer group hover:-translate-y-1 relative"
                  title="Click to view full point-wise homework assignment"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full">
                        {hw.class_name} {hw.section_name ? `(${hw.section_name})` : ''}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md">
                        {hw.subject_name}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition flex items-center justify-between">
                      <span className="line-clamp-1">{hw.title}</span>
                      <Maximize2 className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1" />
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {hw.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
                    <div className="flex justify-between">
                      <span>Posted: {hw.homework_date} ({hw.homework_day})</span>
                      <span>Time: {hw.homework_time}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-rose-600">
                      <span>Due Date: {hw.due_date}</span>
                      <span>By: {hw.teacher_name}</span>
                    </div>
                    {(hw.attachment_url || hw.file_path) && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold pt-1">
                        <Download className="w-3.5 h-3.5" /> Attachment Available ({hw.file_name || 'File'})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <section className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Official Notice Board</h2>
                  <p className="text-xs text-slate-500">Circulars & Announcements</p>
                </div>
              </div>
              <Link href="/notices" className="text-xs font-bold text-emerald-700 hover:underline">
                View All Notices →
              </Link>
            </div>

            {loading ? (
              <LoadingState message="Fetching notices..." />
            ) : latestNotices.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No active notices available.</p>
            ) : (
              <div className="space-y-4 flex-1">
                {latestNotices.map((n) => {
                  const isUrgent = n.priority === 'URGENT';
                  const isImportant = n.priority === 'IMPORTANT';
                  return (
                    <div
                      key={n.id}
                      className={`p-4 rounded-2xl border transition ${
                        isUrgent
                          ? 'bg-rose-50/70 border-rose-200'
                          : isImportant
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                            isUrgent
                              ? 'bg-rose-600 text-white'
                              : isImportant
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {n.priority}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {n.notice_date} at {n.notice_time}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">{n.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{n.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-lg flex flex-col justify-between space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Upcoming Events</h2>
                  <p className="text-xs text-emerald-300">Exams, Meetings & Holidays</p>
                </div>
              </div>
              <Link href="/calendar" className="text-xs font-bold text-emerald-400 hover:underline">
                Calendar →
              </Link>
            </div>

            {loading ? (
              <LoadingState message="Loading events..." />
            ) : upcomingEvents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 text-center">
                <p className="text-xs text-slate-400">No upcoming events scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {upcomingEvents.map((ev) => {
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${day}`;
                  const isToday = ev.start_date <= todayStr && (ev.end_date || ev.start_date) >= todayStr;

                  return (
                    <div key={ev.id} className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition ${isToday ? 'bg-slate-800 border-amber-400/80 shadow-md' : 'bg-slate-800/80 border-slate-700/60 hover:border-emerald-500/50'}`}>
                      <div className={`text-white text-center p-2 rounded-xl shrink-0 min-w-[54px] shadow-sm ${isToday ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 font-black' : 'bg-gradient-to-b from-emerald-500 to-teal-600'}`}>
                        <div className={`text-[10px] font-extrabold uppercase tracking-wider ${isToday ? 'text-slate-950' : 'text-white'}`}>
                          {new Date(ev.start_date).toLocaleString('default', { month: 'short' })}
                        </div>
                        <div className="text-xl font-black leading-none mt-0.5">
                          {new Date(ev.start_date).getDate()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                            {ev.event_type ? ev.event_type.replace('_', ' ') : 'EVENT'}
                          </span>
                          {isToday && (
                            <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider animate-pulse">
                              TODAY
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-snug truncate">{ev.title}</h4>
                        {ev.description && (
                          <p className="text-[11px] text-slate-300 line-clamp-1 leading-relaxed">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Life at Jainarkodi</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent School Activities</h2>
            </div>
            <Link href="/activities" className="text-xs font-bold text-emerald-700 hover:underline">
              View All Activities →
            </Link>
          </div>

          {loading ? (
            <LoadingState message="Loading activities..." />
          ) : recentActivities.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No activities posted yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentActivities.map((act) => (
                <div key={act.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md transition group">
                  <div className="h-48 bg-slate-200 relative overflow-hidden">
                    {act.cover_image ? (
                      <img
                        src={getAssetUrl(act.cover_image)}
                        alt={act.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-emerald-800 to-teal-700 flex items-center justify-center text-white font-bold">
                        <ActivityIcon className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      {act.activity_date}
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                      {act.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {act.description}
                    </p>
                    <div className="pt-2">
                      <Link href={`/activities`} className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 hover:underline">
                        Read Story <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Our Teachers Showcase Section */}
        {teachersList && teachersList.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Faculty & Mentors</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Our Dedicated Teachers</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {teachersList.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTeacherModal(t)}
                  className="group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-400 hover:scale-[1.02] active:scale-98 transition duration-200 text-center space-y-3 flex flex-col items-center cursor-pointer relative"
                  title={`Click to view ${t.name}'s profile`}
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-emerald-500/30 shadow-xs shrink-0 flex items-center justify-center group-hover:border-emerald-500 transition">
                    {t.photo_url ? (
                      <img
                        src={getAssetUrl(t.photo_url)}
                        alt={t.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <UserCheck className="w-10 h-10 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-1 w-full">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">{t.name}</h3>

                    {t.qualification && (
                      <p className="text-xs text-amber-800 font-semibold inline-flex items-center gap-1 justify-center bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        <GraduationCap className="w-3 h-3 text-amber-600" /> {t.qualification}
                      </p>
                    )}

                    {t.teaching_standard && (
                      <p className="text-xs text-emerald-800 font-extrabold flex items-center gap-1 justify-center pt-1">
                        <School className="w-3.5 h-3.5 text-emerald-600" /> {t.teaching_standard}
                      </p>
                    )}

                    <p className="text-[11px] font-bold text-emerald-700 pt-1 group-hover:underline flex items-center justify-center gap-1 opacity-90">
                      View Profile <ChevronRight className="w-3.5 h-3.5" />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photo Gallery Showcase Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Campus & Events</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Photo Gallery</h2>
            </div>
            <Link href="/gallery" className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1">
              View Full Gallery <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <LoadingState message="Loading gallery photos..." />
          ) : galleryPhotos.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-200/80 text-slate-500 text-xs space-y-1">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No Gallery Photos Added Yet</p>
              <p className="text-slate-400">Photos uploaded from the Admin/Teacher portal will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {galleryPhotos.slice(0, 6).map((photo) => (
                <Link
                  key={photo.id}
                  href="/gallery"
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-xs hover:shadow-md transition"
                >
                  <img
                    src={getAssetUrl(photo.image_url)}
                    alt={photo.title || 'Gallery Photo'}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3 text-white">
                    <p className="text-xs font-bold truncate">{photo.title}</p>
                    {photo.category_name && (
                      <span className="text-[9px] font-semibold text-emerald-300 uppercase tracking-wider">{photo.category_name}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
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

                {(selectedHwModal.attachment_url || selectedHwModal.file_path) && (
                  <button
                    type="button"
                    onClick={() => openFileUrl(selectedHwModal.attachment_url || selectedHwModal.file_path, selectedHwModal.file_name || selectedHwModal.title)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> View / Download Attachment
                  </button>
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

      {/* Teacher Profile Pop-up Modal */}
      {selectedTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-6 border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedTeacherModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition"
              title="Close Profile"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Teacher Photo */}
            <div
              onClick={() => {
                if (selectedTeacherModal.photo_url) {
                  setFullImagePreviewUrl(getAssetUrl(selectedTeacherModal.photo_url));
                }
              }}
              className={`relative w-28 h-28 mx-auto rounded-full overflow-hidden bg-slate-100 border-4 border-emerald-500/30 shadow-md flex items-center justify-center shrink-0 group ${
                selectedTeacherModal.photo_url ? 'cursor-pointer hover:border-emerald-500 hover:scale-105 transition duration-200' : ''
              }`}
              title={selectedTeacherModal.photo_url ? "Click to view full image" : ""}
            >
              {selectedTeacherModal.photo_url ? (
                <>
                  <img
                    src={getAssetUrl(selectedTeacherModal.photo_url)}
                    alt={selectedTeacherModal.name}
                    className="w-full h-full object-cover group-hover:opacity-90 transition"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Maximize2 className="w-5 h-5 drop-shadow-md" />
                  </div>
                </>
              ) : (
                <UserCheck className="w-12 h-12 text-slate-400" />
              )}
            </div>

            {/* Teacher Name */}
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Faculty Profile
              </span>
              <h3 className="text-xl font-black text-slate-900 pt-1">
                {selectedTeacherModal.name}
              </h3>
            </div>

            {/* Detailed Attributes */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-left text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-500 font-medium block text-[11px]">Education / Qualification</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedTeacherModal.qualification || 'Not Specified'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-slate-200/60 pt-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-500 font-medium block text-[11px]">Teaching Class / Standard</span>
                  <span className="font-extrabold text-emerald-900 text-sm">
                    {selectedTeacherModal.teaching_standard || 'Not Assigned'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-slate-200/60 pt-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-500 font-medium block text-[11px]">Mobile Number</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedTeacherModal.phone || 'Not Provided'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-slate-200/60 pt-3">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-800 shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-500 font-medium block text-[11px]">Email Address</span>
                  <span className="font-extrabold text-slate-900 text-sm break-all">
                    {selectedTeacherModal.email || 'Not Provided'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setSelectedTeacherModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-8 py-3 rounded-xl transition shadow-sm"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Teacher Image Preview Modal */}
      {fullImagePreviewUrl && (
        <div
          onClick={() => setFullImagePreviewUrl(null)}
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-900/40 rounded-3xl border border-white/10 shadow-2xl cursor-default"
          >
            {/* Close Button */}
            <button
              onClick={() => setFullImagePreviewUrl(null)}
              className="absolute -top-3 -right-3 sm:top-4 sm:right-4 z-10 bg-slate-900/90 hover:bg-rose-600 text-white p-2.5 rounded-full shadow-lg border border-white/20 transition cursor-pointer"
              title="Close Full Image (ESC)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Full Image */}
            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
              <img
                src={fullImagePreviewUrl}
                alt="Full Teacher Photo"
                className="max-h-[85vh] max-w-[90vw] w-auto h-auto object-contain rounded-2xl shadow-2xl transition duration-300"
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
