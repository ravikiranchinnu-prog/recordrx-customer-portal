'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import DateRangePicker from '@/components/DateRangePicker';

/* ── Helpers ── */
const fmt = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

/* ── Stat Card — exact match to admin.html layout ──
   Icon LEFT + Badge RIGHT (top row), then Value, then Label */
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

/* ── Revenue Bar Chart (CSS bars — exact match to admin.html) ── */
const RevenueChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">Last 6 months</span>
      </div>
      <div className="h-48 flex items-end gap-2 px-2">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const val = '₹' + Number(d.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[9px] text-slate-500 mb-1">{val}</span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-teal-600 to-teal-400 transition-all duration-700"
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 px-2 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-500">{d.label}</div>
        ))}
      </div>
    </div>
  );
};

/* ── SVG Donut Chart — exact match to admin.html ── */
const DonutChart = ({ data }) => {
  const total = (data.paid || 0) + (data.pending || 0) + (data.overdue || 0);
  const segments = [];
  if (total > 0) {
    const paidPct = (data.paid / total) * 100;
    const pendingPct = (data.pending / total) * 100;
    const overduePct = (data.overdue / total) * 100;
    // donutPaid: offset 0; donutPending: offset -paidPct; donutOverdue: offset -(paidPct+pendingPct)
    segments.push({ pct: paidPct, color: 'stroke-emerald-500', offset: 0 });
    segments.push({ pct: pendingPct, color: 'stroke-amber-500', offset: -paidPct });
    segments.push({ pct: overduePct, color: 'stroke-red-500', offset: -(paidPct + pendingPct) });
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Invoicing Overview</h3>
      </div>
      <div className="flex items-center justify-center gap-6">
        {/* Donut */}
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 36 36" className="w-36 h-36 transform -rotate-90">
            <circle cx="18" cy="18" r="15.915" fill="none" strokeWidth="3" className="stroke-slate-200 dark:stroke-slate-700" />
            {segments.map((seg, i) => (
              <circle key={i} cx="18" cy="18" r="15.915" fill="none" className={seg.color} strokeWidth="3"
                strokeDasharray={`${seg.pct} ${100 - seg.pct}`} strokeDashoffset={seg.offset}
                style={{ transition: 'all 1s ease' }} />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-slate-900 dark:text-white">{total}</span>
            <span className="text-[10px] text-slate-500">Total Invoices</span>
          </div>
        </div>
        {/* Legend */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <div>
              <p className="text-xs font-medium text-slate-900 dark:text-white">Paid</p>
              <p className="text-[10px] text-slate-500">{data.paid || 0} invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div>
              <p className="text-xs font-medium text-slate-900 dark:text-white">Pending</p>
              <p className="text-[10px] text-slate-500">{data.pending || 0} invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div>
              <p className="text-xs font-medium text-slate-900 dark:text-white">Overdue</p>
              <p className="text-[10px] text-slate-500">{data.overdue || 0} invoices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Quick Insights — exact match to admin.html ── */
const QuickInsights = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Collection Rate */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Collection Rate</h4>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-teal-600">{stats.collectionRate || 0}%</span>
        <span className="text-[10px] text-slate-500 mb-1">of total invoiced</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-3">
        <div className="bg-teal-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${stats.collectionRate || 0}%` }} />
      </div>
    </div>

    {/* Active Plans */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Active Plans</h4>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-emerald-600">{(stats.monthlyPlanCount || 0) + (stats.yearlyPlanCount || 0)}</span>
        <span className="text-[10px] text-slate-500 mb-1">customers subscribed</span>
      </div>
      <div className="flex gap-1 mt-3">
        {((stats.monthlyPlanCount || 0) + (stats.yearlyPlanCount || 0)) > 0 ? (
          <>
            <div className="h-1.5 bg-teal-500 rounded-l-full transition-all duration-500" style={{ width: `${(stats.monthlyPlanCount / ((stats.monthlyPlanCount || 0) + (stats.yearlyPlanCount || 0))) * 100}%` }} />
            <div className="h-1.5 bg-cyan-500 rounded-r-full transition-all duration-500" style={{ width: `${(stats.yearlyPlanCount / ((stats.monthlyPlanCount || 0) + (stats.yearlyPlanCount || 0))) * 100}%` }} />
          </>
        ) : <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full w-full" />}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-teal-500">Monthly</span>
        <span className="text-[10px] text-cyan-500">Yearly</span>
      </div>
    </div>

    {/* Open Tickets */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Open Tickets</h4>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-amber-600">{stats.openTickets || 0}</span>
        <span className="text-[10px] text-slate-500 mb-1">need attention</span>
      </div>
      <div className="flex gap-3 mt-3">
        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">{stats.pendingTickets || 0} pending</span>
        <span className="text-[10px] px-2 py-0.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 rounded-full">{stats.inProgressTickets || 0} in progress</span>
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadStats = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('startDate', dateFrom);
    if (dateTo) params.set('endDate', dateTo);
    api.getDashboardStats(params.toString())
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, [dateFrom, dateTo]);

  const handleSendReport = async () => {
    setSendingReport(true);
    setReportMsg('');
    try {
      const [y, m] = reportMonth.split('-').map(Number);
      const res = await api.sendMonthlyReport(y, m - 1);
      setReportMsg(res.message || 'Report sent successfully!');
    } catch (err) {
      setReportMsg(err.message || 'Failed to send report');
    } finally {
      setSendingReport(false);
      setTimeout(() => setReportMsg(''), 5000);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Stats Cards Row — 4 cols matching admin.html exactly */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={stats?.totalCustomers || 0}
          badge="Active" badgeColor="text-green-500"
          iconGradient="from-blue-500 to-blue-600"
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <StatCard title="Revenue" value={fmt(stats?.monthlyRevenue || 0)}
          badge="Collected" badgeColor="text-green-500"
          iconGradient="from-green-500 to-emerald-600"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatCard title="Total Invoices" value={stats?.totalBills || 0}
          badge={`${stats?.pendingCount || 0} pending`} badgeColor="text-amber-500"
          iconGradient="from-amber-500 to-orange-600"
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <StatCard title="Outstanding" value={fmt(stats?.pendingAmount || 0)}
          badge={`${stats?.overdueCount || 0} overdue`} badgeColor="text-red-500"
          iconGradient="from-red-500 to-rose-600"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </div>

      {/* Select Date Range + Send Report */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <div className="flex items-center gap-3">
          {reportMsg && <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">{reportMsg}</span>}
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleSendReport}
            disabled={sendingReport}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {sendingReport ? 'Sending...' : 'Send Monthly Report'}
          </button>
        </div>
      </div>

      {/* Charts Row — 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart data={stats?.revenueChart || []} />
        <DonutChart data={stats?.donutData || { paid: 0, pending: 0, overdue: 0, total: 0 }} />
      </div>

      {/* Quick Insights Row — 3 cols */}
      <QuickInsights stats={stats || {}} />
    </div>
  );
}
