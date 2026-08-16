'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  Megaphone,
  Activity,
  Image as ImageIcon,
  Users,
  Building2,
  UserCheck,
  Info,
  Calendar,
  Download,
  FileText,
  ShieldCheck,
  LogOut,
  GraduationCap,
  X
} from 'lucide-react';
import { api } from '@/services/api';
import { User } from '@/types';

interface AdminSidebarProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ user, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Homework', href: '/admin/homework', icon: BookOpen },
    { name: 'Notice Board', href: '/admin/notices', icon: Bell },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { name: 'Activities', href: '/admin/activities', icon: Activity },
    { name: 'Gallery Photos', href: '/admin/gallery', icon: ImageIcon },
    { name: 'Student Directory', href: '/admin/students', icon: Users },
    { name: 'Downloads Manager', href: '/admin/downloads', icon: Download },
    // Super Admin Restricted System Menu Items
    ...(isSuperAdmin
      ? [
          { name: 'Academic Calendar', href: '/admin/calendar', icon: Calendar },
          { name: 'Class Management', href: '/admin/classes', icon: Building2 },
          { name: 'School Settings', href: '/admin/school', icon: Info },
          { name: 'Teacher Management', href: '/admin/teachers', icon: UserCheck },
          { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-20 px-6 bg-slate-950/80 flex items-center justify-between border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 border border-emerald-500/30 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Government of Karnataka Emblem" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">GPS Jainarkodi</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Teacher Portal'}
              </span>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
