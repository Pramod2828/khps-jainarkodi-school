'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, KeyRound, ExternalLink, ShieldCheck, UserCheck, Eye } from 'lucide-react';
import { User } from '@/types';
import ChangePasswordModal from './ChangePasswordModal';
import InspectPasswordModal from './InspectPasswordModal';

interface AdminHeaderProps {
  user: User | null;
  onToggleSidebar: () => void;
}

export default function AdminHeader({ user, onToggleSidebar }: AdminHeaderProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs w-full max-w-full">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 sm:p-2 text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition shrink-0"
          aria-label="Toggle Sidebar Navigation"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-sm sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
              {isSuperAdmin ? 'Super Admin' : 'Teacher Portal'}
            </h1>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                isSuperAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {isSuperAdmin ? 'Admin' : 'Teacher'}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block truncate">
            Government Primary School Jainarkodi
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* View Website */}
        <Link
          href="/"
          target="_blank"
          className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg sm:rounded-xl border border-slate-200 transition flex items-center gap-1.5"
          title="View Public Website"
        >
          <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">View Website</span>
        </Link>

        {/* Inspect Passwords Button (Available for Super Admin) */}
        {isSuperAdmin && (
          <button
            onClick={() => setIsInspectModalOpen(true)}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-cyan-900 bg-cyan-50 hover:bg-cyan-100 rounded-lg sm:rounded-xl border border-cyan-200 transition shadow-2xs flex items-center gap-1.5"
            title="Inspect Account Passwords & Security"
          >
            <Eye className="w-3.5 h-3.5 shrink-0 text-cyan-700" />
            <span className="hidden xs:inline">Inspect Password</span>
          </button>
        )}

        {/* Edit Credentials Button (Available for Super Admin) */}
        {isSuperAdmin && (
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg sm:rounded-xl border border-amber-200 transition shadow-2xs flex items-center gap-1"
            title="Edit Passwords for Super Admin & Teacher"
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Credentials</span>
          </button>
        )}

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
              {user?.name}
              {isSuperAdmin ? (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{user?.role}</span>
          </div>
        </div>
      </div>

      {isPasswordModalOpen && (
        <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
      )}

      {isInspectModalOpen && (
        <InspectPasswordModal
          isOpen={isInspectModalOpen}
          onClose={() => setIsInspectModalOpen(false)}
          onOpenEditModal={(role) => {
            setIsInspectModalOpen(false);
            setIsPasswordModalOpen(true);
          }}
        />
      )}
    </header>
  );
}
