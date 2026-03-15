'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

/* ── Stat Card — exact match to customer.html layout:
   Icon LEFT + Badge RIGHT (top row), Value below, Label at bottom ── */
const StatCard = ({ title, value, badge, badgeColor, iconGradient, icon }) => (
  <div className="dashboard-card bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
    <div className="flex items-center justify-between mb-2">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center flex-shrink-0`}>
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      {badge && <span className={`text-xs font-medium ${badgeColor}`}>{badge}</span>}
    </div>
    <h3 className="text-xl font-bold mb-0.5 text-slate-900 dark:text-white">{value}</h3>
    <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
  </div>
);

/* ── Status Badge ── */
const statusColors = { paid: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', partial: 'bg-blue-100 text-blue-700', overdue: 'bg-red-100 text-red-700' };

export default function CustomerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api.getDashboardStats()
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Stats Cards - 4 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={stats?.totalInvoices || 0}
          iconGradient="from-blue-500 to-blue-600"
          icon="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        <StatCard title="Outstanding Amount" value={`₹${(stats?.outstandingAmount || 0).toLocaleString()}`}
          badge={`${stats?.pendingInvoices || 0} pending`} badgeColor="text-red-500"
          iconGradient="from-red-500 to-rose-600"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatCard title="Total Paid" value={`₹${(stats?.totalPaid || 0).toLocaleString()}`}
          iconGradient="from-green-500 to-emerald-600"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatCard title="My Tickets" value={stats?.totalTickets || 0}
          badge={`${stats?.openTickets || 0} open`} badgeColor="text-amber-500"
          iconGradient="from-amber-500 to-orange-600"
          icon="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </div>

      {/* Quick Actions + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => router.push('/customer/invoices')}
              className="dashboard-card flex flex-col items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">View Invoices</span>
            </button>
            <button onClick={() => router.push('/customer/tickets')}
              className="dashboard-card flex flex-col items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              </div>
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Raise Ticket</span>
            </button>
            <button onClick={() => router.push('/customer/settings')}
              className="dashboard-card flex flex-col items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center mb-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Settings</span>
            </button>
            <button onClick={() => router.push('/customer/tickets')}
              className="dashboard-card flex flex-col items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-1.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">New Ticket</span>
            </button>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Recent Invoices</h3>
          <div className="space-y-2">
            {(stats?.recentInvoices || []).length === 0 ? (
              <p className="text-compact-sm text-slate-400 text-center py-4">No invoices yet</p>
            ) : (
              stats.recentInvoices.map((inv, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-compact-sm font-medium text-teal-600">{inv.id}</p>
                    <p className="text-[9px] text-slate-500">{new Date(inv.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-compact-sm font-semibold text-slate-800 dark:text-white">₹{inv.amount?.toLocaleString()}</p>
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium ${statusColors[inv.status] || ''}`}>{inv.status?.toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">My Plan</h3>
            <p className="text-compact-sm text-slate-500">{stats?.plan?.name || 'No active plan'}</p>
          </div>
        </div>
        {stats?.plan ? (
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-0.5">Plan Type</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white capitalize">{stats.planType}</p>
            </div>
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-0.5">Amount</p>
              <p className="text-sm font-semibold text-teal-600">₹{stats.planType === 'yearly' ? stats.plan.yearlyPrice : stats.plan.monthlyPrice}/{stats.planType === 'yearly' ? 'yr' : 'mo'}</p>
            </div>
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-0.5">Expiry Date</p>
              <p className="text-sm font-semibold text-amber-600">—</p>
            </div>
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-0.5">Status</p>
              <p className="text-sm font-semibold text-emerald-600">Active</p>
            </div>
          </div>
        ) : (
          <p className="text-compact-sm text-slate-400 text-center py-2">No plan assigned</p>
        )}
      </div>
    </div>
  );
}
