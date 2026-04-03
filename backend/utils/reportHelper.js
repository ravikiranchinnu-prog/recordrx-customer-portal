const { createTransporter, getFromAddress } = require('./emailHelper');

/**
 * Generate and send monthly report via email.
 * Aggregates billing, payments, customers, and tickets for the given month.
 */
const generateAndSendMonthlyReport = async (targetYear, targetMonth) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('[Report] Skipped: EMAIL_USER / EMAIL_PASSWORD not configured');
    return { sent: false, reason: 'not_configured' };
  }

  const recipients = [process.env.ADMIN_EMAIL, process.env.REPORT_RECEIVER_EMAIL].filter(Boolean);
  if (recipients.length === 0) {
    console.log('[Report] Skipped: No recipient emails configured');
    return { sent: false, reason: 'no_recipients' };
  }

  const Bill = require('../models/Bill');
  const Payment = require('../models/Payment');
  const Customer = require('../models/Customer');
  const Ticket = require('../models/Ticket');

  const monthStart = new Date(targetYear, targetMonth, 1);
  const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
  const monthName = monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // ── Aggregate data ──
  const [bills, payments, allCustomers, tickets] = await Promise.all([
    Bill.find({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
    Payment.find({ paymentDate: { $gte: monthStart, $lte: monthEnd } }),
    Customer.find({}),
    Ticket.find({ createdAt: { $gte: monthStart, $lte: monthEnd } })
  ]);

  const totalBills = bills.length;
  const totalBilled = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalSubtotal = bills.reduce((s, b) => s + (b.subtotal || 0), 0);
  const totalTax = bills.reduce((s, b) => s + (b.taxAmount || 0), 0);
  const paidBills = bills.filter(b => b.status === 'paid').length;
  const pendingBills = bills.filter(b => ['pending', 'partial'].includes(b.status)).length;
  const overdueBills = bills.filter(b => b.status === 'overdue').length;

  const totalPayments = payments.length;
  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstandingTotal = allCustomers.reduce((s, c) => s + (c.outstandingBalance || 0), 0);

  const totalCustomers = allCustomers.length;
  const activeCustomers = allCustomers.filter(c => c.status === 'active').length;
  const newCustomers = allCustomers.filter(c => c.createdAt >= monthStart && c.createdAt <= monthEnd).length;

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length;
  const closedTickets = tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;

  const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0.0';

  // ── Build top-5 outstanding customers list ──
  const topOutstanding = [...allCustomers]
    .filter(c => (c.outstandingBalance || 0) > 0)
    .sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0))
    .slice(0, 5);

  const topOutstandingRows = topOutstanding.length > 0
    ? topOutstanding.map((c, i) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">${i + 1}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:13px;font-weight:500;">${c.name}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:13px;">${c.customerId}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#dc2626;font-weight:600;font-size:13px;">₹${(c.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No outstanding balances 🎉</td></tr>`;

  // ── Build HTML ──
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
  <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
    <div style="max-width:680px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
      
      <!-- ═══ HEADER ═══ -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0d9488 100%);padding:40px 35px;text-align:center;position:relative;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22><circle cx=%2240%22 cy=%2240%22 r=%2232%22 fill=%22none%22 stroke=%22rgba(255,255,255,0.03)%22 stroke-width=%221%22/></svg>') repeat;"></div>
        <div style="position:relative;z-index:1;">
          <div style="display:inline-block;background:rgba(255,255,255,0.1);border-radius:12px;padding:8px 20px;margin-bottom:12px;">
            <span style="color:#5eead4;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Monthly Report</span>
          </div>
          <h1 style="color:#ffffff;margin:8px 0 0;font-size:32px;font-weight:700;letter-spacing:1px;">RECORDRx</h1>
          <p style="color:#5eead4;margin:5px 0 0;font-size:12px;">FUTURE OF PATIENT CARE - POWERED BY AI</p>
          <div style="margin-top:20px;background:rgba(255,255,255,0.08);border-radius:8px;padding:10px 20px;display:inline-block;">
            <span style="color:#e2e8f0;font-size:18px;font-weight:600;">${monthName}</span>
          </div>
        </div>
      </div>

      <!-- ═══ KEY METRICS ═══ -->
      <div style="padding:30px 35px 0;">
        <table style="width:100%;border-collapse:separate;border-spacing:10px;">
          <tr>
            <td style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border-radius:12px;padding:20px;text-align:center;width:33%;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#0d9488;">₹${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p style="margin:6px 0 0;font-size:11px;color:#5f9ea0;text-transform:uppercase;font-weight:600;letter-spacing:1px;">Total Billed</p>
            </td>
            <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:20px;text-align:center;width:33%;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">₹${totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p style="margin:6px 0 0;font-size:11px;color:#4ade80;text-transform:uppercase;font-weight:600;letter-spacing:1px;">Collected</p>
            </td>
            <td style="background:linear-gradient(135deg,#fef2f2,#fecaca);border-radius:12px;padding:20px;text-align:center;width:33%;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626;">₹${outstandingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p style="margin:6px 0 0;font-size:11px;color:#f87171;text-transform:uppercase;font-weight:600;letter-spacing:1px;">Outstanding</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- ═══ BILLING SUMMARY ═══ -->
      <div style="padding:25px 35px;">
        <div style="display:flex;align-items:center;margin-bottom:15px;">
          <div style="width:4px;height:22px;background:linear-gradient(to bottom,#0d9488,#14b8a6);border-radius:4px;margin-right:10px;"></div>
          <h2 style="margin:0;font-size:16px;font-weight:700;color:#1e293b;">Billing Summary</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:10px;overflow:hidden;">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 20px;color:#64748b;font-size:13px;">Total Invoices Generated</td>
            <td style="padding:12px 20px;text-align:right;font-weight:600;color:#334155;font-size:14px;">${totalBills}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 20px;color:#64748b;font-size:13px;">Subtotal (Before Tax)</td>
            <td style="padding:12px 20px;text-align:right;font-weight:600;color:#334155;font-size:14px;">₹${totalSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 20px;color:#64748b;font-size:13px;">GST Collected</td>
            <td style="padding:12px 20px;text-align:right;font-weight:600;color:#334155;font-size:14px;">₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 20px;color:#64748b;font-size:13px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:6px;"></span>Paid
            </td>
            <td style="padding:12px 20px;text-align:right;font-weight:600;color:#16a34a;font-size:14px;">${paidBills}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 20px;color:#64748b;font-size:13px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:6px;"></span>Pending
            </td>
            <td style="padding:12px 20px;text-align:right;font-weight:600;color:#f59e0b;font-size:14px;">${pendingBills}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#64748b;font-size:13px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#dc2626;margin-right:6px;"></span>Overdue
            </td>
            <td style="padding:12px 20px;text-align:right;font-weight:600;color:#dc2626;font-size:14px;">${overdueBills}</td>
          </tr>
        </table>
      </div>

      <!-- ═══ COLLECTION RATE BAR ═══ -->
      <div style="padding:0 35px 25px;">
        <div style="background:#f8fafc;border-radius:10px;padding:18px 20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;font-weight:600;color:#334155;">Collection Rate</span>
            <span style="font-size:18px;font-weight:700;color:${parseFloat(collectionRate) >= 80 ? '#16a34a' : parseFloat(collectionRate) >= 50 ? '#f59e0b' : '#dc2626'};">${collectionRate}%</span>
          </div>
          <div style="background:#e2e8f0;border-radius:6px;height:10px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,${parseFloat(collectionRate) >= 80 ? '#16a34a,#4ade80' : parseFloat(collectionRate) >= 50 ? '#f59e0b,#fbbf24' : '#dc2626,#f87171'});height:100%;width:${Math.min(parseFloat(collectionRate), 100)}%;border-radius:6px;transition:width 0.3s;"></div>
          </div>
        </div>
      </div>

      <!-- ═══ PAYMENTS & CUSTOMERS ═══ -->
      <div style="padding:0 35px 25px;">
        <table style="width:100%;border-collapse:separate;border-spacing:10px;">
          <tr>
            <td style="background:#f8fafc;border-radius:10px;padding:20px;vertical-align:top;width:50%;">
              <div style="display:flex;align-items:center;margin-bottom:12px;">
                <div style="width:4px;height:18px;background:linear-gradient(to bottom,#16a34a,#4ade80);border-radius:4px;margin-right:8px;"></div>
                <h3 style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">Payments</h3>
              </div>
              <table style="width:100%;">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:12px;">Total Payments</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;color:#334155;font-size:13px;">${totalPayments}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:12px;">Amount Collected</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;color:#16a34a;font-size:13px;">₹${totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </td>
            <td style="background:#f8fafc;border-radius:10px;padding:20px;vertical-align:top;width:50%;">
              <div style="display:flex;align-items:center;margin-bottom:12px;">
                <div style="width:4px;height:18px;background:linear-gradient(to bottom,#6366f1,#818cf8);border-radius:4px;margin-right:8px;"></div>
                <h3 style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">Customers</h3>
              </div>
              <table style="width:100%;">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:12px;">Total Customers</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;color:#334155;font-size:13px;">${totalCustomers}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:12px;">Active</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;color:#16a34a;font-size:13px;">${activeCustomers}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:12px;">New This Month</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;color:#6366f1;font-size:13px;">${newCustomers}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- ═══ TICKETS ═══ -->
      <div style="padding:0 35px 25px;">
        <div style="background:#f8fafc;border-radius:10px;padding:20px;">
          <div style="display:flex;align-items:center;margin-bottom:12px;">
            <div style="width:4px;height:18px;background:linear-gradient(to bottom,#f59e0b,#fbbf24);border-radius:4px;margin-right:8px;"></div>
            <h3 style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">Support Tickets</h3>
          </div>
          <table style="width:100%;">
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12px;">Total Tickets</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;color:#334155;font-size:13px;">${totalTickets}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12px;">Open / In Progress</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;color:#f59e0b;font-size:13px;">${openTickets}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12px;">Resolved / Closed</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;color:#16a34a;font-size:13px;">${closedTickets}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- ═══ TOP OUTSTANDING ═══ -->
      <div style="padding:0 35px 25px;">
        <div style="display:flex;align-items:center;margin-bottom:15px;">
          <div style="width:4px;height:22px;background:linear-gradient(to bottom,#dc2626,#f87171);border-radius:4px;margin-right:10px;"></div>
          <h2 style="margin:0;font-size:16px;font-weight:700;color:#1e293b;">Top Outstanding Balances</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#fef2f2;">
              <th style="padding:10px 16px;text-align:left;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">#</th>
              <th style="padding:10px 16px;text-align:left;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Customer</th>
              <th style="padding:10px 16px;text-align:left;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">ID</th>
              <th style="padding:10px 16px;text-align:right;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Outstanding</th>
            </tr>
          </thead>
          <tbody>${topOutstandingRows}</tbody>
        </table>
      </div>

      <!-- ═══ FOOTER ═══ -->
      <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:30px 35px;text-align:center;">
        <p style="margin:0;color:#e2e8f0;font-size:13px;font-weight:500;">RECORDRx Monthly Report — ${monthName}</p>
        <p style="margin:8px 0 0;color:#64748b;font-size:11px;">This is an auto-generated report. Please do not reply to this email.</p>
        <div style="margin-top:15px;padding-top:15px;border-top:1px solid rgba(255,255,255,0.1);">
          <p style="margin:0;color:#475569;font-size:10px;">© ${new Date().getFullYear()} RECORDRx. All rights reserved.</p>
        </div>
      </div>

    </div>
  </body>
  </html>`;

  // ── Send email ──
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: getFromAddress(),
      to: recipients.join(', '),
      subject: `RECORDRx Monthly Report — ${monthName} | Billed: ₹${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Collected: ₹${totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      html
    });

    console.log(`[Report] Monthly report for ${monthName} sent to: ${recipients.join(', ')}`);
    return { sent: true, recipients, month: monthName };
  } catch (error) {
    console.error(`[Report] Failed to send monthly report: ${error.message}`);
    return { sent: false, reason: error.message };
  }
};

module.exports = { generateAndSendMonthlyReport };
