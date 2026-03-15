'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function UserMgmtPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', phone: '' });
  const { showToast } = useToast();

  const loadUsers = async () => {
    try { const data = await api.getUsers(); setUsers(data || []); }
    catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => { setEditingId(null); setForm({ name: '', email: '', password: '', role: 'staff', phone: '' }); setShowForm(true); };
  const openEdit = (u) => { setEditingId(u._id); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (editingId) { delete payload.password; await api.updateUser(editingId, payload); showToast('User updated', 'success'); }
      else { if (!payload.password) { showToast('Password required', 'error'); return; } await api.createUser(payload); showToast('User created', 'success'); }
      setShowForm(false); loadUsers();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await api.deleteUser(id); showToast('User deleted', 'success'); loadUsers(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const roleBadge = (role) => {
    const c = { superadmin: 'bg-purple-100 text-purple-700', admin: 'bg-red-100 text-red-700', manager: 'bg-blue-100 text-blue-700', staff: 'bg-teal-100 text-teal-700', viewer: 'bg-slate-100 text-slate-600' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c[role] || ''}`}>{role?.toUpperCase()}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h1><p className="text-sm text-slate-500">Staff & admin users</p></div>
        <button onClick={openAdd} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">+ Add User</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{editingId ? 'Edit' : 'Add'} User</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name</label><input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            {!editingId && <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password</label><input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>}
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Role</label>
              <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button type="submit" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.length === 0 ? <tr><td colSpan="5" className="text-center py-8 text-slate-400">No users found</td></tr> :
              users.map(u => (
                <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3 text-slate-500">{u.phone || '-'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</button>
                    {u.role !== 'superadmin' && <button onClick={() => handleDelete(u._id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
