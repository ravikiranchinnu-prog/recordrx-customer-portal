'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', gstin: '', billingCycle: 'monthly', subscriptionPlan: 'basic', subscriptionAmount: 0, status: 'active', street: '', city: '', state: '', zipCode: '' });
  const { showToast } = useToast();

  // Generate Bill modal state
  const [billModal, setBillModal] = useState(null); // customer object or null
  const [billForm, setBillForm] = useState({ description: '', quantity: 1, unitPrice: 0, taxRate: 18, dueDate: '', notes: '' });
  const [generating, setGenerating] = useState(false);

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data.customers || []);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCustomers(); }, []);

  const openAdd = () => { setEditingId(null); setForm({ name: '', email: '', phone: '', gstin: '', billingCycle: 'monthly', subscriptionPlan: 'basic', subscriptionAmount: 0, status: 'active', street: '', city: '', state: '', zipCode: '' }); setShowForm(true); };
  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({ name: c.name, email: c.email, phone: c.phone, gstin: c.gstin || '', billingCycle: c.billingCycle, subscriptionPlan: c.subscriptionPlan, subscriptionAmount: c.subscriptionAmount, status: c.status, street: c.address?.street || '', city: c.address?.city || '', state: c.address?.state || '', zipCode: c.address?.zipCode || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name: form.name, email: form.email, phone: form.phone, gstin: form.gstin, billingCycle: form.billingCycle, subscriptionPlan: form.subscriptionPlan, subscriptionAmount: Number(form.subscriptionAmount), status: form.status, address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode } };
    try {
      if (editingId) { await api.updateCustomer(editingId, payload); showToast('Customer updated', 'success'); }
      else { await api.createCustomer(payload); showToast('Customer created', 'success'); }
      setShowForm(false); loadCustomers();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try { await api.deleteCustomer(id); showToast('Customer deleted', 'success'); loadCustomers(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const openBillModal = (customer) => {
    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + 15);
    setBillModal(customer);
    setBillForm({
      description: `${customer.subscriptionPlan?.charAt(0).toUpperCase() + customer.subscriptionPlan?.slice(1)} Plan - ${customer.billingCycle?.charAt(0).toUpperCase() + customer.billingCycle?.slice(1)} Subscription`,
      quantity: 1,
      unitPrice: customer.subscriptionAmount || 0,
      taxRate: 18,
      dueDate: due.toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const today = new Date();
      const endDate = new Date(today);
      if (billModal.billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
      else if (billModal.billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
      else endDate.setMonth(endDate.getMonth() + 1);

      const result = await api.generateBill({
        customerId: billModal._id,
        items: [{ description: billForm.description, quantity: Number(billForm.quantity), unitPrice: Number(billForm.unitPrice), taxRate: Number(billForm.taxRate) }],
        billingPeriodStart: today.toISOString().split('T')[0],
        billingPeriodEnd: endDate.toISOString().split('T')[0],
        dueDate: billForm.dueDate,
        notes: billForm.notes
      });

      const emailMsg = result.emailSent ? ' Invoice emailed to customer.' : ' (Email not configured — invoice not sent)';
      showToast(`Bill ${result.invoiceNumber} generated!${emailMsg}`, 'success');
      setBillModal(null);
      loadCustomers();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setGenerating(false); }
  };

  const statusBadge = (s) => {
    const c = { active: 'bg-green-100 text-green-700', inactive: 'bg-slate-100 text-slate-600', suspended: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c[s] || ''}`}>{s?.toUpperCase()}</span>;
  };

  const [searchTerm, setSearchTerm] = useState('');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  const filteredCustomers = customers.filter(c => {
    if (searchTerm && !c.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !c.email?.toLowerCase().includes(searchTerm.toLowerCase()) && !c.customerId?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="flex items-center justify-between">
        <div></div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg">+ Add Customer</button>
      </div>

      {/* Stats Cards — matching admin.html: Text LEFT, Icon RIGHT, flat bg */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Customers</p>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{customers.length}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Monthly Plans</p>
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-teal-600">{customers.filter(c => c.billingCycle === 'monthly').length}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Yearly Plans</p>
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-cyan-600">{customers.filter(c => c.billingCycle === 'yearly').length}</p>
        </div>
        <div className="hover-card bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-xl font-bold text-green-600">{customers.filter(c => c.status === 'active').length}</p>
        </div>
      </div>

      {/* Search */}
      <input type="text" placeholder="Search customers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        className="w-64 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />

      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{editingId ? 'Edit' : 'Add'} Customer</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Name', key: 'name', required: true },
              { label: 'Email', key: 'email', type: 'email', required: true },
              { label: 'Phone', key: 'phone', required: true },
              { label: 'GSTIN', key: 'gstin' },
              { label: 'Street', key: 'street' },
              { label: 'City', key: 'city' },
              { label: 'State', key: 'state' },
              { label: 'Zip Code', key: 'zipCode' },
              { label: 'Subscription Amount (₹)', key: 'subscriptionAmount', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Billing Cycle</label>
              <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Plan</label>
              <select value={form.subscriptionPlan} onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="basic">Basic</option><option value="standard">Standard</option><option value="premium">Premium</option><option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
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
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Plan</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCustomers.length === 0 ? <tr><td colSpan="6" className="text-center py-8 text-slate-400">No customers found</td></tr> :
              filteredCustomers.map(c => (
                <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-teal-600">{c.customerId}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">{c.subscriptionPlan}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openBillModal(c)} className="text-green-600 hover:text-green-700 text-xs font-medium">Generate Bill</button>
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</button>
                    <button onClick={() => handleDelete(c._id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table></div>
      </div>

      {/* Generate Bill Modal */}
      {billModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setBillModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-lg shadow-xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Generate Bill</h2>
                <p className="text-xs text-slate-500">For: <span className="font-medium text-teal-600">{billModal.name}</span> ({billModal.customerId})</p>
              </div>
              <button onClick={() => setBillModal(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleGenerateBill} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
                <input value={billForm.description} onChange={(e) => setBillForm({...billForm, description: e.target.value})} required
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Qty</label>
                  <input type="number" min="1" value={billForm.quantity} onChange={(e) => setBillForm({...billForm, quantity: e.target.value})} required
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Unit Price (₹)</label>
                  <input type="number" min="0" value={billForm.unitPrice} onChange={(e) => setBillForm({...billForm, unitPrice: e.target.value})} required
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tax %</label>
                  <input type="number" min="0" value={billForm.taxRate} onChange={(e) => setBillForm({...billForm, taxRate: e.target.value})}
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Due Date</label>
                  <input type="date" value={billForm.dueDate} onChange={(e) => setBillForm({...billForm, dueDate: e.target.value})} required
                    className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                </div>
                <div className="flex items-end">
                  <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500">Estimated Total</p>
                    <p className="text-lg font-bold text-teal-600">₹{((billForm.quantity * billForm.unitPrice) * (1 + billForm.taxRate / 100)).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes (optional)</label>
                <input value={billForm.notes} onChange={(e) => setBillForm({...billForm, notes: e.target.value})}
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={generating} className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
                  {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Generating...</> : <>Generate & Email Invoice</>}
                </button>
                <button type="button" onClick={() => setBillModal(null)} className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
