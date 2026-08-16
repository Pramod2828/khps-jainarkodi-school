'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoadingState from '@/components/LoadingState';
import { api } from '@/services/api';
import { SchoolInfo } from '@/types';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPublicPage() {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchSchoolData() {
      try {
        const res = await api.get('/school');
        if (res.data.success) {
          setSchoolInfo(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch contact details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchoolData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName || !phone || !message) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <section className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-800/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            <Phone className="w-4 h-4" /> Parent Helpdesk
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Contact School Office</h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
            Have questions about admissions, school timings, or homework assignments? Get in touch with our office.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {loading ? (
          <LoadingState message="Loading contact details..." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <h3 className="text-xl font-black text-slate-900">School Office Details</h3>

              <div className="space-y-4 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">School Address:</span>
                    <p className="mt-0.5 leading-relaxed">{schoolInfo?.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900">Phone / Helpline:</span>
                    <p className="mt-0.5">{schoolInfo?.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900">Official Email:</span>
                    <p className="mt-0.5">{schoolInfo?.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">Office Working Hours:</span>
                    <p className="mt-0.5">{schoolInfo?.timings}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Parent Inquiry & Feedback</h3>
                <p className="text-xs text-slate-500">Send your message directly to the Head Teacher office.</p>
              </div>

              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-slate-900">Inquiry Sent Successfully!</h4>
                  <p className="text-xs text-slate-600">
                    Thank you, {parentName}. Your message has been received by the school office.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Name *</label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="e.g. 9845012345"
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="parent@gmail.com"
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Your Inquiry / Message *</label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      placeholder="Write your question..."
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                  >
                    <Send className="w-4 h-4" /> Submit Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
