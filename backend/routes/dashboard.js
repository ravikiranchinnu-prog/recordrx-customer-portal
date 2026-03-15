const router = require('express').Router();
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (req.user.role === 'customer') {
      // Customer dashboard stats
      const myTickets = await Ticket.find({ customerId: req.user._id });
      const cust = await Customer.findOne({ email: req.user.email });
      let myBills = [];
      if (cust) myBills = await Bill.find({ customerId: cust._id });

      const totalPaid = myBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
      const totalDue = myBills.reduce((s, b) => s + (b.balanceDue || 0), 0);

      // Recent invoices (last 4)
      const recentInvoices = myBills
        .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
        .slice(0, 4)
        .map(b => ({ id: b.invoiceNumber, date: b.issueDate, amount: b.totalAmount, status: b.status }));

      // Plan info
      let plan = null, planType = '', offer = null;
      if (cust && cust.subscriptionPlan) {
        try {
          const Plan = require('../models/Plan');
          plan = await Plan.findById(cust.subscriptionPlan);
          planType = cust.billingCycle || 'monthly';
        } catch (e) {}
      }

      return res.json({
        totalInvoices: myBills.length,
        pendingInvoices: myBills.filter(b => ['pending', 'partial', 'overdue'].includes(b.status)).length,
        totalTickets: myTickets.length,
        openTickets: myTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
        totalDue,
        totalPaid,
        outstandingAmount: totalDue,
        recentInvoices,
        plan, planType, offer
      });
    }

    // ── Admin dashboard stats ──

    // Revenue chart: last 6 months of completed payments
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const revenueByMonth = await Payment.aggregate([
      { $match: { paymentDate: { $gte: sixMonthsAgo }, status: 'completed' } },
      { $group: { _id: { y: { $year: '$paymentDate' }, m: { $month: '$paymentDate' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const found = revenueByMonth.find(r => r._id.y === y && r._id.m === m);
      revenueChart.push({ label: monthNames[m - 1], value: found ? found.total : 0 });
    }

    const [
      totalCustomers, activeCustomers, totalBills, allBills,
      monthlyRevenue, monthlyPayments,
      totalTickets, openTickets, pendingTickets, inProgressTickets, closedTickets,
      totalUsers,
      monthlyPlanCount, yearlyPlanCount, totalPaidAmount
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'active' }),
      Bill.countDocuments(),
      Bill.find({}),
      Bill.aggregate([{ $match: { issueDate: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Payment.aggregate([{ $match: { paymentDate: { $gte: startOfMonth }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in-progress' }),
      Ticket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      User.countDocuments({ role: { $ne: 'customer' } }),
      Customer.countDocuments({ billingCycle: 'monthly' }),
      Customer.countDocuments({ billingCycle: 'yearly' }),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const pendingBills = allBills.filter(b => ['pending', 'partial'].includes(b.status));
    const overdueBills = allBills.filter(b => b.status === 'overdue');
    const paidBills = allBills.filter(b => b.status === 'paid');
    const totalInvoicedAmount = allBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalCollected = totalPaidAmount[0]?.total || 0;
    const collectionRate = totalInvoicedAmount > 0 ? Math.round((totalCollected / totalInvoicedAmount) * 100) : 0;

    // Donut chart data
    const donutData = { paid: paidBills.length, pending: pendingBills.length, overdue: overdueBills.length, total: allBills.length };

    res.json({
      totalCustomers, activeCustomers, totalBills,
      pendingAmount: pendingBills.reduce((s, b) => s + (b.balanceDue || 0), 0),
      overdueAmount: overdueBills.reduce((s, b) => s + (b.balanceDue || 0), 0),
      overdueCount: overdueBills.length,
      pendingCount: pendingBills.length,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      monthlyCollections: monthlyPayments[0]?.total || 0,
      totalRevenue: totalCollected,
      // Charts
      revenueChart,
      donutData,
      // Quick insights
      collectionRate,
      monthlyPlanCount, yearlyPlanCount,
      // Tickets
      openTickets, totalTickets, pendingTickets, inProgressTickets, closedTickets,
      // Users
      totalUsers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
