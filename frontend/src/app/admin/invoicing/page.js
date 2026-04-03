'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import DateRangePicker from '@/components/DateRangePicker';

export default function InvoicingPage() {
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [form, setForm] = useState({ customerId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 18, billingPeriodStart: '', billingPeriodEnd: '', dueDate: '', notes: '' });
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);
      const queryStr = params.toString();
      const [billsData, custData] = await Promise.all([api.getBills(queryStr), api.getCustomers()]);
      setBills(billsData.bills || []);
      setSummary(billsData.summary || {});
      setCustomers(custData.customers || []);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [dateFrom, dateTo]);

  const generateBill = async (e) => {
    e.preventDefault();
    try {
      await api.generateBill({
        customerId: form.customerId,
        items: [{ description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), taxRate: Number(form.taxRate) }],
        billingPeriodStart: form.billingPeriodStart,
        billingPeriodEnd: form.billingPeriodEnd,
        dueDate: form.dueDate,
        notes: form.notes
      });
      showToast('Bill generated successfully!', 'success');
      setShowGenerate(false);
      setForm({ customerId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 18, billingPeriodStart: '', billingPeriodEnd: '', dueDate: '', notes: '' });
      loadData();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const downloadInvoice = async (id) => {
    try {
      const blob = await api.downloadInvoicePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `invoice.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Transaction details modal state
  const [viewBill, setViewBill] = useState(null);
  const [billPayments, setBillPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const viewTransactionDetails = async (bill) => {
    setViewBill(bill);
    setLoadingPayments(true);
    try {
      const data = await api.getPayments(`billId=${bill._id}`);
      setBillPayments(data.payments || []);
    } catch (err) { showToast(err.message, 'error'); setBillPayments([]); }
    finally { setLoadingPayments(false); }
  };

  const formatPaymentMethod = (m) => {
    const map = { upi: 'UPI', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card', debit_card: 'Debit Card', online: 'Net Banking', cheque: 'Cheque', cash: 'Cash', other: 'Other' };
    return map[m] || m;
  };

  const statusBadge = (status) => {
    const colors = { draft: 'bg-slate-100 text-slate-600', pending: 'bg-amber-100 text-amber-700', partial: 'bg-blue-100 text-blue-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-slate-200 text-slate-500' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || ''}`}>{status?.toUpperCase()}</span>;
  };

  const filteredBills = bills.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchTerm && !b.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) && !b.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex items-center justify-between">
        <div></div>
        <button onClick={() => setShowGenerate(!showGenerate)} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors">
          + Generate Bill
        </button>
      </div>

      {/* Summary Cards — matching admin.html: Text LEFT, Icon RIGHT, flat bg */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Outstanding</p>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">₹{(summary.totalAmount - (summary.paidAmount || 0) || 0).toLocaleString()}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Collected This Month</p>
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">₹{(summary.paidAmount || 0).toLocaleString()}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Pending Invoices</p>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.pendingCount || 0}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Overdue</p>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.overdueCount || 0}</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          <option value="all">All Status</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
        </select>
        <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-48 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
      </div>

      {/* Generate Bill Form */}
      {showGenerate && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Generate New Bill</h2>
          <form onSubmit={generateBill} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Customer</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <option value="">Select customer</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.customerId})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Quantity</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} min="1" required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Unit Price (₹)</label>
              <input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} min="0" required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Billing Period Start</label>
              <input type="date" value={form.billingPeriodStart} onChange={(e) => setForm({ ...form, billingPeriodStart: e.target.value })} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Billing Period End</label>
              <input type="date" value={form.billingPeriodEnd} onChange={(e) => setForm({ ...form, billingPeriodEnd: e.target.value })} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tax Rate (%)</label>
              <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} min="0"
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button type="submit" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">Generate</button>
              <button type="button" onClick={() => setShowGenerate(false)} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">GST</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-400">No bills found</td></tr>
              ) : filteredBills.map(bill => (
                <tr key={bill._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-teal-600">{bill.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{bill.customerName}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">₹{(bill.subtotal || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">₹{(bill.taxAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">₹{bill.totalAmount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {statusBadge(bill.status)}
                      {(bill.status === 'paid' || bill.status === 'partial') && (
                        <button onClick={() => viewTransactionDetails(bill)} title="View transaction details" className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <svg className="w-3.5 h-3.5 text-slate-500 hover:text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => downloadInvoice(bill._id)} className="text-teal-600 hover:text-teal-700 text-xs font-medium">
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Transaction Details Modal */}
      {viewBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setViewBill(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-lg shadow-xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Transaction Details</h2>
                <p className="text-xs text-slate-500">Invoice: <span className="font-medium text-teal-600">{viewBill.invoiceNumber}</span> &middot; {viewBill.customerName}</p>
              </div>
              <button onClick={() => setViewBill(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="text-slate-500">Total Amount</p><p className="font-bold text-slate-800 dark:text-white text-sm">₹{viewBill.totalAmount?.toLocaleString()}</p></div>
                <div><p className="text-slate-500">Paid</p><p className="font-bold text-green-600 text-sm">₹{(viewBill.paidAmount || 0).toLocaleString()}</p></div>
                <div><p className="text-slate-500">Balance Due</p><p className="font-bold text-amber-600 text-sm">₹{((viewBill.totalAmount || 0) - (viewBill.paidAmount || 0)).toLocaleString()}</p></div>
              </div>
            </div>

            {/* Payment Records */}
            {loadingPayments ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div></div>
            ) : billPayments.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">No payment records found for this invoice.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {billPayments.map((pay, idx) => (
                  <div key={pay._id || idx} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-teal-600">{pay.paymentId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        pay.status === 'completed' ? 'bg-green-100 text-green-700' :
                        pay.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        pay.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{pay.status?.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-slate-500">Amount:</span> <span className="font-semibold text-slate-800 dark:text-white">₹{pay.amount?.toLocaleString()}</span></div>
                      <div><span className="text-slate-500">Method:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{formatPaymentMethod(pay.paymentMethod)}</span></div>
                      <div><span className="text-slate-500">Date:</span> <span className="text-slate-700 dark:text-slate-300">{pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span></div>
                      {pay.transactionId && <div><span className="text-slate-500">Txn ID:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{pay.transactionId}</span></div>}
                      {pay.referenceNumber && <div><span className="text-slate-500">Ref #:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{pay.referenceNumber}</span></div>}
                      {pay.bankName && <div><span className="text-slate-500">Bank:</span> <span className="text-slate-700 dark:text-slate-300">{pay.bankName}</span></div>}
                      {pay.chequeNumber && <div><span className="text-slate-500">Cheque #:</span> <span className="text-slate-700 dark:text-slate-300">{pay.chequeNumber}</span></div>}
                      {pay.notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span className="text-slate-700 dark:text-slate-300">{pay.notes}</span></div>}
                    </div>
                    {/* Reconciliation info (admin only) */}
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">Reconciliation:</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                        pay.reconciliationStatus === 'matched' ? 'bg-green-100 text-green-700' :
                        pay.reconciliationStatus === 'unmatched' ? 'bg-red-100 text-red-700' :
                        pay.reconciliationStatus === 'disputed' ? 'bg-amber-100 text-amber-700' :
                        pay.reconciliationStatus === 'resolved' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{pay.reconciliationStatus?.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-[10px] text-slate-400 italic">Transaction details are auto-captured from Razorpay. Manual payments show customer-entered details.</p>
          </div>
        </div>
      )}
    </div>
  );
}
