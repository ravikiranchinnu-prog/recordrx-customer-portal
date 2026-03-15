const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const getFromAddress = () => {
  return `${process.env.EMAIL_FROM_NAME || 'Radix Billing'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`;
};

/**
 * Send invoice email to customer after bill generation
 */
const sendInvoiceEmail = async (bill) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('[Email] Skipped: EMAIL_USER / EMAIL_PASSWORD not configured');
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const transporter = createTransporter();
    const dueDate = bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : 'N/A';
    const issueDate = bill.issueDate ? new Date(bill.issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    const itemsHtml = (bill.items || []).map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">₹${item.unitPrice?.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${item.taxRate || 18}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">₹${((item.amount || 0) + (item.taxAmount || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;">
      <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0d9488,#14b8a6);padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:1px;">RADIX</h1>
          <p style="color:#ccfbf1;margin:5px 0 0;font-size:12px;">The Root of Reliability</p>
        </div>

        <!-- Invoice Badge -->
        <div style="text-align:center;padding:20px 0 0;">
          <span style="background:#f0fdfa;color:#0d9488;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:600;">INVOICE ${bill.invoiceNumber}</span>
        </div>

        <!-- Details -->
        <div style="padding:25px 30px;">
          <p style="color:#334155;font-size:15px;">Dear <strong>${bill.customerName}</strong>,</p>
          <p style="color:#64748b;font-size:14px;line-height:1.6;">
            A new invoice has been generated for your account. Please find the details below:
          </p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:13px;">Bill Number</td>
              <td style="padding:6px 0;color:#334155;font-weight:600;font-size:13px;text-align:right;">${bill.billNumber}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:13px;">Issue Date</td>
              <td style="padding:6px 0;color:#334155;font-weight:600;font-size:13px;text-align:right;">${issueDate}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:13px;">Due Date</td>
              <td style="padding:6px 0;color:#f59e0b;font-weight:600;font-size:13px;text-align:right;">${dueDate}</td>
            </tr>
          </table>

          <!-- Items Table -->
          <table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">Description</th>
                <th style="padding:10px 12px;text-align:center;color:#64748b;font-size:11px;text-transform:uppercase;">Qty</th>
                <th style="padding:10px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Price</th>
                <th style="padding:10px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Tax</th>
                <th style="padding:10px 12px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- Totals -->
          <div style="background:#f8fafc;border-radius:8px;padding:15px 20px;margin-top:15px;">
            <table style="width:100%;font-size:13px;">
              <tr>
                <td style="padding:4px 0;color:#64748b;">Subtotal</td>
                <td style="padding:4px 0;text-align:right;color:#334155;">₹${(bill.subtotal || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#64748b;">Tax (GST)</td>
                <td style="padding:4px 0;text-align:right;color:#334155;">₹${(bill.taxAmount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0 4px;color:#0d9488;font-size:16px;font-weight:700;border-top:2px solid #e2e8f0;">Total Amount</td>
                <td style="padding:8px 0 4px;text-align:right;color:#0d9488;font-size:16px;font-weight:700;border-top:2px solid #e2e8f0;">₹${(bill.totalAmount || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${bill.notes ? `<p style="color:#64748b;font-size:13px;margin-top:15px;padding:10px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;">${bill.notes}</p>` : ''}

          <p style="color:#64748b;font-size:13px;margin-top:25px;line-height:1.6;">
            Please ensure payment is made before the due date to avoid any late charges.
            If you have any questions, please don't hesitate to contact our support team.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:20px 30px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">This is an auto-generated email from Radix Billing System.</p>
          <p style="margin:5px 0 0;color:#94a3b8;font-size:11px;">© ${new Date().getFullYear()} Radix. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>`;

    await transporter.sendMail({
      from: getFromAddress(),
      to: bill.customerEmail,
      subject: `Invoice ${bill.invoiceNumber} — ₹${bill.totalAmount?.toFixed(2)} due by ${dueDate}`,
      html
    });

    console.log(`[Email] Invoice ${bill.invoiceNumber} sent to ${bill.customerEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`[Email] Failed to send invoice: ${error.message}`);
    return { sent: false, reason: error.message };
  }
};

/**
 * Send payment confirmation email to customer
 */
const sendPaymentConfirmationEmail = async (payment, bill) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('[Email] Skipped: EMAIL_USER / EMAIL_PASSWORD not configured');
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const transporter = createTransporter();
    const paymentDate = new Date(payment.paymentDate).toLocaleDateString('en-IN');
    const balanceDue = (bill.totalAmount || 0) - (bill.paidAmount || 0);

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;">
      <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        
        <div style="background:linear-gradient(135deg,#059669,#10b981);padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:1px;">RADIX</h1>
          <p style="color:#d1fae5;margin:5px 0 0;font-size:12px;">The Root of Reliability</p>
        </div>

        <div style="text-align:center;padding:20px 0 0;">
          <span style="background:#f0fdf4;color:#059669;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:600;">✓ PAYMENT RECEIVED</span>
        </div>

        <div style="padding:25px 30px;">
          <p style="color:#334155;font-size:15px;">Dear <strong>${bill.customerName}</strong>,</p>
          <p style="color:#64748b;font-size:14px;line-height:1.6;">
            We've received your payment. Here are the details:
          </p>

          <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:20px 0;">
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:5px 0;color:#64748b;">Payment ID</td><td style="text-align:right;color:#334155;font-weight:600;">${payment.paymentId}</td></tr>
              <tr><td style="padding:5px 0;color:#64748b;">Invoice</td><td style="text-align:right;color:#334155;font-weight:600;">${bill.invoiceNumber}</td></tr>
              <tr><td style="padding:5px 0;color:#64748b;">Amount Paid</td><td style="text-align:right;color:#059669;font-weight:700;font-size:16px;">₹${payment.amount?.toFixed(2)}</td></tr>
              <tr><td style="padding:5px 0;color:#64748b;">Payment Method</td><td style="text-align:right;color:#334155;font-weight:600;">${payment.paymentMethod?.replace('_', ' ').toUpperCase()}</td></tr>
              <tr><td style="padding:5px 0;color:#64748b;">Date</td><td style="text-align:right;color:#334155;font-weight:600;">${paymentDate}</td></tr>
              ${payment.transactionId ? `<tr><td style="padding:5px 0;color:#64748b;">Transaction ID</td><td style="text-align:right;color:#334155;font-weight:600;">${payment.transactionId}</td></tr>` : ''}
              <tr style="border-top:1px solid #bbf7d0;"><td style="padding:8px 0 0;color:#64748b;">Balance Due</td><td style="text-align:right;padding:8px 0 0;color:${balanceDue > 0 ? '#f59e0b' : '#059669'};font-weight:700;">₹${balanceDue.toFixed(2)}</td></tr>
            </table>
          </div>

          <p style="color:#64748b;font-size:13px;margin-top:15px;">
            ${balanceDue <= 0 ? '🎉 This invoice has been fully paid. Thank you!' : `Remaining balance of ₹${balanceDue.toFixed(2)} is pending.`}
          </p>
        </div>

        <div style="background:#f8fafc;padding:20px 30px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">This is an auto-generated email from Radix Billing System.</p>
          <p style="margin:5px 0 0;color:#94a3b8;font-size:11px;">© ${new Date().getFullYear()} Radix. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>`;

    await transporter.sendMail({
      from: getFromAddress(),
      to: bill.customerEmail,
      subject: `Payment Received — ₹${payment.amount?.toFixed(2)} for Invoice ${bill.invoiceNumber}`,
      html
    });

    console.log(`[Email] Payment confirmation sent to ${bill.customerEmail}`);
    return { sent: true };
  } catch (error) {
    console.error(`[Email] Failed to send payment confirmation: ${error.message}`);
    return { sent: false, reason: error.message };
  }
};

module.exports = { createTransporter, getFromAddress, sendInvoiceEmail, sendPaymentConfirmationEmail };
