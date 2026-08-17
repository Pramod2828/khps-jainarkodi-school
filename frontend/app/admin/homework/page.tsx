'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { api, getAssetUrl } from '@/services/api';
import { User, Homework, ClassItem, SubjectItem } from '@/types';
import { BookOpen, Plus, Search, Edit3, Trash2, X, UserCheck, FileText, Download, Eye } from 'lucide-react';

export default function AdminHomeworkPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachersList, setTeachersList] = useState<User[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Homework Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [homeworkDate, setHomeworkDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);

  // Teacher Assignment Selection State (Compulsory)
  const [teacherSelectMode, setTeacherSelectMode] = useState<string>('CURRENT');
  const [customTeacherInput, setCustomTeacherInput] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuthAndFilters() {
      try {
        const meRes = await api.get('/auth/me');
        if (meRes.data.success) {
          setUser(meRes.data.data);
        }
      } catch (err) {
        router.push('/login');
        return;
      }

      try {
        const [cRes, sRes, tRes] = await Promise.all([
          api.get('/classes'),
          api.get('/classes/subjects'),
          api.get('/teachers')
        ]);
        if (cRes.data.success) setClasses(cRes.data.data || []);
        if (sRes.data.success) setSubjects(sRes.data.data || []);
        if (tRes.data.success) setTeachersList(tRes.data.data || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    checkAuthAndFilters();
  }, [router]);

  const loadHomework = async () => {
    setLoading(true);
    try {
      let url = `/homework?limit=100&class_id=${selectedClass}&subject_id=${selectedSubject}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await api.get(url);
      if (res.data.success) setHomeworkList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load homework:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, [selectedClass, selectedSubject, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingHomework(null);
    setClassId(classes[0] ? String(classes[0].id) : '1');
    setSubjectId(subjects[0] ? String(subjects[0].id) : '1');
    setCustomSubjectInput('');
    setTitle('');
    setDescription('');
    setHomeworkDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setFile(null);
    setTeacherSelectMode('CURRENT');
    setCustomTeacherInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hw: Homework) => {
    setEditingHomework(hw);
    setClassId(String(hw.class_id));

    if (hw.custom_subject_name) {
      setSubjectId('OTHER');
      setCustomSubjectInput(hw.custom_subject_name);
    } else {
      setSubjectId(String(hw.subject_id));
      setCustomSubjectInput('');
    }

    setTitle(hw.title);
    setDescription(hw.description);
    setHomeworkDate(hw.homework_date ? hw.homework_date.substring(0, 10) : new Date().toISOString().split('T')[0]);
    setDueDate(hw.due_date ? hw.due_date.substring(0, 10) : new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setFile(null);

    if (hw.custom_teacher_name) {
      setTeacherSelectMode('CUSTOM');
      setCustomTeacherInput(hw.custom_teacher_name);
    } else {
      setTeacherSelectMode(String(hw.teacher_id));
      setCustomTeacherInput('');
    }
    setIsModalOpen(true);
  };

  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || (!subjectId && !customSubjectInput.trim()) || !title || !description || !homeworkDate || !dueDate) return;

    if (teacherSelectMode === 'CUSTOM' && !customTeacherInput.trim()) {
      alert('Please enter the custom teacher name (Compulsory).');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('class_id', classId);
      formData.append('subject_id', customSubjectInput.trim() ? '1' : subjectId);
      formData.append('custom_subject_name', customSubjectInput.trim());

      formData.append('title', title);
      formData.append('description', description);
      formData.append('homework_date', homeworkDate);
      formData.append('due_date', dueDate);

      if (teacherSelectMode === 'CUSTOM') {
        formData.append('custom_teacher_name', customTeacherInput.trim());
        if (user) formData.append('teacher_id', String(user.id));
      } else if (teacherSelectMode === 'CURRENT') {
        if (user) formData.append('teacher_id', String(user.id));
        formData.append('custom_teacher_name', '');
      } else {
        formData.append('teacher_id', teacherSelectMode);
        formData.append('custom_teacher_name', '');
      }

      if (file) formData.append('attachment', file);

      if (editingHomework) {
        await api.put(`/homework/${editingHomework.id}`, formData);
      } else {
        await api.post('/homework', formData);
      }

      setIsModalOpen(false);
      loadHomework();
    } catch (err: any) {
      const msg = err.response?.data?.error?.details || err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to save homework';
      alert(`Save Homework Notice: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this homework assignment?')) return;
    try {
      await api.delete(`/homework/${id}`);
      loadHomework();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete homework assignment.');
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
              <h2 className="text-xl font-bold text-slate-900">Homework Management</h2>
              <p className="text-xs text-slate-500">Post daily homework tasks & assign responsible teacher name</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Post New Homework
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 text-xs border rounded-xl font-medium"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.class_name}</option>
                ))}
              </select>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-1.5 text-xs border rounded-xl font-bold text-slate-800"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject_name}</option>
                ))}
                <option value="OTHER">Other / Custom Subjects</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search homework / teacher / subject..."
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl outline-none"
              />
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading homework assignments..." />
          ) : homeworkList.length === 0 ? (
            <EmptyState title="No Homework Assignments Found" message="Click '+ Post New Homework' to create an assignment." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3.5 px-4">Class</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Title</th>
                      <th className="py-3.5 px-4">Attachment</th>
                      <th className="py-3.5 px-4">Date (Day)</th>
                      <th className="py-3.5 px-4">Due Date</th>
                      <th className="py-3.5 px-4">Assigned Teacher</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {homeworkList.map((hw) => {
                      const attachUrl = hw.attachment_url || (hw.attachments && hw.attachments[0] ? hw.attachments[0].file_path : null);
                      const isImage = attachUrl && (attachUrl.startsWith('data:image') || attachUrl.endsWith('.png') || attachUrl.endsWith('.jpg') || attachUrl.endsWith('.jpeg') || attachUrl.endsWith('.webp'));
                      return (
                        <tr key={hw.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{hw.class_name}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{hw.subject_name}</td>
                          <td className="py-3 px-4 max-w-xs font-bold text-slate-800 truncate">{hw.title}</td>
                          <td className="py-3 px-4">
                            {attachUrl ? (
                              <a
                                href={getAssetUrl(attachUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100"
                              >
                                {isImage ? <Eye className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                {isImage ? 'View Image' : 'Download Attachment'}
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">No File</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{hw.homework_date ? hw.homework_date.substring(0, 10) : ''} ({hw.homework_day})</td>
                          <td className="py-3 px-4 font-bold text-rose-600">{hw.due_date ? hw.due_date.substring(0, 10) : ''}</td>
                          <td className="py-3 px-4">
                            <span className="bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-lg border border-blue-100 inline-flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              {hw.teacher_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            <button onClick={() => handleOpenEditModal(hw)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit Homework">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(hw.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Delete Homework">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Post / Edit Homework Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold">{editingHomework ? 'Edit Homework' : 'Post New Homework'}</h3>

            <form onSubmit={handleSaveHomework} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class *</label>
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} required className="w-full p-2.5 border rounded-xl">
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Standard Subject *</label>
                  <select
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      if (e.target.value !== 'OTHER') {
                        setCustomSubjectInput('');
                      }
                    }}
                    required={!customSubjectInput.trim()}
                    className="w-full p-2.5 border rounded-xl font-bold text-slate-800"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.subject_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Subject Input */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/70 space-y-1">
                <label className="block font-bold text-emerald-900 text-[11px]">
                  Or Write Custom Subject (One-time choice, NOT saved to subject list):
                </label>
                <input
                  type="text"
                  value={customSubjectInput}
                  onChange={(e) => {
                    setCustomSubjectInput(e.target.value);
                    if (e.target.value.trim()) {
                      setSubjectId('OTHER');
                    }
                  }}
                  placeholder="e.g. Computer Science / Drawing / Craft"
                  className="w-full p-2 border border-emerald-300 rounded-xl bg-white text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Teacher Selection */}
              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/80 space-y-2">
                <label className="block font-extrabold text-blue-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  Assigned Teacher Name * <span className="text-rose-600 text-[10px] font-extrabold uppercase">(Compulsory)</span>
                </label>
                <select
                  value={teacherSelectMode}
                  onChange={(e) => setTeacherSelectMode(e.target.value)}
                  required
                  className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-800"
                >
                  <option value="CURRENT">
                    Current User ({user?.name || 'Logged-in Account'})
                  </option>
                  {teachersList.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                  <option value="CUSTOM">+ Enter Other / Custom Teacher Name...</option>
                </select>

                {teacherSelectMode === 'CUSTOM' && (
                  <div className="pt-2">
                    <label className="block font-bold text-rose-700 mb-1 flex items-center gap-1">
                      Type Teacher Name * (Compulsory)
                    </label>
                    <input
                      type="text"
                      value={customTeacherInput}
                      onChange={(e) => setCustomTeacherInput(e.target.value)}
                      required
                      placeholder="e.g. Mrs. Savitha R. Shetty / Guest Teacher"
                      className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Chapter 3 Exercise Questions"
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Instructions *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Write point-wise homework details..."
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Homework Date *</label>
                  <input
                    type="date"
                    value={homeworkDate}
                    onChange={(e) => setHomeworkDate(e.target.value)}
                    required
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attachment File (PDF/Image - Max 10MB)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 border rounded-xl bg-slate-50"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  {saving ? 'Saving...' : 'Save Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
