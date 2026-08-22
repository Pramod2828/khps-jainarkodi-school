'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import { api, getAssetUrl } from '@/services/api';
import { User, ClassItem } from '@/types';
import { UserCheck, Plus, ShieldCheck, KeyRound, Power, X, Edit3, Save, Trash2, GraduationCap, School, Image as ImageIcon } from 'lucide-react';

export default function AdminTeachersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [teachers, setTeachers] = useState<User[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Teacher Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [classId, setClassId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  // Edit Teacher Profile Modal State
  const [editUserModal, setEditUserModal] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editPassword, setEditPassword] = useState('');

  // Reset Password Modal
  const [resetModalTeacher, setResetModalTeacher] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          if (res.data.data.role !== 'SUPER_ADMIN') {
            router.push('/admin'); // Restrict non-Super Admins
          }
          setUser(res.data.data);
        }
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/classes')
      ]);
      if (tRes.data.success) setTeachers(tRes.data.data || []);
      if (cRes.data.success) setClassesList(cRes.data.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      if (phone) formData.append('phone', phone);
      if (qualification) formData.append('qualification', qualification);
      if (classId && classId !== 'all') formData.append('class_id', classId);
      if (photo) formData.append('photo', photo);

      await api.post('/teachers', formData);
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setQualification('');
      setClassId('');
      setPhoto(null);
      loadData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.details || err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to create teacher account';
      alert(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (targetUser: User) => {
    setEditUserModal(targetUser);
    setEditName(targetUser.name);
    setEditEmail(targetUser.email);
    setEditPhone(targetUser.phone || '');
    setEditQualification(targetUser.qualification || '');
    setEditClassId(targetUser.class_id ? String(targetUser.class_id) : '');
    setEditPhoto(null);
    setEditPassword('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal || !editName || !editEmail) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editName);
      formData.append('email', editEmail);
      formData.append('phone', editPhone);
      formData.append('qualification', editQualification);
      formData.append('class_id', editClassId && editClassId !== 'all' ? editClassId : '');
      if (editPhoto) formData.append('photo', editPhoto);

      // 1. Update Profile Details & Photo
      await api.put(`/teachers/${editUserModal.id}`, formData);

      // 2. If password input is filled, update password
      if (editPassword.trim()) {
        if (editPassword.trim().length < 6) {
          alert('Password must be at least 6 characters long.');
          setSaving(false);
          return;
        }
        await api.post(`/teachers/${editUserModal.id}/reset-password`, {
          new_password: editPassword.trim()
        });
      }

      alert('Teacher profile and account details updated successfully!');
      setEditUserModal(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update teacher profile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (teacher: User) => {
    const newStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/teachers/${teacher.id}/status`, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const handleDeleteTeacher = async (id: number, teacherName: string) => {
    if (id === user?.id) {
      alert('You cannot delete your own Super Admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete account for "${teacherName}"?`)) return;
    try {
      await api.delete(`/teachers/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete teacher account.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalTeacher || !newPassword) return;
    setSaving(true);
    try {
      await api.post(`/teachers/${resetModalTeacher.id}/reset-password`, { new_password: newPassword });
      setResetModalTeacher(null);
      setNewPassword('');
      alert('Password reset successfully!');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <AdminSidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <AdminHeader user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-8 space-y-6 flex-1">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Teacher Profile & Account Management</h2>
              <p className="text-xs text-slate-500">Super Admin Control: Manage teacher names, qualifications, teaching standards, photos & credentials</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Add New Teacher
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading teacher profiles..." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3.5 px-4">Photo & Name</th>
                      <th className="py-3.5 px-4">Email / Username</th>
                      <th className="py-3.5 px-4">Qualification</th>
                      <th className="py-3.5 px-4">Teaching Standard</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                            {t.photo_url ? (
                              <img
                                src={getAssetUrl(t.photo_url)}
                                alt={t.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <UserCheck className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{t.name}</div>
                            {t.phone && <div className="text-[11px] text-slate-500 font-normal">{t.phone}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{t.email}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {t.qualification ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                              <GraduationCap className="w-3 h-3 text-amber-600" /> {t.qualification}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {t.teaching_standard ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                              <School className="w-3 h-3 text-emerald-600" /> {t.teaching_standard}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase ${
                            t.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {t.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                            t.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1"
                            title="Edit Teacher Profile & Credentials"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>

                          {t.id !== user?.id && (
                            <button
                              onClick={() => toggleStatus(t)}
                              className={`p-1.5 rounded-lg ${t.status === 'ACTIVE' ? 'text-slate-600 hover:bg-slate-100' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={t.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}

                          {t.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteTeacher(t.id, t.name)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg inline-flex items-center gap-1"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
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

      {/* Super Admin Full Edit Teacher Profile & Credentials Modal */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditUserModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-extrabold text-slate-900">Edit Teacher Profile & Credentials</h3>
            </div>
            <p className="text-xs text-slate-500">
              Update details for <strong className="text-slate-800">{editUserModal.name}</strong> ({editUserModal.role}).
            </p>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email / Username *</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Education / Qualification</label>
                  <input
                    type="text"
                    value={editQualification}
                    onChange={(e) => setEditQualification(e.target.value)}
                    placeholder="e.g. B.Ed, M.A."
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teaching Standard / Class</label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white text-slate-900 font-semibold"
                >
                  <option value="">[ Select Teaching Standard ]</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>{c.class_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> Teacher Profile Image
                </label>
                {editUserModal.photo_url && (
                  <div className="mb-2 flex items-center gap-2 bg-slate-100 p-2 rounded-xl">
                    <img src={getAssetUrl(editUserModal.photo_url)} alt="Current" className="w-8 h-8 rounded-full object-cover border" />
                    <span className="text-[11px] text-slate-600">Current photo saved. Choose below to replace:</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setEditPhoto(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 border rounded-xl bg-slate-50 text-slate-700"
                />
              </div>

              <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 space-y-1.5">
                <label className="block font-extrabold text-amber-900 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" /> Change Password (Optional)
                </label>
                <p className="text-[11px] text-amber-700">Leave blank to keep the current password unchanged.</p>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)..."
                  className="w-full p-2.5 border rounded-xl bg-white font-semibold text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditUserModal(null)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4 text-slate-900">Add New Teacher Profile</h3>
            <form onSubmit={handleAddTeacher} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Savita R. Shetty"
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email / Username *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="teacher.savita@jainarkodi.edu.in"
                    className="w-full p-2.5 border rounded-xl font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Education / Qualification</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. B.Ed, M.A."
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teaching Standard / Class</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white text-slate-900 font-semibold"
                >
                  <option value="">[ Select Teaching Standard ]</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>{c.class_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> Teacher Profile Image
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 border rounded-xl bg-slate-50 text-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow">{saving ? 'Creating...' : 'Create Teacher'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Quick Reset Password Modal */}
      {resetModalTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setResetModalTeacher(null)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">Resetting password for: <span className="font-bold text-slate-800">{resetModalTeacher.name}</span></p>
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Temporary Password *</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="••••••••" className="w-full p-2.5 border rounded-xl" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setResetModalTeacher(null)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-600 text-white font-bold rounded-xl shadow">{saving ? 'Resetting...' : 'Reset Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
