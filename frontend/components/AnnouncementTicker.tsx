'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api } from '@/services/api';
import { Announcement } from '@/types';

export default function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const res = await api.get('/announcements');
        if (res.data.success && res.data.data) {
          setAnnouncements(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load announcements:', err);
      }
    }
    fetchAnnouncements();
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-900 py-2.5 px-4 shadow-sm overflow-hidden border-b border-amber-500/40 relative z-30 font-sans">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-900 text-amber-300 text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider shrink-0 shadow-xs">
          <Megaphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-bounce text-amber-400" />
          <span className="hidden sm:inline">ANNOUNCEMENTS</span>
          <span className="sm:hidden">NEWS</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap w-full">
          <div className="inline-block animate-marquee text-xs sm:text-sm font-bold text-slate-950 tracking-wide">
            {announcements.map((a, idx) => (
              <span key={a.id} className="mx-6">
                {a.content}
                {idx < announcements.length - 1 && <span className="ml-6 text-slate-900/40 font-normal">|</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
