'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';
import LoadingState from '@/components/LoadingState';
import { api } from '@/services/api';
import { User } from '@/types';
import { UserCheck, Plus, ShieldCheck, KeyRound, Power, X, Edit3, Save, Trash2 } from 'lucide-react';

export default function AdminTeachersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Teacher Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Edit Teacher Credentials Modal (Super Admin Only)
  const [editUserModal, setEditUserModal] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
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

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teachers');
      if (res.data.success) setTeachers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSaving(true);
    try {
      await api.post('/teachers', { name, email, phone });
      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      loadTeachers();
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
    setEditPassword('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal || !editName || !editEmail) return;

    setSaving(true);
    try {
      // 1. Update Name, Email/Username, and Phone
      await api.put(`/teachers/${editUserModal.id}`, {
        name: editName,
        email: editEmail,
        phone: editPhone
      });

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

      alert('Account credentials and password updated successfully!');
      setEditUserModal(null);
      loadTeachers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update account credentials.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (teacher: User) => {
    const newStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/teachers/${teacher.id}/status`, { status: newStatus });
      loadTeachers();
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
      loadTeachers();
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
      loadTeachers();
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">User Account & Credential Management</h2>
              <p className="text-xs text-slate-500">Super Admin Control: Edit usernames, emails & passwords for Teachers and Super Admins</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Add New Teacher
            </button>
          </div>

          {loading ? (
            <LoadingState message="Loading accounts..." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b">
                    <tr>
                      <th className="py-3.5 px-4">User Name</th>
                      <th className="py-3.5 px-4">Email / Username</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" /> {t.name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{t.email}</td>
                        <td className="py-3 px-4 text-slate-600">{t.phone || '-'}</td>
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
                          {/* Super Admin Edit Name, Username & Password button */}
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1"
                            title="Edit User Name, Email/Username & Password"
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

      {/* Super Admin Full Edit Credentials & Password Modal */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button onClick={() => setEditUserModal(null)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-extrabold text-slate-900">Edit Account Credentials</h3>
            </div>
            <p className="text-xs text-slate-500">
              Super Admin Control: Modify user name, login email/username, and password for <strong className="text-slate-800">{editUserModal.name}</strong> ({editUserModal.role}).
            </p>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
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
                <button type="button" onClick={() => setEditUserModal(null)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">Create Teacher Account</h3>
            <form onSubmit={handleAddTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Teacher Sunitha" className="w-full p-2.5 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email / Username *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teacher.sunitha@jainarkodi.edu.in" className="w-full p-2.5 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9845012345" className="w-full p-2.5 border rounded-xl" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">{saving ? 'Creating...' : 'Create Account'}</button>
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
