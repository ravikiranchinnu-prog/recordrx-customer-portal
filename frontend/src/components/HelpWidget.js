'use client';
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

const categories = [
  {
    id: 'account', label: 'Account & Security', icon: '🔒', color: 'from-indigo-500 to-violet-500',
    desc: 'Password, profile, access issues',
    items: ['Change Password Issue', 'Update Profile Info', 'Account Locked Out', '2FA / OTP Issue', 'Delete Account Request']
  },
  {
    id: 'payment', label: 'Payment Issues', icon: '💳', color: 'from-emerald-500 to-teal-500',
    desc: 'Payments, refunds, receipts',
    items: ['Payment Not Reflecting', 'Invoice Dispute', 'Refund Request', 'Payment Failed', 'Duplicate Payment', 'Receipt Missing']
  },
  {
    id: 'invoicing', label: 'Invoicing Issues', icon: '📄', color: 'from-amber-500 to-orange-500',
    desc: 'Bills, amounts, tax queries',
    items: ['Incorrect Amount on Invoice', 'Invoice Not Generated', 'Late Fee Dispute', 'Tax / GST Query', 'Download Issue']
  },
  {
    id: 'plan', label: 'Plan & Subscription', icon: '📦', color: 'from-cyan-500 to-blue-500',
    desc: 'Plan changes, renewals, cancellation',
    items: ['Change Plan', 'Renewal Issue', 'Downgrade Plan', 'Features Not Working', 'Cancel Subscription']
  },
  {
    id: 'technical', label: 'Technical Support', icon: '🔧', color: 'from-rose-500 to-pink-500',
    desc: 'Portal, login, performance',
    items: ['Portal Not Loading', 'Unable to Login', 'Slow Performance', 'Error Messages', 'Browser Compatibility']
  },
  {
    id: 'other', label: 'General Inquiry', icon: '💬', color: 'from-slate-500 to-slate-600',
    desc: 'Contact, feedback, other',
    items: ['Contact Info Update', 'Service Availability', 'Feedback / Suggestion', 'Other Query']
  }
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('categories'); // categories | items | confirm | success
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState('');
  const popupRef = useRef(null);
  const { showToast } = useToast();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (open && popupRef.current && !popupRef.current.contains(e.target) && !e.target.closest('.support-fab-btn')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const reset = () => {
    setView('categories');
    setSelectedCat(null);
    setSelectedItem('');
    setPriority('medium');
    setDescription('');
    setCreatedTicketId('');
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
    } else {
      reset();
      setOpen(true);
    }
  };

  const selectCategory = (cat) => {
    setSelectedCat(cat);
    setView('items');
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setView('confirm');
  };

  const goBack = () => {
    if (view === 'items') { setView('categories'); setSelectedCat(null); }
    else if (view === 'confirm') { setView('items'); setSelectedItem(''); setPriority('medium'); setDescription(''); }
    else if (view === 'success') { reset(); }
  };

  const submitTicket = async () => {
    setSubmitting(true);
    try {
      const res = await api.createTicket({
        subject: selectedItem,
        category: selectedCat.id,
        priority,
        message: description || `Auto-created from Help Widget: ${selectedItem}`
      });
      setCreatedTicketId(res.ticketId || 'Created');
      setView('success');
      showToast('Ticket created!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create ticket', 'error');
    }
    setSubmitting(false);
  };

  const headerTitle = view === 'categories' ? 'How can we help?' :
    view === 'items' ? selectedCat?.label :
    view === 'confirm' ? 'Confirm Ticket' : 'Ticket Created!';

  const headerSub = view === 'categories' ? 'Choose a category below' :
    view === 'items' ? 'Select your issue' :
    view === 'confirm' ? 'Review and submit' : '';

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={toggleOpen}
        className="support-fab-btn fixed bottom-5 right-5 z-[9998] w-[38px] h-[38px] rounded-full border-none cursor-pointer flex items-center justify-center transition-transform duration-300 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
          boxShadow: '0 4px 16px rgba(20,184,166,0.4), 0 2px 6px rgba(0,0,0,0.12)'
        }}
        title="Need help? Raise a ticket"
      >
        <span className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>?</span>
      </button>

      {/* Popup */}
      <div
        ref={popupRef}
        className={`fixed bottom-[68px] right-5 z-[9997] w-[340px] max-h-[480px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'
        }`}
        style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)' }}>
          <div className="flex items-center gap-2">
            {view !== 'categories' && (
              <button onClick={goBack} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div>
              <h4 className="text-[13px] font-bold text-white m-0">{headerTitle}</h4>
              {headerSub && <p className="text-[10px] text-white/85 m-0 mt-0.5">{headerSub}</p>}
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
          {/* CATEGORIES VIEW */}
          {view === 'categories' && categories.map((cat) => (
            <div key={cat.id} onClick={() => selectCategory(cat)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border border-transparent hover:bg-teal-50/60 dark:hover:bg-teal-900/20 hover:border-teal-200/40 dark:hover:border-teal-700/40 transition-all mb-1.5">
              <div className={`w-[34px] h-[34px] rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 text-[15px]`}>{cat.icon}</div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 m-0">{cat.label}</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">{cat.desc}</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          ))}

          {/* ITEMS VIEW */}
          {view === 'items' && selectedCat && selectedCat.items.map((item, i) => (
            <div key={i} onClick={() => selectItem(item)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer border border-transparent hover:bg-teal-50/60 dark:hover:bg-teal-900/20 hover:border-teal-200/40 dark:hover:border-teal-700/40 transition-all mb-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0"></div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item}</span>
            </div>
          ))}

          {/* CONFIRM VIEW */}
          {view === 'confirm' && (
            <div className="space-y-3">
              <div className="bg-teal-50 dark:bg-teal-900/30 rounded-xl p-3 border border-teal-200/40 dark:border-teal-700/40">
                <p className="text-[10px] font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wider m-0">Issue</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 m-0 mt-1">{selectedItem}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">{selectedCat?.label}</p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Additional Details (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Any extra details..."
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 resize-none" />
              </div>
              <button onClick={submitTicket} disabled={submitting}
                className="w-full py-2.5 rounded-xl text-white text-xs font-semibold disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}>
                {submitting ? 'Creating...' : '🎫 Submit Ticket'}
              </button>
            </div>
          )}

          {/* SUCCESS VIEW */}
          {view === 'success' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-2xl">✅</div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">Ticket Created!</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your ticket <span className="font-semibold text-teal-600">{createdTicketId}</span> has been submitted.</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Our team will get back to you shortly.</p>
              <button onClick={() => { reset(); setOpen(false); }}
                className="px-6 py-2 rounded-lg text-white text-xs font-medium"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}>
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {view === 'categories' && (
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
            <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center m-0">Powered by Radix Support</p>
          </div>
        )}
      </div>
    </>
  );
}
