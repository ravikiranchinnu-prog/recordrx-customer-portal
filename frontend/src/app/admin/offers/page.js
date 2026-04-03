'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import DateRangePicker from '@/components/DateRangePicker';

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formData, setFormData] = useState({
    name: '', discountPercent: 0, discountAmount: 0,
    validFrom: '', validUntil: '', applicablePlans: [], applicableCustomers: [], status: 'active'
  });
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [offersData, plansData, custData] = await Promise.all([api.getOffers(), api.getPlans(), api.getCustomers()]);
      setOffers(offersData || []);
      setPlans((plansData || []).filter(p => p.status === 'active'));
      setCustomers((custData.customers || custData || []).filter(c => c.status === 'active'));
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setFormData({ name: '', discountPercent: 0, discountAmount: 0, validFrom: '', validUntil: '', applicablePlans: [], applicableCustomers: [], status: 'active' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateOffer(editingId, formData);
        showToast('Offer updated!', 'success');
      } else {
        await api.createOffer(formData);
        showToast('Offer created!', 'success');
      }
      resetForm();
      loadData();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const editOffer = (offer) => {
    setFormData({
      name: offer.name,
      discountPercent: offer.discountPercent || 0, discountAmount: offer.discountAmount || 0,
      validFrom: offer.validFrom ? offer.validFrom.split('T')[0] : '',
      validUntil: offer.validUntil ? offer.validUntil.split('T')[0] : '',
      applicablePlans: offer.applicablePlans || [],
      applicableCustomers: (offer.applicableCustomers || []).map(c => typeof c === 'object' ? c._id : c),
      status: offer.status
    });
    setEditingId(offer._id);
    setShowForm(true);
  };

  const deleteOffer = async (id) => {
    if (!confirm('Delete this offer?')) return;
    try { await api.deleteOffer(id); showToast('Offer deleted', 'success'); loadData(); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const toggleCustomer = (custId) => {
    setFormData(prev => ({
      ...prev,
      applicableCustomers: prev.applicableCustomers.includes(custId)
        ? prev.applicableCustomers.filter(c => c !== custId)
        : [...prev.applicableCustomers, custId]
    }));
  };

  const statusBadge = (s) => {
    const c = { active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c[s] || ''}`}>{s?.toUpperCase()}</span>;
  };

  const filteredOffers = offers.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchTerm && !o.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (dateFrom && o.validFrom && new Date(o.validFrom) < new Date(dateFrom)) return false;
    if (dateTo && o.validUntil && new Date(o.validUntil) > new Date(dateTo + 'T23:59:59.999')) return false;
    return true;
  });

  const isExpired = (o) => o.validUntil && new Date(o.validUntil) < new Date();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Offers</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{offers.length}</p>
          </div>
        </div>
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
            <p className="text-xl font-bold text-green-600">{offers.filter(o => o.status === 'active' && !isExpired(o)).length}</p>
          </div>
        </div>
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Expired</p>
            <p className="text-xl font-bold text-amber-600">{offers.filter(o => isExpired(o)).length}</p>
          </div>
        </div>
        <div className="dashboard-card hover-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Inactive</p>
            <p className="text-xl font-bold text-slate-500">{offers.filter(o => o.status === 'inactive').length}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
        <input type="text" placeholder="Search offers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-48 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <div className="flex-1"></div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg">+ New Offer</button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{editingId ? 'Edit' : 'Create'} Offer</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Offer Name</label>
              <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Plan</label>
              <select value={formData.applicablePlans[0] || ''} onChange={e => setFormData({ ...formData, applicablePlans: e.target.value ? [e.target.value] : [] })} required
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <option value="">Select Plan</option>
                {plans.map(plan => (
                  <option key={plan._id} value={plan.name}>{plan.name} — ₹{plan.monthlyPrice}/mo</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Discount % (percentage off)</label>
              <input type="number" min="0" max="100" value={formData.discountPercent} onChange={e => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Discount ₹ (flat amount off)</label>
              <input type="number" min="0" value={formData.discountAmount} onChange={e => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Valid From</label>
              <input type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Valid Until</label>
              <input type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Customer</label>
              <select onChange={e => { if (e.target.value && !formData.applicableCustomers.includes(e.target.value)) toggleCustomer(e.target.value); e.target.value = ''; }}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <option value="">Select Customer</option>
                {customers.filter(c => !formData.applicableCustomers.includes(c._id)).map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.customerId})</option>
                ))}
              </select>
              {formData.applicableCustomers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.applicableCustomers.map(cid => {
                    const cust = customers.find(c => c._id === cid);
                    return (
                      <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 rounded-full text-[11px]">
                        {cust ? cust.name : cid}
                        <button type="button" onClick={() => toggleCustomer(cid)} className="hover:text-red-500">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Offers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Offer</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Plan</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Discount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valid From</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valid Until</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOffers.length === 0 ? <tr><td colSpan="8" className="text-center py-8 text-slate-400">No offers found</td></tr> :
              filteredOffers.map(offer => (
                <tr key={offer._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{offer.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(offer.applicablePlans || []).length === 0 ? <span className="text-slate-400 text-xs">All Plans</span> :
                        offer.applicablePlans.map((p, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px]">{p}</span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(offer.applicableCustomers || []).length === 0 ? <span className="text-slate-400 text-xs">All</span> :
                        offer.applicableCustomers.map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded text-[10px]">{typeof c === 'object' ? c.name : c}</span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {offer.discountPercent > 0 && <span className="text-teal-600 font-semibold">{offer.discountPercent}% off</span>}
                    {offer.discountPercent > 0 && offer.discountAmount > 0 && <span className="text-slate-400 mx-1">+</span>}
                    {offer.discountAmount > 0 && <span className="text-teal-600 font-semibold">₹{offer.discountAmount} off</span>}
                    {!offer.discountPercent && !offer.discountAmount && <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{offer.validFrom ? new Date(offer.validFrom).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {offer.validUntil ? (
                      <span className={isExpired(offer) ? 'text-red-500' : 'text-slate-500'}>{new Date(offer.validUntil).toLocaleDateString()}{isExpired(offer) && ' (expired)'}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(offer.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => editOffer(offer)} className="text-teal-600 hover:text-teal-700 text-xs font-medium">Edit</button>
                      <button onClick={() => deleteOffer(offer._id)} className="text-red-600 hover:text-red-700 text-xs font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
