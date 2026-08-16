'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import { api } from '@/services/api';
import { User, DashboardStats, ActivityChartData, AuditLog } from '@/types';
import {
  Users,
  BookOpen,
  Bell,
  Activity,
  Image as ImageIcon,
  Building2,
  Calendar,
  Download,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [homeworkChart, setHomeworkChart] = useState<ActivityChartData[]>([]);
  const [studentChart, setStudentChart] = useState<{ name: string; value: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        const meRes = await api.get('/auth/me');
        if (meRes.data.success) {
          setUser(meRes.data.data);
        } else {
          router.push('/login');
          return;
        }

        const [statsRes, chartsRes, logsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/charts'),
          api.get('/dashboard/recent-activity')
        ]);

        if (statsRes.data.success) setStats(statsRes.data.data);
        if (chartsRes.data.success && chartsRes.data.data) {
          const hwData = chartsRes.data.data.homeworkByClass || chartsRes.data.data.homework_by_class || [];
          const stData = chartsRes.data.data.studentsPerClass || chartsRes.data.data.students_by_class || [];
          setHomeworkChart(hwData);
          setStudentChart(stData);
        }
        if (logsRes.data.success) setRecentLogs(logsRes.data.data || []);

      } catch (err) {
        console.error('Authentication / Dashboard error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoadData();
  }, [router]);

  const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-8 space-y-8 flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-300 uppercase tracking-wider">
                {user?.role === 'SUPER_ADMIN' ? 'System Administrator Portal' : 'Teacher Portal'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                Welcome back, {user?.name || 'Teacher'}! 👋
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
                Here is the real-time activity and academic overview for Government Primary School Jainarkodi.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/15 text-[11px] sm:text-xs text-emerald-200 font-semibold flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Database Live
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading dashboard statistics..." />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-4">
                {[
                  { title: 'Homework Today', value: stats?.homework_today ?? (stats as any)?.homeworkToday ?? 0, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/homework' },
                  { title: 'Total Homework', value: stats?.homework_posted ?? (stats as any)?.totalHomework ?? 0, icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50', href: '/admin/homework' },
                  { title: 'Active Notices', value: stats?.active_notices ?? (stats as any)?.activeNotices ?? 0, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/notices' },
                  { title: 'School Activities', value: stats?.total_activities ?? (stats as any)?.totalActivities ?? 0, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/activities' },
                  { title: 'Gallery Photos', value: stats?.gallery_photos ?? (stats as any)?.totalGalleryPhotos ?? 0, icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/gallery' },
                  { title: 'Enrolled Students', value: stats?.total_students ?? (stats as any)?.totalStudents ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/students' },
                  { title: 'Class Standards', value: stats?.total_classes ?? (stats as any)?.totalClasses ?? 0, icon: Building2, color: 'text-rose-600', bg: 'bg-rose-50', href: '/admin/classes' },
                  { title: 'Upcoming Events', value: stats?.upcoming_events ?? (stats as any)?.upcomingEvents ?? 0, icon: Calendar, color: 'text-emerald-700', bg: 'bg-emerald-100', href: '/admin/calendar' },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => router.push(card.href)}
                      className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5 min-w-0 text-left hover:shadow-md hover:scale-103 hover:border-emerald-400 transition-all duration-200 cursor-pointer group"
                    >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${card.bg} ${card.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="text-lg sm:text-xl font-black text-slate-900">{card.value}</div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-tight truncate group-hover:text-emerald-700 transition-colors">
                        {card.title} →
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Homework Assignments by Class Standard
                    </h3>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={homeworkChart} margin={{ top: 10, right: 15, left: -15, bottom: 50 }}>
                        <XAxis
                          dataKey="class_name"
                          stroke="#64748b"
                          fontSize={11}
                          tick={{ fill: '#475569', fontWeight: 600 }}
                          interval={0}
                          angle={-35}
                          textAnchor="end"
                        />
                        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                          itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" /> Enrolled Students per Class
                    </h3>
                  </div>
                  <div className="h-72 flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={studentChart.filter((item) => item.value > 0).length > 0 ? studentChart.filter((item) => item.value > 0) : studentChart}
                          cx="50%"
                          cy="42%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                          labelLine={false}
                          label={({ name, percent }: { name?: string; percent?: number }) => (name ? `${name} (${((percent || 0) * 100).toFixed(0)}%)` : '')}
                        >
                          {(studentChart.filter((item) => item.value > 0).length > 0 ? studentChart.filter((item) => item.value > 0) : studentChart).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                          formatter={(val: any) => [`${val} Students`, 'Enrolled']}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" /> Recent System Audit Logs & Updates
                  </h3>
                  <span className="text-xs text-slate-400">Real-time database log</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentLogs.slice(0, 5).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{log.user_name}</td>
                          <td className="py-2.5 px-3">
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{log.module}</td>
                          <td className="py-2.5 px-3 text-slate-600">{log.details || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
