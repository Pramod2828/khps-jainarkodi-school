'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api } from '@/services/api';
import { User, Student, ClassItem } from '@/types';
import { Users, Plus, Search, Edit3, Trash2, X, Phone, Building2, Filter, MapPin } from 'lucide-react';

export default function AdminStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [fullName, setFullName] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const [meRes, cRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/classes')
        ]);
        if (meRes.data.success) setUser(meRes.data.data);
        if (cRes.data.success) setClasses(cRes.data.data || []);
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      let url = `/students?limit=100&class_id=${selectedClass}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await api.get(url);
      if (res.data.success) setStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [selectedClass, searchQuery]);

  const selectedClassObj = classes.find(c => String(c.id) === classId);
  const availableSections = selectedClassObj?.sections || [];

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFullName('');
    const firstClass = classes[0] ? String(classes[0].id) : '1';
    setClassId(firstClass);
    const firstSec = classes[0]?.sections?.[0] ? String(classes[0].sections[0].id) : '';
    setSectionId(firstSec);
    setParentName('');
    setParentPhone('');
    setAddress('');
    setStudentCode('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: Student) => {
    setEditingStudent(s);
    setFullName(s.full_name);
    setClassId(String(s.class_id));
    setSectionId(s.section_id ? String(s.section_id) : '');
    setParentName(s.parent_name);
    setParentPhone(s.parent_phone);
    setAddress(s.address || '');
    setStudentCode(s.student_code);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !classId || !parentName || !parentPhone) return;
    setSaving(true);
    try {
      const payload = {
        full_name: fullName,
        class_id: parseInt(classId),
        section_id: sectionId ? parseInt(sectionId) : null,
        parent_name: parentName,
        parent_phone: parentPhone,
        address: address,
        sat_number: studentCode,
        student_code: studentCode
      };

      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, payload);
      } else {
        await api.post('/students', payload);
      }
      setIsModalOpen(false);
      loadStudents();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.details || err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to save student';
      alert(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete student record?')) return;
    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-8 space-y-6 flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Student Directory</h2>
              <p className="text-xs text-slate-500">Filter students class & section wise, view address & guardian contact details</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Enroll Student
            </button>
          </div>

          {/* Interactive Class Wise Filter Tabs */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-600" /> Class Wise Filter:
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name / code / address..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedClass('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  selectedClass === 'all'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> All Classes
              </button>
              {classes.map((c) => {
                const isSelected = selectedClass === String(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClass(String(c.id))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    {c.class_name}
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {c.student_count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading student records..." />
          ) : students.length === 0 ? (
            <EmptyState title="No Students Found" message="No student records match the selected class standard." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3.5 px-4">SAT No. / Roll No.</th>
                      <th className="py-3.5 px-4">Student Name</th>
                      <th className="py-3.5 px-4">Class & Section</th>
                      <th className="py-3.5 px-4">Parent / Guardian</th>
                      <th className="py-3.5 px-4">Parent Phone</th>
                      <th className="py-3.5 px-4">Residential Address</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">{s.sat_number || s.student_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.full_name}</td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                            <span className="font-bold text-emerald-900">{s.class_name}</span>
                            {s.section_name && (
                              <span className="bg-emerald-700 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                                Sec {s.section_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{s.parent_name}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{s.parent_phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          {s.address ? (
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{s.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not specified</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Student Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Enroll / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">{editingStudent ? 'Edit Student Record' : 'Enroll New Student'}</h3>
            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Bhavya Bhat"
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class / Standard *</label>
                  <select
                    value={classId}
                    onChange={(e) => {
                      setClassId(e.target.value);
                      const cObj = classes.find(c => String(c.id) === e.target.value);
                      if (cObj?.sections?.[0]) setSectionId(String(cObj.sections[0].id));
                      else setSectionId('');
                    }}
                    required
                    className="w-full p-2.5 border rounded-xl"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  >
                    <option value="">No Section</option>
                    {availableSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>Section {sec.section_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">SAT No. / Roll Number *</label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  required
                  placeholder="e.g. SAT-2026-001"
                  className="w-full p-2.5 border rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Name *</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required
                  placeholder="e.g. Ganesh Bhat"
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Parent Contact Phone *</label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  required
                  placeholder="e.g. 9845012347"
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Residential Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Jainarkodi Village, Post Mudradi, Udupi Taluk, Karnataka - 576112"
                  className="w-full p-2.5 border rounded-xl resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  {saving ? 'Saving...' : editingStudent ? 'Update Record' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
