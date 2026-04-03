'use client';
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from './Toast';

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function AttachmentBubble({ attachment, isOwn }) {
  const linkColor = isOwn ? 'text-teal-100 hover:text-white' : 'text-teal-600 hover:text-teal-700 dark:text-teal-400';
  if (attachment.type?.startsWith('image/')) {
    return (
      <div className="mb-1">
        <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-48 rounded-lg cursor-pointer"
          onClick={() => window.open(attachment.url, '_blank')} title="Click to open full size" />
      </div>
    );
  }
  if (attachment.type?.startsWith('video/')) {
    return <div className="mb-1"><video src={attachment.url} controls className="max-w-full max-h-48 rounded-lg" /></div>;
  }
  return (
    <div className={`flex items-center gap-2 mb-1 p-2 rounded-lg ${isOwn ? 'bg-teal-700/40' : 'bg-slate-100 dark:bg-slate-700'}`}>
      <svg className={`w-5 h-5 flex-shrink-0 ${linkColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <div className="min-w-0 flex-1">
        <a href={attachment.url} download={attachment.name} className={`text-xs font-medium ${linkColor} underline truncate block`}>{attachment.name}</a>
        {attachment.size && <p className={`text-[9px] ${isOwn ? 'text-teal-200' : 'text-slate-400'}`}>{formatFileSize(attachment.size)}</p>}
      </div>
    </div>
  );
}

function ChatBubble({ msg, currentRole }) {
  const isOwn = msg.sender === currentRole;
  const alignClass = isOwn ? 'justify-end' : 'justify-start';
  const bubbleClass = isOwn
    ? 'bg-teal-600 text-white rounded-2xl rounded-tr-sm'
    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-sm';
  const nameColor = isOwn ? 'text-teal-100' : 'text-cyan-600 dark:text-cyan-400';
  const timeColor = isOwn ? 'text-teal-200' : 'text-slate-400';

  return (
    <div className={`flex ${alignClass}`}>
      <div className={`max-w-[70%] ${bubbleClass} px-3 py-2 shadow-sm`}>
        <p className={`text-[10px] font-medium ${nameColor} mb-1`}>{msg.senderName || msg.sender}</p>
        {msg.attachment && <AttachmentBubble attachment={msg.attachment} isOwn={isOwn} />}
        {msg.text && <p className="text-xs">{msg.text}</p>}
        <p className={`text-[9px] ${timeColor} mt-1`}>{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</p>
      </div>
    </div>
  );
}

export default function TicketChat({ ticket, currentRole, onStatusChange, onMessageSent }) {
  const [text, setText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftSearch, setDraftSearch] = useState('');
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const draftPopoverRef = useRef(null);
  const { showToast } = useToast();
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'in-progress': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  };
  const priorityColors = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const handleAttach = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be under 2MB', 'warning');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingAttachment({ name: file.name, type: file.type, size: file.size, data: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeAttachment = () => setPendingAttachment(null);

  const sendMessage = async () => {
    if (!text.trim() && !pendingAttachment) return;
    setSending(true);
    try {
      const payload = { text: text.trim() };
      if (pendingAttachment) {
        payload.attachment = {
          name: pendingAttachment.name,
          type: pendingAttachment.type,
          size: pendingAttachment.size,
          url: pendingAttachment.data
        };
      }
      await api.sendMessage(ticket.ticketId, payload);
      if (selectedDraft) {
        try {
          await api.sendDraft(selectedDraft.id, ticket.customerEmail, {
            customerName: ticket.customerName,
            ticketId: ticket.ticketId
          });
        } catch (e) {
          showToast(`Message saved but email failed: ${e.message}`, 'warning');
        }
      }
      setText('');
      setPendingAttachment(null);
      setSelectedDraft(null);
      if (onMessageSent) onMessageSent();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateTicketStatus(ticket.ticketId, newStatus);
      if (onStatusChange) onStatusChange(newStatus);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const htmlToPlain = (html = '') => {
    // Decode HTML entities first
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    let result = txt.value;
    
    // Replace common HTML tags with appropriate spacing
    result = result
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return result;
  };

  const filteredDrafts = drafts.filter((d) => {
    const q = draftSearch.toLowerCase();
    if (!q) return true;
    return (
      (d.subject || '').toLowerCase().includes(q) ||
      (d.issueType || '').toLowerCase().includes(q) ||
      (d.customerQuestions || '').toLowerCase().includes(q)
    );
  });

  // Collapse dropdown on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setShowDrafts(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDrafts) return;
    const onMouseDown = (e) => {
      const pop = draftPopoverRef.current;
      if (!pop) return;
      if (!pop.contains(e.target)) setShowDrafts(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showDrafts]);

  // Auto-resize textarea height for draft previews
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Expand fully for drafts, otherwise limit to 220px
    const maxHeight = selectedDraft ? 'none' : '220px';
    el.style.height = selectedDraft ? `${Math.min(el.scrollHeight, window.innerHeight - 300)}px` : `${Math.min(el.scrollHeight, 220)}px`;
    el.style.maxHeight = maxHeight;
  };
  useEffect(() => {
    resizeTextarea();
  }, [text, selectedDraft]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-sm">{ticket.ticketId}</span>
          <span className="text-xs opacity-90">{ticket.subject}</span>
          <span className="text-[10px] opacity-75">by {ticket.customerName || 'Unknown'}</span>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColors[ticket.status] || ''}`}>{(ticket.status || '').replace('-', ' ').toUpperCase()}</span>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${priorityColors[ticket.priority] || ''}`}>{(ticket.priority || '').toUpperCase()}</span>
        </div>
        {currentRole !== 'customer' && (
          <div className="relative inline-flex items-center gap-2">
            <button title="Send draft email" onClick={async () => {
              if (!showDrafts) {
                setShowDrafts(true);
                setLoadingDrafts(true);
                try {
                  const res = await api.getEmailDrafts();
                  setDrafts(res || []);
                  setDraftSearch('');
                } catch (e) {
                  showToast(e.message, 'error');
                } finally {
                  setLoadingDrafts(false);
                }
              } else {
                setShowDrafts(false);
              }
            }} className="p-2 rounded-full bg-white/90 text-teal-700 hover:bg-white shadow-sm border border-white/70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <select value={ticket.status} onChange={(e) => handleStatusChange(e.target.value)}
              className="text-[10px] px-2 py-1 border border-white/30 rounded-lg bg-white text-slate-800">
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>

            {showDrafts && (
              <div ref={draftPopoverRef} className="absolute right-0 top-full mt-2 w-[22rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[1000] overflow-hidden">
                <div className="bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-semibold text-teal-700 dark:text-teal-300 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[10px]">✉</span>
                    Email Drafts
                  </div>
                  <button onClick={() => setShowDrafts(false)} className="h-6 w-6 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Close">
                    ×
                  </button>
                </div>
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <input
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    placeholder="Search drafts…"
                    className="w-full text-[11px] px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
                  {loadingDrafts ? (
                    <div className="text-xs text-slate-500">Loading drafts…</div>
                  ) : filteredDrafts.length === 0 ? (
                    <div className="text-xs text-slate-500">No drafts match your search</div>
                  ) : filteredDrafts.map((d, idx) => (
                    <button
                      key={d.id || idx}
                      onClick={() => {
                        const preview = htmlToPlain(d.html || d.subject || '');
                        setText(preview);
                        setSelectedDraft(d);
                        setShowDrafts(false);
                        showToast('Draft loaded. Review and edit before sending.', 'info');
                      }}
                      className="w-full text-left rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:border-teal-200 hover:bg-teal-50 dark:hover:border-teal-500 dark:hover:bg-teal-900/20 transition-colors px-3 py-2"
                    >
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">{d.subject}</div>
                      {d.issueType && (
                        <div className="mt-1 inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">{d.issueType}</div>
                      )}
                      {d.customerQuestions ? (
                        <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2">{d.customerQuestions}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={chatBoxRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/50">
        <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 py-1">
          <span className="bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full">
            Ticket created on {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}
          </span>
        </div>
        {ticket.description && (
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
              <p className="text-[10px] font-medium text-teal-600 dark:text-teal-400 mb-1">{ticket.customerName || 'Customer'} · Initial Description</p>
              <p className="text-xs text-slate-700 dark:text-slate-200">{ticket.description}</p>
              <p className="text-[9px] text-slate-400 mt-1">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ''}</p>
            </div>
          </div>
        )}
        {(ticket.messages || []).map((msg, i) => (
          <ChatBubble key={msg._id || i} msg={msg} currentRole={currentRole === 'customer' ? 'customer' : 'admin'} />
        ))}
      </div>

      {/* Input Area */}
      {ticket.status !== 'closed' ? (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
          {/* Attachment Preview */}
          {pendingAttachment && (
            <div className="px-3 pt-2">
              <div className="flex items-center gap-2">
                {pendingAttachment.type?.startsWith('image/') ? (
                  <img src={pendingAttachment.data} className="h-16 w-16 object-cover rounded-lg" alt="preview" />
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{pendingAttachment.name}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{pendingAttachment.name}</p>
                  <p className="text-[9px] text-slate-400">{formatFileSize(pendingAttachment.size)}</p>
                </div>
                <button onClick={removeAttachment} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 p-3">
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.csv" onChange={handleAttach} />
            <button onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0" title="Attach file">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={resizeTextarea}
              placeholder="Type a message or insert a draft..."
              disabled={sending}
              rows={2}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
            <button onClick={sendMessage} disabled={sending}
              className="p-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-full transition-colors flex-shrink-0" title="Send">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center flex-shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">This ticket is closed. No new messages can be sent.</p>
        </div>
      )}
    </div>
  );
}
