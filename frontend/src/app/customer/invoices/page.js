'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function CustomerInvoices() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Pay Now modal state
  const [payBill, setPayBill] = useState(null);
  const [payForm, setPayForm] = useState({ amount: 0, paymentMethod: 'upi', transactionId: '', referenceNumber: '', notes: '' });
  const [paying, setPaying] = useState(false);
  const [payMode, setPayMode] = useState('online'); // 'online' (Razorpay) or 'manual'

  const loadBills = () => {
    api.getBills()
      .then(data => setBills(data.bills || []))
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBills(); }, []);

  const downloadInvoice = async (id) => {
    try {
      const blob = await api.downloadInvoicePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'invoice.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const openPayModal = (bill) => {
    setPayBill(bill);
    setPayMode('online');
    setPayForm({
      amount: bill.balanceDue || (bill.totalAmount - (bill.paidAmount || 0)),
      paymentMethod: 'upi',
      transactionId: '',
      referenceNumber: '',
      notes: ''
    });
  };

  // Razorpay online payment
  const handleRazorpayPay = async () => {
    setPaying(true);
    try {
      // 1. Get Razorpay key
      const { key } = await api.getRazorpayKey();
      // 2. Create order on backend
      const order = await api.createRazorpayOrder({ billId: payBill._id, amount: Number(payForm.amount) });
      // 3. Open Razorpay checkout popup
      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'Radix',
        description: `Invoice: ${order.invoiceNumber}`,
        order_id: order.orderId,
        prefill: {
          name: order.customerName || '',
          email: order.customerEmail || ''
        },
        theme: { color: '#0d9488' },
        handler: async function (response) {
          // 4. Verify payment on backend
          try {
            const result = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              billId: payBill._id,
              amount: Number(payForm.amount),
              notes: payForm.notes
            });
            const emailMsg = result.emailSent ? ' Confirmation emailed.' : '';
            showToast(result.message + emailMsg, 'success');
            setPayBill(null);
            loadBills();
          } catch (err) {
            showToast('Payment verification failed: ' + err.message, 'error');
          }
          setPaying(false);
        },
        modal: {
          ondismiss: function () { setPaying(false); }
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        showToast(`Payment failed: ${response.error.description}`, 'error');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      showToast(err.message, 'error');
      setPaying(false);
    }
  };

  // Manual payment recording (existing flow)
  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      const result = await api.createPayment({
        billId: payBill._id,
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        transactionId: payForm.transactionId,
        referenceNumber: payForm.referenceNumber,
        notes: payForm.notes
      });
      const emailMsg = result.emailSent ? ' Confirmation emailed.' : '';
      showToast(`Payment of ₹${Number(payForm.amount).toLocaleString()} recorded!${emailMsg}`, 'success');
      setPayBill(null);
      loadBills();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setPaying(false); }
  };

  const statusBadge = (status) => {
    const colors = { draft: 'bg-slate-100 text-slate-600', pending: 'bg-amber-100 text-amber-700', partial: 'bg-blue-100 text-blue-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-slate-200 text-slate-500' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || ''}`}>{status?.toUpperCase()}</span>;
  };

  const [statusFilter, setStatusFilter] = useState('all');

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  const totalInvoiced = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + (b.paidAmount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const overdueCount = bills.filter(b => b.status === 'overdue').length;
  const filteredBills = statusFilter === 'all' ? bills : bills.filter(b => b.status === statusFilter);

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Summary Cards — matching customer.html: Text LEFT, Icon RIGHT, flat bg, hover-card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Invoiced</p>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">₹{totalInvoiced.toLocaleString()}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Paid</p>
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">₹{outstanding.toLocaleString()}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Overdue</p>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{overdueCount}</p>
        </div>
      </div>

      {/* Status Filter */}
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
        <option value="all">All Status</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="overdue">Overdue</option>
      </select>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bill #</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Paid</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredBills.length === 0 ? <tr><td colSpan="7" className="text-center py-8 text-slate-400">No invoices found</td></tr> :
              filteredBills.map(bill => {
                const balance = (bill.totalAmount || 0) - (bill.paidAmount || 0);
                return (
                  <tr key={bill._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-teal-600">{bill.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{bill.billNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">₹{bill.totalAmount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">₹{(bill.paidAmount || 0).toLocaleString()}</td>
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
                      <div className="flex gap-2">
                        <button onClick={() => downloadInvoice(bill._id)} className="text-teal-600 hover:text-teal-700 text-xs font-medium">Download</button>
                        {balance > 0 && bill.status !== 'cancelled' && (
                          <button onClick={() => openPayModal(bill)} className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors">
                            Pay Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table></div>
      </div>

      {/* Transaction Details Modal */}
      {viewBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setViewBill(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-lg shadow-xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Transaction Details</h2>
                <p className="text-xs text-slate-500">Invoice: <span className="font-medium text-teal-600">{viewBill.invoiceNumber}</span></p>
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
                      {pay.notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span className="text-slate-700 dark:text-slate-300">{pay.notes}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-[10px] text-slate-400 italic">Transaction details are auto-captured from the payment gateway.</p>
          </div>
        </div>
      )}

      {/* Pay Now Modal — Dual mode: Online (Razorpay) or Manual */}
      {payBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPayBill(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Make Payment</h2>
              <button onClick={() => setPayBill(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Invoice: <span className="font-medium text-teal-600">{payBill.invoiceNumber}</span></p>

            {/* Invoice Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="text-slate-500">Total</p><p className="font-bold text-slate-800 dark:text-white text-sm">₹{payBill.totalAmount?.toLocaleString()}</p></div>
                <div><p className="text-slate-500">Paid</p><p className="font-bold text-green-600 text-sm">₹{(payBill.paidAmount || 0).toLocaleString()}</p></div>
                <div><p className="text-slate-500">Due</p><p className="font-bold text-amber-600 text-sm">₹{((payBill.totalAmount || 0) - (payBill.paidAmount || 0)).toLocaleString()}</p></div>
              </div>
            </div>

            {/* Payment Mode Toggle */}
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
              <button type="button" onClick={() => setPayMode('online')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${payMode === 'online' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  Pay Online
                </span>
              </button>
              <button type="button" onClick={() => setPayMode('manual')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${payMode === 'manual' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Record Manual
                </span>
              </button>
            </div>

            {/* Amount Input (shared) */}
            <div className="mb-3">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Amount (₹)</label>
              <input type="number" min="1" max={(payBill.totalAmount || 0) - (payBill.paidAmount || 0)} step="0.01" value={payForm.amount} onChange={(e) => setPayForm({...payForm, amount: e.target.value})} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-lg" />
            </div>

            {payMode === 'online' ? (
              /* ====== ONLINE PAY (RAZORPAY) ====== */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes (optional)</label>
                  <input value={payForm.notes} onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                </div>
                <p className="text-[10px] text-slate-400">You'll be shown a secure Razorpay payment popup. Choose UPI, Card, Net Banking, or Wallet — all within this page.</p>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={handleRazorpayPay} disabled={paying || Number(payForm.amount) <= 0}
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
                    {paying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Processing...</> : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>Pay ₹{Number(payForm.amount).toLocaleString()} Securely</>
                    )}
                  </button>
                  <button type="button" onClick={() => setPayBill(null)} className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              /* ====== MANUAL PAYMENT ====== */
              <form onSubmit={handlePay} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Payment Method</label>
                  <select value={payForm.paymentMethod} onChange={(e) => setPayForm({...payForm, paymentMethod: e.target.value})} required
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="online">Net Banking</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Transaction ID</label>
                    <input value={payForm.transactionId} onChange={(e) => setPayForm({...payForm, transactionId: e.target.value})} placeholder="e.g. UTR number"
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Reference #</label>
                    <input value={payForm.referenceNumber} onChange={(e) => setPayForm({...payForm, referenceNumber: e.target.value})}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes (optional)</label>
                  <input value={payForm.notes} onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                </div>
                <p className="text-[10px] text-slate-400">Record a payment made outside this portal (bank transfer, cash, cheque, etc.)</p>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={paying} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
                    {paying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Processing...</> : <>Confirm Payment</>}
                  </button>
                  <button type="button" onClick={() => setPayBill(null)} className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
