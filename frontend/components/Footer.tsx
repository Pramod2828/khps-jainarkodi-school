'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';
import { api } from '@/services/api';
import { SchoolInfo } from '@/types';

export default function Footer() {
  const [info, setInfo] = useState<SchoolInfo | null>(null);

  useEffect(() => {
    async function loadSchoolFooter() {
      try {
        const res = await api.get('/school');
        if (res.data.success && res.data.data) {
          setInfo(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load footer school info:', err);
      }
    }
    loadSchoolFooter();
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Col 1: School Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-white text-base sm:text-lg">
                {info?.school_name || 'Govt. Primary School'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {info?.description || 'Government Primary School Jainarkodi is dedicated to empowering rural students through quality foundation education, moral integrity, and modern learning.'}
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/50">
              <ShieldCheck className="w-4 h-4" /> Karnataka State Education Board
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Quick Access</h3>
            <ul className="space-y-2 text-xs font-medium">
              <li><Link href="/homework" className="hover:text-emerald-400 transition">📚 Class Homework</Link></li>
              <li><Link href="/notices" className="hover:text-emerald-400 transition">📢 Notice Board</Link></li>
              <li><Link href="/activities" className="hover:text-emerald-400 transition">🏫 School Activities</Link></li>
              <li><Link href="/gallery" className="hover:text-emerald-400 transition">🖼 Photo Gallery</Link></li>
              <li><Link href="/calendar" className="hover:text-emerald-400 transition">📅 Academic Calendar</Link></li>
              <li><Link href="/downloads" className="hover:text-emerald-400 transition">📥 Worksheets & Study Material</Link></li>
            </ul>
          </div>

          {/* Col 3: School Info & Timings */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">School Timings</h3>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Class Hours</div>
                  <div className="text-xs text-slate-400 leading-relaxed font-medium">
                    {info?.timings || 'Mon – Fri: 9:00 AM – 4:00 PM | Saturday: 9:00 AM – 1:00 PM'}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Head Teacher</div>
                  <div className="text-xs text-slate-400 font-medium">
                    {info?.head_teacher || 'Mrs. Savitha R. Shetty'}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Info */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact Us</h3>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed font-medium">
                  {info?.address || 'Government Primary School, Jainarkodi Village, Karnataka 574227'}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">{info?.phone || '+91 94812 34567'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">{info?.email || 'contact@jainarkodi.edu.in'}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2 font-medium">
          <div>
            © {new Date().getFullYear()} {info?.school_name || 'Government Primary School Jainarkodi'}. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            Designed for Education & Community | REST API Powered
          </div>
        </div>
      </div>
    </footer>
  );
}
