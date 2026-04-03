'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function CustomerMgmtPage() {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', plan: '', planType: 'monthly', offer: '', offerMonths: 0, password: '' });
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [custData, planData, offerData] = await Promise.all([api.getMgmtCustomers(), api.getPlans(), api.getOffers()]);
      setCustomers(custData || []);
      setPlans(planData || []);
      setOffers(offerData || []);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setEditingId(null); setForm({ name: '', email: '', phone: '', company: '', address: '', plan: '', planType: 'monthly', offer: '', offerMonths: 0, password: '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!editingId && !payload.password) { showToast('Password is required', 'error'); return; }
      if (!payload.plan) delete payload.plan;
      if (!payload.offer) { delete payload.offer; delete payload.offerMonths; }
      if (editingId) {
        delete payload.password; // can't update password from here
        await api.updateMgmtCustomer(editingId, payload);
        showToast('Customer updated', 'success');
      } else {
        await api.createMgmtCustomer(payload);
        showToast('Customer created', 'success');
      }
      setShowForm(false); loadData();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try { await api.deleteMgmtCustomer(id); showToast('Customer deleted', 'success'); loadData(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">Customer Management</h1><p className="text-sm text-slate-500">Managed customer accounts (portal users)</p></div>
        <button onClick={openAdd} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">+ Add Customer</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{editingId ? 'Edit' : 'Add'} Customer</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name</label><input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Company</label><input value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Address</label><input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Full address" className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>
            {!editingId && <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password</label><input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" /></div>}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Plan</label>
              <select value={form.plan} onChange={(e) => {
                const selectedPlan = plans.find(p => p._id === e.target.value);
                setForm({...form, plan: e.target.value, planType: selectedPlan?.planType || 'monthly'});
              }} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="">No Plan</option>
                {plans.filter(p => p.status === 'active').map(p => <option key={p._id} value={p._id}>{p.name} ({p.planType}) - ₹{p.price}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Offer</label>
              <select value={form.offer} onChange={(e) => setForm({...form, offer: e.target.value, offerMonths: e.target.value ? form.offerMonths || 1 : 0})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <option value="">No Offer</option>
                {offers.filter(o => o.status === 'active').map(o => <option key={o._id} value={o._id}>{o.name} ({o.discountPercent > 0 ? `${o.discountPercent}% off` : `₹${o.discountAmount} off`})</option>)}
              </select>
            </div>
            {form.offer && (
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Offer Months</label>
                <input type="number" min="1" value={form.offerMonths} onChange={(e) => setForm({...form, offerMonths: parseInt(e.target.value) || 1})} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" placeholder="e.g., 2" />
                <p className="text-[11px] text-slate-400 mt-1">Offer applies from next month for this many months</p>
              </div>
            )}
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
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Plan</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {customers.length === 0 ? <tr><td colSpan="6" className="text-center py-8 text-slate-400">No managed customers</td></tr> :
              customers.map(c => (
                <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-teal-600">{c.customerId}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email}</td>
                  <td className="px-4 py-3 text-slate-500">{c.company || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.plan?.name || 'None'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => { setEditingId(c._id); setForm({ name: c.name, email: c.email, phone: c.phone || '', company: c.company || '', address: c.address || '', plan: c.plan?._id || c.plan || '', planType: c.planType || 'monthly', offer: c.offer?._id || c.offer || '', offerMonths: c.offerMonths || 0, password: '' }); setShowForm(true); }} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</button>
                    <button onClick={() => handleDelete(c._id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
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
