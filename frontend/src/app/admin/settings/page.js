'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';

export default function AdminSettings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    if (passwords.newPassword.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setSaving(true);
    try {
      await api.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      showToast('Password changed successfully!', 'success');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-fadeIn max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account</p>
      </div>

      {/* Profile Info */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">Name</span><p className="font-medium text-slate-800 dark:text-white">{user?.name}</p></div>
          <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800 dark:text-white">{user?.email}</p></div>
          <div><span className="text-slate-500">Role</span><p className="font-medium text-slate-800 dark:text-white capitalize">{user?.role}</p></div>
          <div><span className="text-slate-500">Phone</span><p className="font-medium text-slate-800 dark:text-white">{user?.phone || '-'}</p></div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Current Password</label>
            <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})} required
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">New Password</label>
            <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} required
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Confirm New Password</label>
            <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} required
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
          </div>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
