const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  constructor() {
    // Normalize base: remove trailing slash and fix accidental double `/api/api`
    this.base = (API_BASE || '').replace(/\/$/, '').replace(/\/api\/api\//, '/api/');
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('recordrx_token');
    }
    return null;
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = `${this.base}${endpoint}`;
    // Debug: log URL and method
    if (typeof window !== 'undefined') console.debug('API request', options.method || 'GET', url);
    const res = await fetch(url, { ...options, headers });
    if (typeof window !== 'undefined') console.debug('API response', res.status, url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  get(endpoint) { return this.request(endpoint); }
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
  del(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }

  // Auth
  login(email, password) { return this.post('/auth/login', { email, password }); }
  getMe() { return this.get('/auth/me'); }
  changePassword(data) { return this.put('/auth/change-password', data); }

  // Dashboard
  getDashboardStats(params = '') { return this.get(`/dashboard/stats${params ? '?' + params : ''}`); }

  // Users
  getUsers() { return this.get('/users'); }
  createUser(data) { return this.post('/users', data); }
  updateUser(id, data) { return this.put(`/users/${id}`, data); }
  deleteUser(id) { return this.del(`/users/${id}`); }
  getMgmtCustomers() { return this.get('/users/customers'); }
  createMgmtCustomer(data) { return this.post('/users/customers', data); }
  updateMgmtCustomer(id, data) { return this.put(`/users/customers/${id}`, data); }
  deleteMgmtCustomer(id) { return this.del(`/users/customers/${id}`); }

  // Billing Customers
  getCustomers(params = '') { return this.get(`/customers${params ? '?' + params : ''}`); }
  createCustomer(data) { return this.post('/customers', data); }
  updateCustomer(id, data) { return this.put(`/customers/${id}`, data); }
  deleteCustomer(id) { return this.del(`/customers/${id}`); }

  // Bills / Invoices
  getBills(params = '') { return this.get(`/bills${params ? '?' + params : ''}`); }
  generateBill(data) { return this.post('/bills/generate', data); }
  getBill(id) { return this.get(`/bills/${id}`); }
  downloadInvoicePdf(id) {
    const token = this.getToken();
    return fetch(`${this.base}/bills/${id}/invoice`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.blob());
  }

  // Payments
  getPayments(params = '') { return this.get(`/payments${params ? '?' + params : ''}`); }
  createPayment(data) { return this.post('/payments', data); }
  reconcilePayment(id, data) { return this.put(`/payments/${id}/reconcile`, data); }

  // Razorpay
  getRazorpayKey() { return this.get('/razorpay/key'); }
  createRazorpayOrder(data) { return this.post('/razorpay/create-order', data); }
  verifyRazorpayPayment(data) { return this.post('/razorpay/verify-payment', data); }

  // Tickets
  getTickets(params = '') { return this.get(`/tickets${params ? '?' + params : ''}`); }
  createTicket(data) { return this.post('/tickets', data); }
  getTicket(id) { return this.get(`/tickets/${id}`); }
  updateTicketStatus(id, status) { return this.put(`/tickets/${id}/status`, { status }); }
  sendMessage(ticketId, data) { return this.post(`/tickets/${ticketId}/messages`, data); }
  deleteTicket(id) { return this.del(`/tickets/${id}`); }

  // Plans & Offers
  getPlans() { return this.get('/plans'); }
  createPlan(data) { return this.post('/plans', data); }
  updatePlan(id, data) { return this.put(`/plans/${id}`, data); }
  deletePlan(id) { return this.del(`/plans/${id}`); }
  getOffers() { return this.get('/offers'); }
  createOffer(data) { return this.post('/offers', data); }
  updateOffer(id, data) { return this.put(`/offers/${id}`, data); }
  deleteOffer(id) { return this.del(`/offers/${id}`); }

  // Config
  getInvoicingConfig() { return this.get('/config/invoicing'); }
  updateInvoicingConfig(data) { return this.put('/config/invoicing', data); }

  // Email
  getEmailConfig() { return this.get('/email/config'); }
  testEmailConnection() { return this.get('/email/test-connection'); }
  sendTestEmail(to) { return this.post('/email/send-test', { to }); }
  sendInvoiceEmail(to, invoiceData) { return this.post('/email/send-invoice', { to, invoiceData }); }
  async getEmailDrafts() {
    // Prefer same-origin Next API route, then fall back to backend URL if provided.
    try {
      if (typeof window !== 'undefined') console.debug('Trying local drafts API', '/api/email/drafts');
      return await this.get('/email/drafts');
    } catch (err) {
      if (typeof window !== 'undefined') console.debug('Local drafts API failed', err.message);
    }

    const backend = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    if (!backend) throw new Error('Unable to load email drafts from backend or proxied path');
    const urlBackend = `${backend}/api/email/drafts`;
    try {
      if (typeof window !== 'undefined') console.debug('Falling back to backend drafts URL', urlBackend);
      const token = this.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(urlBackend, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return res.json();
    } catch (err) {
      if (typeof window !== 'undefined') console.debug('Backend drafts fetch failed', err.message);
      throw new Error('Unable to load email drafts from backend or proxied path');
    }
  }
  sendDraft(draftId, to, templateData = {}) { return this.post('/email/send-draft', { draftId, to, templateData }); }
  sendMonthlyReport(year, month) { return this.post('/email/send-monthly-report', { year, month }); }

  // Notifications
  getNotifications() { return this.get('/notifications'); }
  markNotificationRead(key) { return this.put(`/notifications/${encodeURIComponent(key)}/read`); }
  markAllNotificationsRead(keys) { return this.put('/notifications/read-all', { keys }); }
}

const api = new ApiClient();
export default api;
