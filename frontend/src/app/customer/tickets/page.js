'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import TicketChat from '@/components/TicketChat';
import DateRangePicker from '@/components/DateRangePicker';

export default function CustomerTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'invoicing', priority: 'medium', message: '' });
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
    try { 
      const data = await api.getTickets(); 
      setTickets(data || []);
      // Also update openChats with the latest ticket data
      setOpenChats(prevOpenChats => 
        prevOpenChats.map(openChat => {
          const updatedTicket = data.find(t => t._id === openChat._id);
          return updatedTicket || openChat;
        })
      );
    }
    catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTickets(); }, []);

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await api.createTicket({ subject: form.subject, category: form.category, priority: form.priority, message: form.message });
      showToast('Ticket created!', 'success');
      setShowCreate(false); setForm({ subject: '', category: 'invoicing', priority: 'medium', message: '' });
      loadTickets();
    } catch (err) { showToast(err.message, 'error'); }
  };

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
    if (searchTerm && !t.ticketId?.toLowerCase().includes(searchTerm.toLowerCase()) && !t.subject?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (dateFrom && new Date(t.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.createdAt) > new Date(dateTo + 'T23:59:59.999')) return false;
    return true;
  });

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Ticket Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Tickets</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{tickets.length}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Open</p>
          <p className="text-lg font-bold text-amber-600">{tickets.filter(t => t.status === 'open').length}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
          <p className="text-lg font-bold text-cyan-600">{tickets.filter(t => t.status === 'in-progress').length}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Closed</p>
          <p className="text-lg font-bold text-green-600">{tickets.filter(t => ['resolved','closed'].includes(t.status)).length}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          <option value="all">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <input type="text" placeholder="Search tickets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-48 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <div className="flex-1"></div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg">+ Raise Ticket</button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Raise a Ticket</h2>
          <form onSubmit={createTicket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Subject</label><input placeholder="Brief description of the issue" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} required className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Category</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                  <option value="invoicing">Invoicing Issue</option><option value="payment">Payment Issue</option><option value="plan">Plan Related</option><option value="technical">Technical Support</option><option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</label><textarea placeholder="Describe your issue in detail..." value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} required rows={3} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">Submit Ticket</button>
            </div>
          </form>
        </div>
      )}

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
                <TicketChat ticket={chat} currentRole="customer" onMessageSent={loadTickets} onStatusChange={() => loadTickets()} />
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
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Updated</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTickets.length === 0 ? <tr><td colSpan="5" className="text-center py-8 text-slate-400">No tickets yet</td></tr> :
              filteredTickets.map(t => (
                <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-teal-600 cursor-pointer hover:underline" onClick={() => openChat(t)}>{t.ticketId}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{t.subject}</td>
                  <td className="px-4 py-3">{priorityBadge(t.priority)}</td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))
            }
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
