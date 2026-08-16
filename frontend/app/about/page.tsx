'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import { api } from '@/services/api';
import { SchoolInfo } from '@/types';
import { Info, MapPin, Phone, Mail, Clock, User, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function AboutPublicPage() {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchoolData() {
      try {
        const res = await api.get('/school');
        if (res.data.success) {
          setSchoolInfo(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch school information:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchoolData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-800/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            <Info className="w-4 h-4" /> About School
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            {schoolInfo?.school_name || 'Government Primary School Jainarkodi'}
          </h1>
          <p className="text-sm sm:text-base text-slate-200 max-w-2xl">
            "{schoolInfo?.tagline || 'Learning today, building a better tomorrow.'}"
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 space-y-12">
        {loading ? (
          <LoadingState message="Loading school details..." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Educational Mission</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Empowering Primary Education</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {schoolInfo?.description}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Government Certified</h4>
                    <p className="text-[11px] text-slate-600">Recognized under Karnataka Education Department.</p>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <HeartHandshake className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Nurturing Environment</h4>
                    <p className="text-[11px] text-slate-600">Free mid-day meals, sports, and holistic learning.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Head Teacher</span>
                  <h3 className="text-base font-bold text-slate-900">{schoolInfo?.head_teacher}</h3>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">School Timings:</span>
                    <p>{schoolInfo?.timings}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Address:</span>
                    <p>{schoolInfo?.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{schoolInfo?.phone}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{schoolInfo?.email}</span>
                </div>
              </div>

              {schoolInfo?.map_url && (
                <a
                  href={schoolInfo.map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 rounded-xl transition shadow"
                >
                  <MapPin className="w-4 h-4 text-amber-400" /> Open School Location in Maps
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
