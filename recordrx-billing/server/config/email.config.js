/**
 * Email Configuration for RecordRx Billing System
 * 
 * ⚠️ SETUP YOUR GMAIL CREDENTIALS BELOW
 * 
 * Steps to configure Gmail:
 * 1. Go to https://myaccount.google.com/security
 * 2. Enable 2-Step Verification
 * 3. Go to https://myaccount.google.com/apppasswords
 * 4. Generate an App Password (select "Mail" → "Other" → name it "RecordRx")
 * 5. Copy the 16-character password and paste below as EMAIL_PASSWORD
 */

module.exports = {
    // ==================== GMAIL SMTP SETTINGS ====================
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    EMAIL_PORT: process.env.EMAIL_PORT || 587,
    EMAIL_SECURE: process.env.EMAIL_SECURE === 'true' || false,
    
    // ==================== YOUR GMAIL CREDENTIALS ====================
    // ⬇️ Replace with YOUR Gmail address
    EMAIL_USER: process.env.EMAIL_USER || 'your-gmail@gmail.com',
    
    // ⬇️ Replace with your Gmail App Password (NOT your regular password)
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'xxxx-xxxx-xxxx-xxxx',
    
    // ==================== SENDER DETAILS (shown to customers) ====================
    // ⬇️ Your company name and email that customers will see
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'RECORDRx',
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'your-gmail@gmail.com',
    
    // ==================== COMPANY BRANDING ====================
    COMPANY_NAME: 'RECORDRx',
    COMPANY_TAGLINE: '',
    COMPANY_LOGO_URL: '',
    
    // ==================== AUTO-EMAIL TRIGGERS ====================
    SEND_INVOICE_ON_GENERATION: true,   // Auto-send bill invoice to customer
    SEND_PAYMENT_CONFIRMATION: true,    // Auto-send payment receipt
    SEND_REMINDER_BEFORE_DUE: true,     // Auto-send reminder before due date
    REMINDER_DAYS_BEFORE_DUE: 3,        // Days before due date
    
    // ==================== BILLING SCHEDULE ====================
    // Monthly plan reminders: sent DAILY until paid
    // Yearly plan reminders: sent WEEKLY (every Monday) until paid
    MONTHLY_REMINDER_FREQUENCY: 'daily',
    YEARLY_REMINDER_FREQUENCY: 'weekly',
    
    // ==================== ADMIN NOTIFICATIONS ====================
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'your-gmail@gmail.com',
    NOTIFY_ADMIN_ON_PAYMENT: true,
    NOTIFY_ADMIN_ON_NEW_CUSTOMER: true
};

/**
 * SETUP INSTRUCTIONS:
 * 
 * Option 1: Direct Configuration (Development)
 * - Edit the values above directly
 * 
 * Option 2: Environment Variables (Recommended for Production)
 * - Create a .env file in the root directory with:
 * 
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_SECURE=false
 *   EMAIL_USER=your-email@gmail.com
 *   EMAIL_PASSWORD=your-app-password
 *   EMAIL_FROM_NAME=RecordRx
 *   EMAIL_FROM_ADDRESS=billing@recordrx.com
 *   ADMIN_EMAIL=admin@recordrx.com
 * 
 * FOR GMAIL:
 * 1. Go to Google Account > Security
 * 2. Enable 2-Step Verification
 * 3. Generate an App Password: https://myaccount.google.com/apppasswords
 * 4. Use that App Password as EMAIL_PASSWORD
 */
