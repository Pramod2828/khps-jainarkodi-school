'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import { api } from '@/services/api';
import { User, ClassItem, Student } from '@/types';
import { Building2, Plus, Users, X, Edit3, Trash2, Layers, Phone, UserPlus, ExternalLink, MapPin } from 'lucide-react';

export default function AdminClassesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Class Modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [className, setClassName] = useState('');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [newModalSectionName, setNewModalSectionName] = useState('');
  const [savingClass, setSavingClass] = useState(false);

  // Add Section Modal (Standalone)
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [targetClass, setTargetClass] = useState<ClassItem | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [savingSection, setSavingSection] = useState(false);

  // Class Details & Direct Student Management Modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<ClassItem | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);

  // Add Student inside Class Modal
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [studentFullName, setStudentFullName] = useState('');
  const [studentSectionId, setStudentSectionId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          if (res.data.data.role !== 'SUPER_ADMIN') {
            router.push('/admin');
            return;
          }
          setUser(res.data.data);
        }
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/classes');
      if (res.data.success) {
        const classData = res.data.data || [];
        setClasses(classData);

        if (editingClass) {
          const updated = classData.find((c: ClassItem) => c.id === editingClass.id);
          if (updated) setEditingClass(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleOpenClassStudentsModal = async (c: ClassItem) => {
    setSelectedClassForStudents(c);
    setShowAddStudentForm(false);
    setStudentFullName('');
    setParentName('');
    setParentPhone('');
    setStudentAddress('');
    setStudentSectionId(c.sections?.[0] ? String(c.sections[0].id) : '');
    setIsStudentModalOpen(true);
    fetchStudentsForClass(c.id);
  };

  const fetchStudentsForClass = async (classId: number) => {
    setLoadingClassStudents(true);
    try {
      const res = await api.get(`/students?class_id=${classId}&limit=100`);
      if (res.data.success) setClassStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to load class students:', err);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const handleAddStudentToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForStudents || !studentFullName || !parentName || !parentPhone) return;
    setSavingStudent(true);
    try {
      await api.post('/students', {
        full_name: studentFullName,
        class_id: selectedClassForStudents.id,
        section_id: studentSectionId ? parseInt(studentSectionId) : null,
        parent_name: parentName,
        parent_phone: parentPhone,
        address: studentAddress
      });
      setStudentFullName('');
      setParentName('');
      setParentPhone('');
      setStudentAddress('');
      setShowAddStudentForm(false);
      fetchStudentsForClass(selectedClassForStudents.id);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to enroll student');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudentInModal = async (studentId: number) => {
    if (!confirm('Delete student record?')) return;
    try {
      await api.delete(`/students/${studentId}`);
      if (selectedClassForStudents) fetchStudentsForClass(selectedClassForStudents.id);
      loadClasses();
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  const handleOpenAddClassModal = () => {
    setEditingClass(null);
    setClassName('');
    setDisplayOrder(String((classes.length || 0) + 1));
    setNewModalSectionName('');
    setIsClassModalOpen(true);
  };

  const handleOpenEditClassModal = (c: ClassItem) => {
    setEditingClass(c);
    setClassName(c.class_name);
    setDisplayOrder(String(c.display_order));
    setNewModalSectionName('');
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;
    setSavingClass(true);
    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, {
          class_name: className,
          display_order: parseInt(displayOrder)
        });
      } else {
        await api.post('/classes', {
          class_name: className,
          display_order: parseInt(displayOrder)
        });
      }
      setIsClassModalOpen(false);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save class');
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (c: ClassItem) => {
    if (!confirm(`Are you sure you want to delete "${c.class_name}"?`)) return;
    try {
      await api.delete(`/classes/${c.id}`);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete class');
    }
  };

  const handleAddSectionFromModal = async () => {
    if (!editingClass || !newModalSectionName) return;
    try {
      await api.post(`/classes/${editingClass.id}/sections`, {
        section_name: newModalSectionName.trim().toUpperCase()
      });
      setNewModalSectionName('');
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to add section');
    }
  };

  const handleOpenAddSectionModal = (c: ClassItem) => {
    setTargetClass(c);
    setSectionName('');
    setIsSectionModalOpen(true);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClass || !sectionName) return;
    setSavingSection(true);
    try {
      await api.post(`/classes/${targetClass.id}/sections`, {
        section_name: sectionName
      });
      setIsSectionModalOpen(false);
      loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to add section');
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: number, secName: string) => {
    if (!confirm(`Remove Section ${secName}?`)) return;
    try {
      await api.delete(`/classes/sections/${sectionId}`);
      loadClasses();
    } catch (err) {
      alert('Failed to remove section');
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
              <h2 className="text-xl font-bold text-slate-900">Class & Section Management</h2>
              <p className="text-xs text-slate-500">Click any class box to view/add students for that specific class standard</p>
            </div>
            <button
              onClick={handleOpenAddClassModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Add New Class
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading classes..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => handleOpenClassStudentsModal(c)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition flex items-center gap-1.5">
                            {c.class_name}
                            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-emerald-600" />
                          </h3>
                          <span className="text-[11px] font-medium text-slate-500">Display Order: {c.display_order}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditClassModal(c)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Class & Sections"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(c)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Active Enrollment Box (Click to Manage Students) */}
                    <div
                      onClick={() => handleOpenClassStudentsModal(c)}
                      className="bg-emerald-50/90 hover:bg-emerald-100/90 p-3 rounded-xl border border-emerald-200 flex items-center justify-between cursor-pointer transition shadow-2xs"
                      title="Click to view & add students for this class"
                    >
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                        <Users className="w-4 h-4 text-emerald-700" /> Enrolled Students:
                      </span>
                      <span className="bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
                        {c.student_count} Students
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" /> Configured Sections:
                        </span>
                        <button
                          onClick={() => handleOpenAddSectionModal(c)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add Section
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {c.sections && c.sections.length > 0 ? (
                          c.sections.map((sec) => (
                            <div
                              key={sec.id}
                              className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-slate-200"
                            >
                              <span>Section {sec.section_name}</span>
                              <button
                                onClick={() => handleDeleteSection(sec.id, sec.section_name)}
                                className="text-slate-400 hover:text-rose-600 transition"
                                title="Remove section"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No sections added yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Class Students Management Modal */}
      {isStudentModalOpen && selectedClassForStudents && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col space-y-4">
            <button onClick={() => setIsStudentModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b pb-3 pr-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  {selectedClassForStudents.class_name} Student List
                </h3>
                <p className="text-xs text-slate-500">Currently enrolled students in {selectedClassForStudents.class_name}</p>
              </div>

              <button
                onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                {showAddStudentForm ? 'Close Form' : `+ Enroll Student into ${selectedClassForStudents.class_name}`}
              </button>
            </div>

            {/* Quick Add Student Form inside Class Modal */}
            {showAddStudentForm && (
              <form onSubmit={handleAddStudentToClass} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800">Enroll Student into {selectedClassForStudents.class_name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      value={studentFullName}
                      onChange={(e) => setStudentFullName(e.target.value)}
                      required
                      placeholder="e.g. Ananya Hegde"
                      className="w-full p-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Section</label>
                    <select
                      value={studentSectionId}
                      onChange={(e) => setStudentSectionId(e.target.value)}
                      className="w-full p-2 border rounded-xl bg-white font-bold"
                    >
                      <option value="">No Section</option>
                      {selectedClassForStudents.sections?.map((sec) => (
                        <option key={sec.id} value={sec.id}>Section {sec.section_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Name *</label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                      placeholder="e.g. Suresh Hegde"
                      className="w-full p-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Parent Phone *</label>
                    <input
                      type="tel"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      required
                      placeholder="e.g. 9845012346"
                      className="w-full p-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Student Residential Address</label>
                    <input
                      type="text"
                      value={studentAddress}
                      onChange={(e) => setStudentAddress(e.target.value)}
                      placeholder="e.g. Jainarkodi Village, Post Mudradi, Udupi"
                      className="w-full p-2 border rounded-xl bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowAddStudentForm(false)} className="px-3 py-1.5 text-slate-500">Cancel</button>
                  <button type="submit" disabled={savingStudent} className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl shadow">
                    {savingStudent ? 'Enrolling...' : 'Save Student'}
                  </button>
                </div>
              </form>
            )}

            {/* Students Table */}
            <div className="overflow-y-auto flex-1 max-h-[50vh] border rounded-2xl">
              {loadingClassStudents ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading student records...</div>
              ) : classStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No students enrolled in {selectedClassForStudents.class_name} yet. Click '+ Enroll Student' above to add.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Parent Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Residential Address</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{s.student_code}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.full_name}</td>
                        <td className="py-2.5 px-3">
                          {s.section_name ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Sec {s.section_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{s.parent_name}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" /> {s.parent_phone}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {s.address ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{s.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Not specified</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteStudentInModal(s.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Class Add / Edit Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button onClick={() => setIsClassModalOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold">{editingClass ? 'Edit Class Standard' : 'Add Class Standard'}</h3>

            <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                  placeholder="e.g. LKG, UKG, 1st Standard"
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Display Order *</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  required
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              {/* Sections Option inside Edit Modal */}
              {editingClass && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block font-bold text-slate-700">Sections Options</label>
                  <p className="text-[11px] text-slate-500">Configured sections for {editingClass.class_name}:</p>

                  <div className="flex flex-wrap gap-1.5">
                    {editingClass.sections && editingClass.sections.length > 0 ? (
                      editingClass.sections.map((sec) => (
                        <span
                          key={sec.id}
                          className="bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200"
                        >
                          Section {sec.section_name}
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id, sec.section_name)}
                            className="text-emerald-600 hover:text-rose-600 font-bold ml-1"
                            title="Delete section"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No sections configured</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newModalSectionName}
                      onChange={(e) => setNewModalSectionName(e.target.value)}
                      placeholder="Add Section (e.g. B, C)"
                      className="flex-1 p-2 border rounded-xl uppercase font-bold text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddSectionFromModal}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl"
                    >
                      + Add Section
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsClassModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={savingClass} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  {savingClass ? 'Saving...' : editingClass ? 'Update Class' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal (Standalone) */}
      {isSectionModalOpen && targetClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsSectionModalOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-1">Add Section to {targetClass.class_name}</h3>
            <p className="text-xs text-slate-500 mb-4">Add a new section branch (e.g. B, C, D)</p>
            <form onSubmit={handleAddSection} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Section Name / Letter *</label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  required
                  placeholder="e.g. B"
                  className="w-full p-2.5 border rounded-xl uppercase font-bold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsSectionModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={savingSection} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  {savingSection ? 'Adding...' : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
