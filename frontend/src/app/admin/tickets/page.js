'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import TicketChat from '@/components/TicketChat';
import DateRangePicker from '@/components/DateRangePicker';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Tabbed chat state
  const [openChats, setOpenChats] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  const loadTickets = async () => {
    try { const data = await api.getTickets(); setTickets(data || []); }
    catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTickets(); }, []);

  const openChat = (ticket) => {
    if (!openChats.find(c => c._id === ticket._id)) {
      setOpenChats(prev => [...prev, ticket]);
    }
    setActiveTabId(ticket._id);
  };

  const closeChat = (id) => {
    setOpenChats(prev => prev.filter(c => c._id !== id));
    if (activeTabId === id) setActiveTabId(openChats.length > 1 ? openChats.find(c => c._id !== id)?._id : null);
  };

  const handleDeleteTicket = async (id) => {
    if (!confirm('Delete this ticket?')) return;
    try { await api.deleteTicket(id); showToast('Ticket deleted', 'success'); closeChat(id); loadTickets(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const priorityBadge = (p) => {
    const c = { low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c[p] || ''}`}>{p?.toUpperCase()}</span>;
  };
  const statusBadge = (s) => {
    const c = { open: 'bg-blue-100 text-blue-700', 'in-progress': 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-600' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c[s] || ''}`}>{s?.toUpperCase()}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchTerm && !t.ticketId?.toLowerCase().includes(searchTerm.toLowerCase()) && !t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) && !t.createdBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (dateFrom && new Date(t.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.createdAt) > new Date(dateTo + 'T23:59:59.999')) return false;
    return true;
  });

  return (
    <div className="animate-fadeIn">
      {/* Ticket Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Tickets</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{tickets.length}</p>
          </div>
        </div>
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Open</p>
            <p className="text-xl font-bold text-amber-600">{tickets.filter(t => t.status === 'open').length}</p>
          </div>
        </div>
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
            <p className="text-xl font-bold text-cyan-600">{tickets.filter(t => t.status === 'in-progress').length}</p>
          </div>
        </div>
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Closed</p>
            <p className="text-xl font-bold text-emerald-600">{tickets.filter(t => ['resolved','closed'].includes(t.status)).length}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          <option value="all">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <input type="text" placeholder="Search tickets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-48 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
      </div>

      {/* Open Chat Tabs */}
      {openChats.length > 0 && (
        <div className="mb-6">
          <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-1 overflow-x-auto">
            {openChats.map(chat => (
              <div key={chat._id} className={`flex items-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer border-b-2 transition-colors whitespace-nowrap ${
                activeTabId === chat._id ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`} onClick={() => setActiveTabId(chat._id)}>
                <span className="truncate max-w-[120px]">{chat.subject}</span>
                <button onClick={(e) => { e.stopPropagation(); closeChat(chat._id); }} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800" style={{ height: 500 }}>
            {openChats.map(chat => (
              <div key={chat._id} className={activeTabId === chat._id ? 'h-full' : 'hidden'}>
                <TicketChat ticket={chat} currentRole="admin" onMessageSent={loadTickets} onStatusChange={() => loadTickets()} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ticket</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Created By</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Updated</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTickets.length === 0 ? <tr><td colSpan="7" className="text-center py-8 text-slate-400">No tickets</td></tr> :
              filteredTickets.map(t => (
                <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-teal-600 cursor-pointer hover:underline" onClick={() => openChat(t)}>{t.ticketId}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{t.subject}</td>
                  <td className="px-4 py-3 text-slate-500">{t.createdBy?.name || '-'}</td>
                  <td className="px-4 py-3">{priorityBadge(t.priority)}</td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(t.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDeleteTicket(t._id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
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
