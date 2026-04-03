/**
 * Email Service for RecordRx Billing System
 * Handles all email sending functionality
 */

const nodemailer = require('nodemailer');
const emailConfig = require('../config/email.config');

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: emailConfig.EMAIL_HOST,
        port: emailConfig.EMAIL_PORT,
        secure: emailConfig.EMAIL_SECURE,
        auth: {
            user: emailConfig.EMAIL_USER,
            pass: emailConfig.EMAIL_PASSWORD
        }
    });
};

// Email templates
const templates = {
    // Invoice email template
    invoice: (data) => ({
        subject: `Invoice ${data.invoiceNumber} from ${emailConfig.COMPANY_NAME}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1e293b; padding: 20px; text-align: center;">
                    <h1 style="color: #fff; margin: 0;">${emailConfig.COMPANY_NAME}</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0;">${emailConfig.COMPANY_TAGLINE}</p>
                </div>
                <div style="padding: 30px; background: #f8fafc;">
                    <h2 style="color: #1e293b;">Invoice ${data.invoiceNumber}</h2>
                    <p>Dear ${data.customerName},</p>
                    <p>Please find your invoice details below:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background: #e2e8f0;">
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Invoice Number</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>${data.invoiceNumber}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Billing Period</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">${data.billingPeriod}</td>
                        </tr>
                        <tr style="background: #e2e8f0;">
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Amount Due</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong style="color: #059669;">₹${data.amount}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Due Date</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">${data.dueDate}</td>
                        </tr>
                    </table>
                    
                    <p>Please make the payment before the due date to avoid any service interruption.</p>
                    
                    <p style="margin-top: 30px;">Thank you for your business!</p>
                    <p>Best regards,<br>${emailConfig.COMPANY_NAME} Team</p>
                </div>
                <div style="background: #1e293b; padding: 15px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${emailConfig.COMPANY_NAME}. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Payment confirmation template
    paymentConfirmation: (data) => ({
        subject: `Payment Received - ${emailConfig.COMPANY_NAME}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1e293b; padding: 20px; text-align: center;">
                    <h1 style="color: #fff; margin: 0;">${emailConfig.COMPANY_NAME}</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0;">${emailConfig.COMPANY_TAGLINE}</p>
                </div>
                <div style="padding: 30px; background: #f8fafc;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="background: #059669; color: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto; line-height: 60px; font-size: 30px;">✓</div>
                    </div>
                    <h2 style="color: #1e293b; text-align: center;">Payment Received!</h2>
                    <p>Dear ${data.customerName},</p>
                    <p>We have received your payment. Thank you!</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background: #e2e8f0;">
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Payment ID</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>${data.paymentId}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Invoice Number</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">${data.invoiceNumber}</td>
                        </tr>
                        <tr style="background: #e2e8f0;">
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Amount Paid</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong style="color: #059669;">₹${data.amount}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Payment Date</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">${data.paymentDate}</td>
                        </tr>
                        <tr style="background: #e2e8f0;">
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">Payment Method</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1;">${data.paymentMethod}</td>
                        </tr>
                    </table>
                    
                    <p style="margin-top: 30px;">Thank you for your continued trust in us!</p>
                    <p>Best regards,<br>${emailConfig.COMPANY_NAME} Team</p>
                </div>
                <div style="background: #1e293b; padding: 15px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${emailConfig.COMPANY_NAME}. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Payment reminder template
    paymentReminder: (data) => ({
        subject: `Payment Reminder - Invoice ${data.invoiceNumber}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1e293b; padding: 20px; text-align: center;">
                    <h1 style="color: #fff; margin: 0;">${emailConfig.COMPANY_NAME}</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0;">${emailConfig.COMPANY_TAGLINE}</p>
                </div>
                <div style="padding: 30px; background: #f8fafc;">
                    <h2 style="color: #dc2626;">Payment Reminder</h2>
                    <p>Dear ${data.customerName},</p>
                    <p>This is a friendly reminder that your invoice is due soon.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background: #fef2f2;">
                            <td style="padding: 10px; border: 1px solid #fecaca;">Invoice Number</td>
                            <td style="padding: 10px; border: 1px solid #fecaca;"><strong>${data.invoiceNumber}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #fecaca;">Amount Due</td>
                            <td style="padding: 10px; border: 1px solid #fecaca;"><strong style="color: #dc2626;">₹${data.amount}</strong></td>
                        </tr>
                        <tr style="background: #fef2f2;">
                            <td style="padding: 10px; border: 1px solid #fecaca;">Due Date</td>
                            <td style="padding: 10px; border: 1px solid #fecaca;"><strong>${data.dueDate}</strong></td>
                        </tr>
                    </table>
                    
                    <p>Please make the payment at your earliest convenience to avoid any service interruption.</p>
                    
                    <p style="margin-top: 30px;">If you have already made the payment, please ignore this reminder.</p>
                    <p>Best regards,<br>${emailConfig.COMPANY_NAME} Team</p>
                </div>
                <div style="background: #1e293b; padding: 15px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${emailConfig.COMPANY_NAME}. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Welcome email for new customers
    welcome: (data) => ({
        subject: `Welcome to ${emailConfig.COMPANY_NAME}!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1e293b; padding: 20px; text-align: center;">
                    <h1 style="color: #fff; margin: 0;">${emailConfig.COMPANY_NAME}</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0;">${emailConfig.COMPANY_TAGLINE}</p>
                </div>
                <div style="padding: 30px; background: #f8fafc;">
                    <h2 style="color: #1e293b;">Welcome Aboard! 🎉</h2>
                    <p>Dear ${data.customerName},</p>
                    <p>Thank you for choosing ${emailConfig.COMPANY_NAME}. We're excited to have you as a customer!</p>
                    
                    <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #0369a1; margin-top: 0;">Your Account Details</h3>
                        <p style="margin: 5px 0;"><strong>Customer ID:</strong> ${data.customerId}</p>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> ${data.planName}</p>
                        <p style="margin: 5px 0;"><strong>Monthly Amount:</strong> ₹${data.planAmount}</p>
                    </div>
                    
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                    
                    <p style="margin-top: 30px;">Welcome to the family!</p>
                    <p>Best regards,<br>${emailConfig.COMPANY_NAME} Team</p>
                </div>
                <div style="background: #1e293b; padding: 15px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${emailConfig.COMPANY_NAME}. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Renewal reminder email template
    renewalReminder: (data) => ({
        subject: `Plan Renewal Reminder - ${emailConfig.COMPANY_NAME}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1e293b; padding: 20px; text-align: center;">
                    <h1 style="color: #fff; margin: 0;">${emailConfig.COMPANY_NAME}</h1>
                    <p style="color: #94a3b8; margin: 5px 0 0;">${emailConfig.COMPANY_TAGLINE}</p>
                </div>
                <div style="padding: 30px; background: #f8fafc;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="background: #f59e0b; color: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto; line-height: 60px; font-size: 30px;">⏳</div>
                    </div>
                    <h2 style="color: #d97706; text-align: center;">Plan Renewal Reminder</h2>
                    <p>Dear ${data.customerName},</p>
                    <p>Your <strong>${data.planName}</strong> plan is approaching its expiry date.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background: #fffbeb;">
                            <td style="padding: 10px; border: 1px solid #fde68a;">Plan</td>
                            <td style="padding: 10px; border: 1px solid #fde68a;"><strong>${data.planName}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #fde68a;">Plan Type</td>
                            <td style="padding: 10px; border: 1px solid #fde68a;">${data.planType}</td>
                        </tr>
                        <tr style="background: #fffbeb;">
                            <td style="padding: 10px; border: 1px solid #fde68a;">Expiry Date</td>
                            <td style="padding: 10px; border: 1px solid #fde68a;"><strong style="color: #d97706;">${data.expiryDate}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #fde68a;">Days Remaining</td>
                            <td style="padding: 10px; border: 1px solid #fde68a;"><strong style="color: #dc2626;">${data.daysRemaining} days</strong></td>
                        </tr>
                        <tr style="background: #fffbeb;">
                            <td style="padding: 10px; border: 1px solid #fde68a;">Renewal Amount</td>
                            <td style="padding: 10px; border: 1px solid #fde68a;"><strong style="color: #059669;">₹${data.amount}</strong></td>
                        </tr>
                    </table>
                    
                    <p>Please renew your plan before the expiry date to avoid any service interruption.</p>
                    <p>You can renew directly from your customer portal.</p>
                    
                    <p style="margin-top: 30px;">Thank you for your continued patronage!</p>
                    <p>Best regards,<br>${emailConfig.COMPANY_NAME} Team</p>
                </div>
                <div style="background: #1e293b; padding: 15px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${emailConfig.COMPANY_NAME}. All rights reserved.</p>
                </div>
            </div>
        `
    })
};

// Email service class
class EmailService {
    constructor() {
        this.transporter = createTransporter();
    }

    // Send email
    async sendEmail(to, templateName, data) {
        try {
            const template = templates[templateName](data);
            
            const mailOptions = {
                from: `"${emailConfig.EMAIL_FROM_NAME}" <${emailConfig.EMAIL_FROM_ADDRESS}>`,
                to: to,
                subject: template.subject,
                html: template.html
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${to}: ${result.messageId}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error(`❌ Email failed to ${to}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Send invoice email
    async sendInvoice(customerEmail, invoiceData) {
        if (!emailConfig.SEND_INVOICE_ON_GENERATION) return;
        return this.sendEmail(customerEmail, 'invoice', invoiceData);
    }

    // Send payment confirmation
    async sendPaymentConfirmation(customerEmail, paymentData) {
        if (!emailConfig.SEND_PAYMENT_CONFIRMATION) return;
        return this.sendEmail(customerEmail, 'paymentConfirmation', paymentData);
    }

    // Send payment reminder
    async sendPaymentReminder(customerEmail, reminderData) {
        if (!emailConfig.SEND_REMINDER_BEFORE_DUE) return;
        return this.sendEmail(customerEmail, 'paymentReminder', reminderData);
    }

    // Send welcome email
    async sendWelcome(customerEmail, customerData) {
        return this.sendEmail(customerEmail, 'welcome', customerData);
    }

    // Send renewal reminder
    async sendRenewalReminder(customerEmail, renewalData) {
        return this.sendEmail(customerEmail, 'renewalReminder', renewalData);
    }

    // Notify admin
    async notifyAdmin(subject, message) {
        try {
            const mailOptions = {
                from: `"${emailConfig.EMAIL_FROM_NAME}" <${emailConfig.EMAIL_FROM_ADDRESS}>`,
                to: emailConfig.ADMIN_EMAIL,
                subject: `[Admin] ${subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>${subject}</h2>
                        <p>${message}</p>
                        <hr>
                        <p style="color: #666; font-size: 12px;">This is an automated admin notification from ${emailConfig.COMPANY_NAME}</p>
                    </div>
                `
            };
            await this.transporter.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Admin notification failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Test email configuration
    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email server connection verified');
            return { success: true, message: 'Email configuration is valid' };
        } catch (error) {
            console.error('❌ Email server connection failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
