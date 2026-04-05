# RECORDRx Customer Management Portal — Product Document

**Version:** 2.0  
**Date:** June 2025  
**Product URL (Frontend):** https://recordrx-frontend.vercel.app  
**Product URL (Backend API):** https://recordrx-backend.vercel.app

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Authentication & Security](#4-authentication--security)
5. [User Roles & Access Control](#5-user-roles--access-control)
6. [Login Page](#6-login-page)
7. [Navigation & Layout](#7-navigation--layout)
8. [Admin Panel](#8-admin-panel)
   - 8.1 [Dashboard](#81-admin-dashboard)
   - 8.2 [Invoicing & Payment](#82-invoicing--payment)
   - 8.3 [My Customers](#83-my-customers)
   - 8.4 [Tickets](#84-tickets)
   - 8.5 [Plans](#85-plans)
   - 8.6 [Offers](#86-offers)
   - 8.7 [Customer Management](#87-customer-management)
   - 8.8 [User Management](#88-user-management)
   - 8.9 [Settings](#89-admin-settings)
9. [Customer Panel](#9-customer-panel)
   - 9.1 [Dashboard](#91-customer-dashboard)
   - 9.2 [My Invoices & Payments](#92-my-invoices--payments)
   - 9.3 [My Tickets](#93-my-tickets)
   - 9.4 [Settings](#94-customer-settings)
10. [Notification System](#10-notification-system)
11. [Email System](#11-email-system)
12. [Payment Integration (Razorpay)](#12-payment-integration-razorpay)
13. [Automated Tasks (Cron Jobs)](#13-automated-tasks-cron-jobs)
14. [Database Schema](#14-database-schema)
15. [API Reference](#15-api-reference)
16. [Environment Variables](#16-environment-variables)
17. [Deployment](#17-deployment)

---

## 1. Product Overview

RECORDRx Customer Management Portal is a full-featured, web-based SaaS billing and customer management platform. It enables businesses to manage customers, generate invoices, process payments (online via Razorpay and manual), handle support tickets with a real-time chat interface, create subscription plans and discount offers, and receive automated monthly reports — all from a unified dashboard.

**Key Capabilities:**

- Multi-role access control (Superadmin, Admin, Manager, Staff, Viewer, Customer)
- Automated monthly invoice generation with prorated billing support
- Online payment processing via Razorpay with HMAC-SHA256 signature verification
- Manual payment recording with bank reconciliation tracking
- Real-time ticket management with multi-tab chat interface and file attachments
- Customizable subscription plans with GST calculation
- Discount offers (percentage and flat) with customer-specific assignment
- Automated overdue detection and marking
- Monthly financial reports sent via email
- 22 pre-built email draft templates for customer support
- PDF invoice generation and download
- Dark/Light theme support
- Responsive UI with animated login page

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | Next.js (React) | 14.2.35 |
| **Frontend Styling** | Tailwind CSS | 3.x |
| **Backend Framework** | Express.js (Node.js) | 4.x |
| **Database** | MongoDB Atlas (Mongoose ODM) | 7.x |
| **Authentication** | JSON Web Tokens (JWT) | — |
| **Password Hashing** | bcryptjs | — |
| **Payment Gateway** | Razorpay | — |
| **Email Service** | Nodemailer (SMTP) | — |
| **PDF Generation** | PDFKit | — |
| **Task Scheduling** | node-cron | — |
| **Hosting** | Vercel (Serverless) | — |
| **Version Control** | Git / GitHub | — |

---

## 3. Architecture

```
+-----------------------------------------------------------+
|                     VERCEL CLOUD                          |
|                                                           |
|  +---------------------+   +-------------------------+   |
|  |  Frontend (Next.js) |   |  Backend (Express.js)   |   |
|  |  recordrx-frontend  |-->|  recordrx-backend       |   |
|  |  .vercel.app        |   |  .vercel.app            |   |
|  +---------------------+   +-----------+-------------+   |
|                                         |                 |
+-----------------------------------------------------------+
                                          |
                            +-------------v--------------+
                            |    MongoDB Atlas Cluster   |
                            |    (Database: radix)       |
                            +-------------+--------------+
                                          |
                 +------------------------+---------------------+
                 |                        |                     |
          +------v------+     +----------v--------+   +--------v------+
          |  Razorpay   |     |  SMTP Server      |   | File Storage  |
          |  Payment    |     |  (Gmail/Custom)   |   | (Uploads)     |
          |  Gateway    |     |  Email Sending    |   |               |
          +-------------+     +-------------------+   +---------------+
```

### Frontend Structure
- **Root directory:** `frontend/`
- **Framework:** Next.js 14 App Router
- **Pages:** Organized under `src/app/` with `admin/` and `customer/` route groups
- **Shared components:** `src/components/` (Header, Sidebar, TicketChat, Toast, ThemeToggle, HelpWidget)
- **State management:** React Context API (`AuthContext`, `ThemeContext`)
- **API communication:** Centralized API helper (`src/lib/api.js`) with JWT-based request interceptor

### Backend Structure
- **Root directory:** `backend/`
- **Entry point:** `server.js` — Express app with CORS, JSON parsing, static file serving
- **Routes:** 13 route modules under `routes/`
- **Models:** 9 Mongoose models under `models/`
- **Middleware:** JWT authentication + role-based authorization under `middleware/`
- **Utilities:** Email helper, report generator under `utils/`
- **Configuration:** Database connection, email draft templates under `config/`

---

## 4. Authentication & Security

### JWT Authentication
- Users authenticate via email and password at `/api/auth/login`
- Server issues a JWT token with 7-day expiry containing: `{ id, role, email }`
- All protected API calls require the `Authorization: Bearer <token>` header
- Token is stored client-side and included in every API request via the centralized `api.js` helper
- On 401/403 response, the user is automatically logged out and redirected to `/login`

### Password Security
- Passwords are hashed using bcryptjs with 10 salt rounds before storage
- Passwords are never returned in API responses (excluded in model's `toJSON` transform)
- Password change requires current password verification
- Minimum password length: 6 characters (frontend), 8 characters (backend)

### CORS Policy
- Backend accepts requests from:
  - Any `*.vercel.app` subdomain
  - `localhost` (any port)
  - Requests with no origin (server-to-server)
- Credentials are enabled for cookie/token passing

### Data Isolation
- Customer-role users can only access their own data (bills, tickets, payments)
- Bill ownership is verified server-side before allowing payment
- Ticket ownership is verified before showing messages

### Input Validation
- Mongoose schema validators enforce data types, required fields, and enum constraints
- API routes validate request body fields before processing
- File attachments limited to 2MB with allowed type whitelist

---

## 5. User Roles & Access Control

The system supports 6 user roles with hierarchical access:

| Role | Level | Access Scope |
|------|-------|-------------|
| **Superadmin** | Highest | Full system access. Cannot be deleted. |
| **Admin** | High | All admin features. Can manage users and customers. |
| **Manager** | Mid-High | Admin features except user management. |
| **Staff** | Mid | Read/write on operational features (invoicing, tickets). |
| **Viewer** | Low | Read-only access to admin panel. |
| **Customer** | External | Own dashboard, invoices, tickets, and settings only. |

### Role-based Route Guards

| Guard | Roles Allowed |
|-------|-------------|
| `adminOnly` | Superadmin, Admin, Manager, Staff, Viewer |
| `managerUp` | Superadmin, Admin, Manager |
| `adminUp` | Superadmin, Admin |

---

## 6. Login Page

**URL:** `/login`

### Features
- Email and password input fields with form validation
- Animated nebula canvas background with stars, floating blobs, and connection lines (respects `prefers-reduced-motion` accessibility setting)
- Auto-detects and switches between light mode and dark mode logos
- Error messages displayed inline on failed login attempt
- Auto-redirects already-authenticated users:
  - `customer` role → `/customer/dashboard`
  - All other roles → `/admin/dashboard`

---

## 7. Navigation & Layout

### Sidebar Navigation

The sidebar provides role-specific navigation with two sections: main navigation (top) and management navigation (bottom, separated by a border).

**Admin Sidebar:**

| Section | Menu Item | Path |
|---------|----------|------|
| Main | Dashboard | `/admin/dashboard` |
| Main | Invoicing & Payment | `/admin/invoicing` |
| Main | My Customers | `/admin/customers` |
| Main | Tickets | `/admin/tickets` |
| Management | Plans | `/admin/plans` |
| Management | Offers | `/admin/offers` |
| Management | Customer Mgmt | `/admin/customer-mgmt` |
| Management | User Mgmt | `/admin/user-mgmt` |
| Management | Settings | `/admin/settings` |

**Customer Sidebar:**

| Section | Menu Item | Path |
|---------|----------|------|
| Main | Dashboard | `/customer/dashboard` |
| Main | My Invoices & Payments | `/customer/invoices` |
| Main | My Tickets | `/customer/tickets` |
| Settings | Settings | `/customer/settings` |

### Header Bar

Present on all pages. Contains:
- **Page title** (dynamic, changes per page)
- **Welcome message** ("Welcome back, {username}")
- **Theme toggle button** (switches between dark and light modes)
- **Notification bell** with unread count badge (red circle)
- **Logout button**

---

## 8. Admin Panel

### 8.1 Admin Dashboard

**URL:** `/admin/dashboard`

#### Stat Cards (4 cards)

| Card | Value | Badge |
|------|-------|-------|
| Total Customers | Count of all customers | "Active" (green) |
| Revenue | Monthly collected revenue (INR) | "Collected" (green) |
| Total Invoices | Count of all bills | "{N} pending" (amber) |
| Outstanding | Total pending amount (INR) | "{N} overdue" (red) |

#### Date Range Filter
- Date range picker to filter all dashboard statistics by custom date range
- Sends `startDate` and `endDate` query parameters to the dashboard API

#### Revenue Trend Chart
- **Type:** Vertical bar chart (CSS-rendered, no chart library)
- **Data:** Last 6 months of revenue from completed payments
- **Display:** Teal gradient bars with INR value labels above each bar

#### Invoicing Overview Donut Chart
- **Type:** SVG donut/ring chart
- **Segments:** Paid (emerald), Pending (amber), Overdue (red)
- **Center:** Displays total invoice count
- **Legend:** Color-coded with counts for each status

#### Quick Insights (3 cards)

| Card | Display |
|------|---------|
| Collection Rate | Percentage with teal progress bar |
| Active Plans | Count split into Monthly vs. Yearly with dual-color bar |
| Open Tickets | Count with badges showing pending and in-progress numbers |

#### Monthly Report Sender
- **Month picker:** Select any month/year (defaults to previous month)
- **"Send Monthly Report" button:** Triggers email report generation and delivery to admin and report receiver
- Success/error feedback displayed inline for 5 seconds

---

### 8.2 Invoicing & Payment

**URL:** `/admin/invoicing`

#### Stat Cards (4 cards)

| Card | Value |
|------|-------|
| Total Outstanding | Total amount minus paid amount (INR) |
| Collected This Month | Paid amount (INR) |
| Pending Invoices | Count of pending invoices |
| Overdue | Count of overdue invoices |

#### Filters
- **Status dropdown:** All Status, Pending, Partial, Paid, Overdue
- **Search:** Searches by invoice number and customer name
- **Date range picker:** Filters by billing period

#### Generate Bill (Inline Form)

| Field | Type | Notes |
|-------|------|-------|
| Customer | Dropdown (all customers) | Required |
| Description | Text | Required |
| Quantity | Number (min: 1) | Required |
| Unit Price (INR) | Number (min: 0) | Required |
| Billing Period Start | Date | Required |
| Billing Period End | Date | Required |
| Due Date | Date | Required |
| Tax Rate (%) | Number (min: 0) | Default: 18% |

#### Bills Table

| Column | Description |
|--------|------------|
| Invoice # | Unique invoice number (format: `INV/YYYY/NNNNN`) |
| Customer | Customer name |
| Amount | Subtotal before tax (INR) |
| GST | Tax amount (INR) |
| Total | Grand total including tax (INR) |
| Due Date | Payment due date |
| Status | Color-coded badge: DRAFT / PENDING / PARTIAL / PAID / OVERDUE / CANCELLED |
| Actions | Download PDF |

#### Actions
- **Download PDF:** Generates and downloads a professionally formatted PDF invoice with company header, bill-to section, line items table, and payment summary
- **View Transactions:** Click the eye icon on paid/partial bills to open the Transaction Details modal

#### Transaction Details Modal
- Displays bill summary: Total Amount, Paid, Balance Due
- Lists all payment records with: Payment ID, status badge, amount, method, date, transaction ID, reference number, bank name, cheque number, notes
- Shows reconciliation status per payment: MATCHED / UNMATCHED / DISPUTED / RESOLVED

---

### 8.3 My Customers

**URL:** `/admin/customers`

#### Stat Cards (4 cards)

| Card | Value |
|------|-------|
| Total Customers | Total count |
| Monthly Plans | Customers on monthly billing |
| Yearly Plans | Customers on yearly billing |
| Active | Customers with active status |

#### Search
- Filters customers by name, email, or customer ID

#### Add/Edit Customer Form

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Required |
| Email | Email | Required |
| Phone | Text | Required |
| GSTIN | Text | Optional |
| Street | Text | Optional |
| City | Text | Optional |
| State | Text | Optional |
| Zip Code | Text | Optional |
| Subscription Amount (INR) | Number | Optional |
| Billing Cycle | Dropdown | Monthly, Quarterly, Yearly |
| Plan | Dropdown | Basic, Standard, Premium, Enterprise |
| Status | Dropdown | Active, Inactive, Suspended |

#### Customers Table

| Column | Description |
|--------|------------|
| ID | Customer ID (e.g., CUST00001) |
| Name | Customer name |
| Email | Customer email |
| Plan | Subscription plan (capitalized) |
| Status | Color-coded badge: ACTIVE / INACTIVE / SUSPENDED |
| Actions | Generate Bill, Edit, Delete |

#### Generate Bill Modal (per customer)

| Field | Type | Auto-populated |
|-------|------|---------------|
| Description | Text | "{Plan} Plan - {Cycle} Subscription" |
| Quantity | Number (min: 1) | 1 |
| Unit Price (INR) | Number | Customer's subscription amount |
| Tax Rate (%) | Number | 18% |
| Due Date | Date | Today + 15 days |
| Notes | Text | — |

- **Estimated Total** is calculated live: `Quantity x Unit Price x (1 + Tax/100)`
- **Billing period** is auto-calculated based on cycle: +1 month (monthly), +3 months (quarterly), +1 year (yearly)
- Button text: **"Generate & Email Invoice"** — generates the bill and emails the invoice to the customer

---

### 8.4 Tickets

**URL:** `/admin/tickets`

#### Stat Cards (4 cards)

| Card | Value |
|------|-------|
| Total Tickets | Total count |
| Open | Tickets with "open" status |
| In Progress | Tickets with "in-progress" status |
| Closed | Tickets with "resolved" or "closed" status |

#### Filters
- **Status dropdown:** All Status, Open, In Progress, Resolved, Closed
- **Search:** Searches by ticket ID, subject, and creator name
- **Date range picker:** Filters by creation date

#### Tickets Table

| Column | Description |
|--------|------------|
| Ticket | Ticket ID (clickable, opens chat tab) |
| Subject | Ticket subject |
| Created By | Name of the user who raised the ticket |
| Priority | Color-coded badge: LOW (green) / MEDIUM (amber) / HIGH (orange) / URGENT (red) |
| Status | Color-coded badge: OPEN (blue) / IN-PROGRESS (amber) / RESOLVED (green) / CLOSED (slate) |
| Updated | Last update date |
| Actions | Delete |

#### Multi-Tab Chat Interface
- Clicking a ticket ID opens a chat tab
- Multiple ticket chats can be open simultaneously as tabs
- Each tab shows the ticket subject (truncated) and a close button
- Active tab is highlighted with a teal border

#### Chat Features (Admin View)

| Feature | Description |
|---------|------------|
| Status Dropdown | Change ticket status: Pending, In Progress, Closed |
| Email Drafts Button | Opens searchable draft library (22 templates) |
| Message Input | Auto-resizing textarea; Enter sends, Shift+Enter for newline |
| File Attachments | Images (inline preview), videos (inline player), files (download link); 2MB max |
| Draft Loading | Select a draft, loads into message box, on send also emails the draft to customer |

---

### 8.5 Plans

**URL:** `/admin/plans`

#### Stat Cards (3 cards)

| Card | Value |
|------|-------|
| Total Plans | Total count |
| Active Plans | Plans with "active" status |
| Inactive Plans | Plans with non-active status |

#### Create/Edit Plan Form

| Field | Type | Notes |
|-------|------|-------|
| Plan Name | Text | Required. Example: "Starter", "Professional" |
| Plan Type | Dropdown | Monthly, Yearly |
| Price (INR) | Number (min: 0) | Required |
| GST (%) | Number (0-100) | Optional |
| Status | Dropdown | Active, Inactive |
| Description | Textarea | Optional |

#### Plans Display
- Plans are displayed as a **3-column card grid** (not a table)
- Each plan card shows:
  - Plan name, type badge (MONTHLY / YEARLY), status badge (ACTIVE / INACTIVE)
  - Description (2-line clamp)
  - Pricing breakdown: Base Price, GST %, Total (auto-calculated: `Price x (1 + GST/100)`)
  - Edit and Delete buttons

---

### 8.6 Offers

**URL:** `/admin/offers`

#### Stat Cards (4 cards)

| Card | Value |
|------|-------|
| Total Offers | Total count |
| Active | Active and not expired |
| Expired | Past validity date |
| Inactive | Explicitly deactivated |

#### Filters
- **Status dropdown:** All Status, Active, Inactive
- **Search:** Searches by offer name
- **Date range picker:** Filters by validity period

#### Create/Edit Offer Form

| Field | Type | Notes |
|-------|------|-------|
| Offer Name | Text | Required |
| Plan | Dropdown (active plans) | Required. Shows plan name + monthly price |
| Discount % | Number (0-100) | Percentage discount |
| Discount (INR) | Number (min: 0) | Flat amount discount |
| Valid From | Date | Optional |
| Valid Until | Date | Optional |
| Status | Dropdown | Active, Inactive |
| Customer | Multi-select dropdown | Optional. Selected customers shown as removable chips |

- Discount can be percentage, flat amount, or both
- Customer multi-select shows only active customers; already-selected customers are excluded from the dropdown

#### Offers Table

| Column | Description |
|--------|------------|
| Offer | Offer name |
| Plan | Plan chips (or "All Plans") |
| Customer | Customer name chips (or "All") |
| Discount | "{N}% off" and/or "INR {N} off" |
| Valid From | Date or dash |
| Valid Until | Date (shows "(expired)" in red if past) |
| Status | Badge: ACTIVE / INACTIVE |
| Actions | Edit, Delete |

---

### 8.7 Customer Management

**URL:** `/admin/customer-mgmt`

This page manages **portal user accounts** for customers — creating these also creates the billing record and user login credentials.

#### Add/Edit Managed Customer Form

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Required |
| Email | Email | Required |
| Phone | Text | Optional |
| Company | Text | Optional |
| Address | Text | Optional. Full address in one field |
| Password | Password | Required on create; hidden on edit |
| Plan | Dropdown (active plans) | Shows: "PlanName (Type) - INR Price" |
| Offer | Dropdown (active offers) | Shows: "OfferName (discount details)" |
| Offer Months | Number (min: 1) | Shown only when an offer is selected. Defines how many months the offer applies |

#### What Happens on Customer Creation
1. A **User account** is created with `role: customer`
2. A **Customer billing record** is created with a unique `customerId` (format: `CUST00001`)
3. If a plan is assigned:
   - **Monthly plan:** A prorated bill is generated for the remaining days of the current month. Formula: `(Plan Price / Days in Month) x Days Remaining`
   - **Yearly plan:** A full-year bill is generated
   - GST is calculated from the plan's GST percentage
   - Grace period: Due date + 7 days
   - Due date: Current date + 5 days
4. A **welcome email** is sent to both the customer and the admin
5. The welcome email includes: account details, plan information, pricing with GST breakdown, and any offer applied

#### Managed Customers Table

| Column | Description |
|--------|------------|
| ID | Customer ID (e.g., CUST00001) |
| Name | Customer name |
| Email | Customer email |
| Company | Company name or dash |
| Plan | Assigned plan name or "None" |
| Actions | Edit, Delete |

---

### 8.8 User Management

**URL:** `/admin/user-mgmt`

Manages internal staff and admin users (non-customer roles).

#### Add/Edit User Form

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Required |
| Email | Email | Required |
| Password | Password | Required on create; hidden on edit |
| Phone | Text | Optional |
| Role | Dropdown | Admin, Manager, Staff, Viewer |

- Default password if not specified: `Tester@1`
- Default role: `Viewer`
- Passwords cannot be updated through this form

#### Users Table

| Column | Description |
|--------|------------|
| Name | User name |
| Email | User email |
| Role | Color-coded badge: SUPERADMIN (purple), ADMIN (red), MANAGER (blue), STAFF (teal), VIEWER (slate) |
| Phone | Phone number or dash |
| Actions | Edit, Delete |

- **Superadmin users cannot be deleted** — the Delete button is hidden for superadmin-role users

---

### 8.9 Admin Settings

**URL:** `/admin/settings`

#### Profile Display (Read-only)

| Field | Source |
|-------|--------|
| Name | Current user's name |
| Email | Current user's email |
| Role | Current user's role (capitalized) |
| Phone | Current user's phone or dash |

#### Change Password Form

| Field | Type | Validation |
|-------|------|-----------|
| Current Password | Password | Required |
| New Password | Password | Required, minimum 6 characters |
| Confirm New Password | Password | Required, must match new password |

---

## 9. Customer Panel

### 9.1 Customer Dashboard

**URL:** `/customer/dashboard`

#### Stat Cards (4 cards)

| Card | Value | Badge |
|------|-------|-------|
| Total Invoices | Count of all invoices | — |
| Outstanding Amount | Unpaid balance (INR) | "{N} pending" (red) |
| Total Paid | Total payments made (INR) | — |
| My Tickets | Total ticket count | "{N} open" (amber) |

#### Quick Action Buttons (2x2 grid)
- View Invoices → `/customer/invoices`
- Raise Ticket → `/customer/tickets`
- Settings → `/customer/settings`
- New Ticket → `/customer/tickets`

#### Recent Invoices Panel
- Shows the last 4 invoices with: invoice ID, date, amount (INR), and status badge

#### My Plan Card
- Displays: Plan Name, Plan Type (Monthly/Yearly), Amount (INR), Expiry Date, Status
- Shows "No active plan" message if no plan is assigned

#### Overdue Alert
- Automatically shows an alert if the customer has:
  - **Overdue bills:** Bills past due date with grace period passed
  - **Due-soon bills:** Bills due within the next 3 days

---

### 9.2 My Invoices & Payments

**URL:** `/customer/invoices`

#### Stat Cards (4 cards)

| Card | Value |
|------|-------|
| Total Invoiced | Sum of all invoice totals (INR) |
| Total Paid | Sum of all payments made (INR) |
| Outstanding | Difference between invoiced and paid (INR) |
| Overdue | Count of overdue invoices |

#### Filters
- **Status dropdown:** All Status, Pending, Paid, Partial, Overdue
- **Date range picker:** Filters by billing period

#### Invoices Table

| Column | Description |
|--------|------------|
| Invoice # | Invoice number |
| Bill # | Bill number |
| Amount | Subtotal before tax (INR) |
| GST | Tax amount (INR) |
| Total | Grand total (INR) |
| Paid | Amount already paid (INR, shown in green) |
| Due Date | Payment due date |
| Status | Color-coded badge with eye icon for transaction history |
| Actions | Download PDF, Pay Now |

#### Pay Now Modal — Dual Payment Mode

The payment modal offers two modes, toggled via a switch:

**Mode 1: Pay Online (Razorpay)**

| Field | Type | Notes |
|-------|------|-------|
| Amount (INR) | Number | Min: 1, Max: remaining balance |
| Notes | Text | Optional |

- Flow: Fetch Razorpay key → Create order → Open Razorpay checkout popup → Verify payment signature → Record payment → Send confirmation email
- Razorpay popup prefills customer name and email
- Payment is verified server-side using HMAC-SHA256 signature verification

**Mode 2: Record Manual Payment**

| Field | Type | Options |
|-------|------|---------|
| Amount (INR) | Number | Min: 1, Max: remaining balance |
| Payment Method | Dropdown | UPI, Bank Transfer (NEFT/RTGS/IMPS), Credit Card, Debit Card, Net Banking, Cheque, Cash, Other |
| Transaction ID | Text | Optional (e.g., UTR number) |
| Reference # | Text | Optional |
| Notes | Text | Optional |

- Manual payments are recorded with `reconciliationStatus: pending` for admin review

#### Transaction Details Modal
- Shows bill summary: Total Amount, Paid, Balance Due
- Lists all payment records with full details (same as admin view)

---

### 9.3 My Tickets

**URL:** `/customer/tickets`

#### Stat Cards (4 cards)

| Card | Value |
|------|-------|
| Total Tickets | Total count |
| Open | Open tickets |
| In Progress | In-progress tickets |
| Closed | Resolved or closed tickets |

#### Filters
- **Status dropdown:** All Status, Open, In Progress, Resolved, Closed
- **Search:** Searches by ticket ID and subject
- **Date range picker:** Filters by creation date

#### Raise Ticket Form

| Field | Type | Options |
|-------|------|---------|
| Subject | Text | Required |
| Category | Dropdown | Invoicing Issue, Payment Issue, Plan Related, Technical Support, Other |
| Priority | Dropdown | Low, Medium, High, Urgent |
| Description | Textarea | Required |

#### Tickets Table

| Column | Description |
|--------|------------|
| Ticket | Ticket ID (clickable, opens chat) |
| Subject | Ticket subject |
| Priority | Color-coded badge |
| Status | Color-coded badge |
| Updated | Last update date |

Note: Customers cannot delete tickets.

#### Chat Interface
- Same multi-tab chat interface as admin (without status change or email draft controls)
- Supports message input and file attachments (images, videos, files up to 2MB)
- Closed tickets show "This ticket is closed" message instead of input area

---

### 9.4 Customer Settings

**URL:** `/customer/settings`

#### Profile Display (Read-only)

| Field | Source |
|-------|--------|
| Name | Current user's name |
| Email | Current user's email |
| Company | Company name or dash |
| Customer ID | Customer ID (e.g., CUST00001) or dash |

#### Change Password Form
Same as Admin Settings: Current Password, New Password (min 6 chars), Confirm New Password.

---

## 10. Notification System

Notifications are **generated dynamically** at request time — they are not stored as separate documents. Instead, the system queries the actual data (bills, tickets) and constructs notification objects on each poll.

### Polling
- Frontend polls for notifications every **60 seconds**
- Notification bell displays a red badge with the **unread count**

### Notification Types

**For Customers:**

| Notification | Trigger | Icon |
|-------------|---------|------|
| Overdue Invoice | Bill with status "overdue" | Warning (red) |
| Due Soon | Bill with due date within 3 days (not paid/cancelled) | Warning (amber) |
| Open Ticket Updated | Ticket with status "open" or "in-progress" | Info (default) |

**For Admins:**

| Notification | Trigger | Icon |
|-------------|---------|------|
| Overdue Bill | Any bill with status "overdue" | Warning (red) |
| Pending Bill | Any bill with status "pending" | Warning (amber) |
| Open Ticket | Any ticket with status "open" or "in-progress" | Info (default) |

### Read/Unread Tracking
- The `NotificationRead` model stores `{ userId, key }` pairs
- When a user clicks a notification, it is marked as read
- **"Read all"** button marks all current notifications as read in bulk
- Unread notifications display a colored dot indicator
- Badge count reflects only unread notifications

---

## 11. Email System

### Email Transport
- Uses Nodemailer with configurable SMTP settings
- Default: Gmail SMTP (`smtp.gmail.com:587`)
- From address: `{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>` (defaults to "RECORDRx")

### Automated Emails

| Email Type | Trigger | Recipient | Subject Format |
|-----------|---------|-----------|---------------|
| **Invoice Email** | Bill generated (manual or auto) | Customer | `Invoice {INV#} — INR {amount} due by {date}` |
| **Payment Confirmation** | Payment recorded (online or manual) | Customer | `Payment Received — INR {amount} for Invoice {INV#}` |
| **Welcome Email** | New customer created via Customer Mgmt | Customer + Admin | Customer: `Welcome to RECORDRx — Your {Plan} Plan is Active`; Admin: `New Customer Added — {name} ({custId}) | {Plan} Plan` |
| **Ticket Message Email** | Admin sends message (with draft) | Customer | Draft subject line |
| **Monthly Report** | Cron job (2nd of month) or manual trigger | Admin + Report Receiver | `RECORDRx Monthly Report — {Month} | Billed: INR X | Collected: INR Y` |

### Email Templates
All emails use professionally formatted HTML templates with:
- RECORDRx branding header
- Structured content tables
- Color-coded status indicators
- Responsive design

### Email Draft Templates (22 templates)

The system includes 22 pre-built email templates for common customer support scenarios, organized in request/resolved pairs:

| Issue Type | Templates | Key Variables |
|-----------|-----------|--------------|
| Payment Not Reflecting | Request + Resolved | `customerName`, `ticketId`, `transactionId` |
| Invoice Dispute | Request + Resolved | `customerName`, `invoiceNumber`, `resolutionSummary` |
| Refund Request | Request + Resolved | `customerName`, `orderId`, `amount` |
| Payment Failed | Request + Resolved | `customerName`, `ticketId` |
| Duplicate Payment | Request + Resolved | `customerName`, `ticketId`, `amount` |
| Receipt Missing | Request + Resolved | `customerName`, `transactionId`, `emailAddress` |
| Technical Issue | Request + Resolved | `customerName`, `ticketId`, `rootCause`, `fixSummary` |
| Account Access | Request + Resolved | `customerName`, `email` |
| Feature Request | Request + Resolved | `customerName`, `requestId`, `status` |
| Subscription Change | Request + Resolved | `customerName`, `subscriptionName`, `effectiveDate` |
| General Inquiry | Request + Resolved | `customerName`, `summary` |

- **Request templates** (suffix `_request`): Initial response asking customer for additional information
- **Resolved templates** (suffix `_resolved`): Resolution notification with specific details
- Templates support `{{ variableName }}` placeholder syntax, replaced at send time
- Each request template includes a `customerQuestions` field listing what information to gather

### Monthly Report Email
The monthly report aggregates the previous month's data into a comprehensive email:
- **Key Metrics:** Total Billed, Total Collected, Outstanding Balance
- **Billing Summary:** Total bills, paid, pending, overdue counts
- **Collection Rate:** With visual progress bar
- **Payment Summary:** Total payments processed
- **Customer Summary:** Total, active, new customers for the month
- **Ticket Summary:** Total, open, closed tickets
- **Top 5 Outstanding Customers:** Ranked by outstanding balance

---

## 12. Payment Integration (Razorpay)

### Overview
The portal integrates Razorpay for secure online payment processing. The flow follows a 7-step process with server-side signature verification.

### Payment Flow

```
Step 1: Customer clicks "Pay Now" on an invoice
     |
Step 2: Frontend fetches Razorpay public key from backend
     |       GET /api/razorpay/key
     |
Step 3: Frontend creates a Razorpay order
     |       POST /api/razorpay/create-order { billId, amount }
     |       Backend creates order via Razorpay API (amount in paise)
     |       Returns { orderId, amount, currency: "INR", ... }
     |
Step 4: Razorpay checkout popup opens with order details
     |       Prefilled: Customer name, email
     |       Amount displayed in INR
     |
Step 5: Customer completes payment in Razorpay popup
     |
Step 6: Frontend receives callback with:
     |       { razorpay_order_id, razorpay_payment_id, razorpay_signature }
     |
Step 7: Backend verifies and records payment
         POST /api/razorpay/verify-payment
         HMAC-SHA256 signature verification: SHA256(orderId|paymentId, secret)
         Fetches payment details from Razorpay API
         Maps payment method (card, UPI, netbanking, etc.)
         Creates Payment record with status: "completed"
         Updates bill: paidAmount, balanceDue, status
         Updates customer: outstandingBalance
         Sends payment confirmation email
```

### Security
- Razorpay key format validated (must start with `rzp_`)
- Signature verification using HMAC-SHA256 prevents payment tampering
- Bill ownership verified for customer-role users
- Amount validated against bill balance to prevent overpayment

### Payment Method Mapping
When receiving payment from Razorpay, the method is mapped to the internal system:
- `card` → `credit_card` or `debit_card` (based on card type)
- `upi` → `upi`
- `netbanking` → `online`
- `wallet` → `online`
- Other → `online`

---

## 13. Automated Tasks (Cron Jobs)

Three cron jobs run automatically when the server is hosted in a non-serverless environment (disabled on Vercel):

### 1. Monthly Prepaid Bill Generation
- **Schedule:** 1st of every month at 00:05 AM
- **Cron expression:** `5 0 1 * *`
- **Logic:**
  1. Finds all active customers with `subscriptionAmount > 0` and `billingCycle: monthly`
  2. Populates the customer's plan and offer records
  3. Skips if a bill already exists for the current month
  4. If an offer is active and `offerMonthsUsed < offerMonths`:
     - Applies percentage discount or flat discount to the subscription amount
     - Increments `offerMonthsUsed`
  5. Calculates GST using: plan GST rate → config tax rate → 18% (fallback chain)
  6. Generates `billNumber` (format: `RRX{YY}{MM}{NNNN}`) and `invoiceNumber` (format: `INV/{YYYY}/{NNNNN}`)
  7. Creates the bill with `isAutoGenerated: true`, `billingType: prepaid`
  8. Updates customer's `lastBillDate` and `outstandingBalance`
  9. Sends invoice email to the customer (non-blocking)

### 2. Overdue Bill Marking
- **Schedule:** Daily at 00:30 AM
- **Cron expression:** `30 0 * * *`
- **Logic:**
  - Finds all bills with status `pending` or `partial` where `graceDate` has passed
  - Updates their status to `overdue` in bulk

### 3. Monthly Financial Report
- **Schedule:** 2nd of every month at 08:00 AM
- **Cron expression:** `0 8 2 * *`
- **Logic:**
  - Generates a comprehensive financial report for the previous month
  - Sends the report email to `ADMIN_EMAIL` and `REPORT_RECEIVER_EMAIL`

---

## 14. Database Schema

### Collections Overview

| Collection | Model | Purpose |
|-----------|-------|---------|
| users | User | All user accounts (admin, staff, customer) |
| customers | Customer | Customer billing records with subscription and tenant details |
| bills | Bill | Invoices with line items, amounts, and payment status |
| payments | Payment | Payment transactions with reconciliation tracking |
| plans | Plan | Subscription plan definitions |
| offers | Offer | Discount offers with customer targeting |
| tickets | Ticket | Support tickets with embedded chat messages |
| invoicingconfigs | InvoicingConfig | Company and billing configuration (singleton) |
| notificationreads | NotificationRead | Notification read/unread state per user |

### User Model

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | String | Yes | — | — |
| email | String | Yes (unique) | — | Lowercase |
| password | String | Yes | — | bcrypt hashed |
| role | String | No | viewer | Enum: superadmin, admin, manager, staff, viewer, customer |
| phone | String | No | '' | — |
| company | String | No | '' | For customer role |
| address | String | No | '' | — |
| plan | String | No | '' | Plan reference for customers |
| planType | String | No | '' | Enum: monthly, yearly, '' |
| offer | String | No | '' | Offer reference for customers |
| offerMonths | Number | No | 0 | Offer duration in months |
| customerId | String | No | '' | e.g., CUST00001 |
| status | String | No | active | Enum: active, inactive, suspended |
| lastLogin | Date | No | — | Updated on login |
| createdAt | Date | No | Date.now | — |
| updatedAt | Date | No | Date.now | — |

### Customer Model

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| customerId | String | Yes (unique) | — | e.g., CUST00001 |
| name | String | Yes | — | — |
| email | String | Yes | — | Lowercase |
| phone | String | Yes | — | — |
| address | String | No | '' | — |
| gstin | String | No | — | GST Identification Number |
| plan | ObjectId (ref: Plan) | No | null | Assigned plan |
| billingCycle | String | No | monthly | Enum: monthly, quarterly, yearly |
| subscriptionPlan | String | No | basic | Enum: basic, standard, premium, enterprise |
| subscriptionAmount | Number | No | 0 | Monthly/yearly amount |
| planStartDate | Date | No | null | When the plan started |
| offer | ObjectId (ref: Offer) | No | null | Applied offer |
| offerMonths | Number | No | 0 | Total offer duration |
| offerStartDate | Date | No | null | When the offer started |
| offerMonthsUsed | Number | No | 0 | Months of offer consumed |
| status | String | No | active | Enum: active, inactive, suspended |
| outstandingBalance | Number | No | 0 | Running balance |
| lastBillDate | Date | No | — | Most recent bill date |
| nextBillDate | Date | No | — | Next scheduled bill |

**Tenant Synchronization Fields** (for external app integration):

| Field | Type | Notes |
|-------|------|-------|
| tenantId | String | External system tenant identifier |
| hostName | String | Tenant's hostname (lowercase) |
| currency | String | Preferred currency |
| config | Object | Custom configuration object |
| logo | String | Logo URL |
| longitude / latitude | String | Location coordinates |
| digipin | String | Digital PIN |
| ownerInfo | Object | Owner details |
| isActive | Boolean | Tenant active status |
| workingHours | Array | Day-wise open/close times |
| exceptionDays | Array | Holiday/exception dates with reasons |
| apptMinLeadTime | Number | Minimum appointment lead time (default: 0) |
| apptMaxAdvanceWindow | Number | Max advance booking days (default: 30) |
| registrationNumber | String | Business registration |
| taxId | String | Tax identification |
| website | String | Business website |
| contactPerson / contactEmail / contactPhone | String | Contact details |
| planType / planStatus / planExpiryDate | String/Date | External plan tracking |

### Bill Model

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| billNumber | String | Yes (unique) | — | Format: RRX{YY}{MM}{NNNN} |
| invoiceNumber | String | Yes (unique) | — | Format: INV/{YYYY}/{NNNNN} |
| customerId | ObjectId (ref: Customer) | Yes | — | — |
| customerName | String | No | — | Denormalized for display |
| customerEmail | String | No | — | — |
| customerPhone | String | No | — | — |
| customerAddress | String | No | — | — |
| customerGstin | String | No | — | — |
| billingPeriodStart | Date | Yes | — | — |
| billingPeriodEnd | Date | Yes | — | — |
| items | Array of BillItem | No | — | Line items (see below) |
| subtotal | Number | Yes | — | Sum of item amounts |
| taxAmount | Number | No | 0 | Total tax |
| discount | Number | No | 0 | Discount amount |
| discountType | String | No | fixed | Enum: percentage, fixed |
| totalAmount | Number | Yes | — | Final amount |
| paidAmount | Number | No | 0 | Total payments received |
| balanceDue | Number | Yes | — | Auto-calculated: totalAmount - paidAmount |
| status | String | No | pending | Enum: draft, pending, partial, paid, overdue, cancelled |
| billingType | String | No | prepaid | Enum: prepaid, postpaid |
| issueDate | Date | No | Date.now | — |
| dueDate | Date | Yes | — | — |
| graceDate | Date | No | — | Due date + grace period |
| paidDate | Date | No | — | Auto-set when fully paid |
| notes | String | No | — | Customer-visible notes |
| internalNotes | String | No | — | Admin-only notes |
| isAutoGenerated | Boolean | No | false | True for cron-generated bills |

**BillItem sub-document:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| description | String | Yes | — |
| quantity | Number | No | 1 |
| unitPrice | Number | Yes | — |
| amount | Number | Yes | — |
| taxRate | Number | No | 18 |
| taxAmount | Number | No | 0 |

**Auto-calculation on save:**
- `balanceDue = totalAmount - paidAmount`
- If `paidAmount >= totalAmount` → status = paid, sets paidDate
- If `paidAmount > 0` and `< totalAmount` → status = partial
- If past due and not cancelled → status = overdue

### Payment Model

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| paymentId | String | Yes (unique) | — | Format: PAY{YY}{MM}{DD}{NNNN} |
| billId | ObjectId (ref: Bill) | Yes | — | — |
| customerId | ObjectId (ref: Customer) | Yes | — | — |
| billNumber | String | No | — | Denormalized |
| customerName | String | No | — | Denormalized |
| amount | Number | Yes | — | Payment amount |
| paymentMethod | String | Yes | — | Enum: cash, bank_transfer, upi, credit_card, debit_card, cheque, online, other |
| paymentDate | Date | No | Date.now | — |
| transactionId | String | No | — | e.g., UTR number |
| referenceNumber | String | No | — | Reference number |
| razorpayOrderId | String | No | — | Razorpay order ID |
| razorpayPaymentId | String | No | — | Razorpay payment ID |
| razorpaySignature | String | No | — | Razorpay signature |
| bankName | String | No | — | For bank transfers/cheques |
| chequeNumber | String | No | — | For cheque payments |
| chequeDate | Date | No | — | For cheque payments |
| reconciliationStatus | String | No | pending | Enum: pending, matched, unmatched, disputed, resolved |
| reconciliationDate | Date | No | — | When reconciled |
| reconciledBy | String | No | — | Who reconciled |
| reconciliationNotes | String | No | — | Reconciliation notes |
| bankStatementRef | String | No | — | Bank statement reference |
| bankStatementDate | Date | No | — | Bank statement date |
| bankStatementAmount | Number | No | — | Amount on bank statement |
| amountDifference | Number | No | 0 | Auto-calculated: bankStatementAmount - amount |
| status | String | No | completed | Enum: pending, completed, failed, refunded, cancelled |
| notes | String | No | — | — |

### Plan Model

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | String | Yes | — | Plan name |
| planType | String | No | monthly | Enum: monthly, yearly |
| price | Number | No | 0 | Base price |
| gst | Number | No | 0 | GST percentage |
| description | String | No | '' | — |
| status | String | No | active | Enum: active, inactive |

### Offer Model

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | String | Yes | — | Offer name |
| discountPercent | Number | No | 0 | Percentage discount |
| discountAmount | Number | No | 0 | Flat discount |
| validFrom | Date | No | — | Start of validity |
| validUntil | Date | No | — | End of validity |
| applicablePlans | Array of String | No | — | Applicable plan IDs |
| applicableCustomers | Array of ObjectId (ref: Customer) | No | — | Targeted customers |
| status | String | No | active | Enum: active, inactive |

### Ticket Model

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| ticketId | String | Yes (unique) | — | Format: TKT{NNNNN} |
| subject | String | Yes | — | — |
| description | String | No | '' | Initial description |
| category | String | No | other | Enum: invoicing, payment, plan, technical, other |
| priority | String | No | medium | Enum: low, medium, high, urgent |
| status | String | No | pending | Enum: pending, in-progress, closed |
| customerId | ObjectId (ref: User) | No | — | Customer who raised it |
| customerName | String | No | '' | Denormalized |
| customerEmail | String | No | '' | Denormalized |
| assignedTo | ObjectId (ref: User) | No | — | Assigned staff |
| messages | Array of Message | No | — | Chat messages (see below) |

**Message sub-document:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| sender | String | Yes | — | Enum: admin, customer |
| senderName | String | No | '' | Display name |
| senderId | ObjectId (ref: User) | No | — | — |
| text | String | No | '' | Message text |
| attachment.name | String | No | — | File name |
| attachment.type | String | No | — | MIME type |
| attachment.size | Number | No | — | File size in bytes |
| attachment.url | String | No | — | Download URL |
| timestamp | Date | No | Date.now | — |

### InvoicingConfig Model (Singleton)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| companyName | String | RECORDRx | — |
| companyTagline | String | FUTURE OF PATIENT CARE - POWERED BY AI | — |
| companyAddress | String | '' | — |
| companyGstin | String | '' | — |
| companyPhone | String | '' | — |
| companyEmail | String | '' | — |
| bankName | String | '' | — |
| bankAccountNumber | String | '' | — |
| bankIfscCode | String | '' | — |
| bankBranch | String | '' | — |
| invoicePrefix | String | INV | — |
| termsAndConditions | String | '' | — |
| notes | String | '' | — |
| billingModel | String | prepaid | Enum: prepaid, postpaid |
| billGenDay | Number | 1 | Day of month for auto-generation |
| billDueDay | Number | 5 | Due day offset |
| graceDay | Number | 7 | Grace period days |
| taxRate | Number | 18 | Default GST rate (%) |

### NotificationRead Model

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| userId | ObjectId (ref: User) | Yes | — |
| key | String | Yes | Notification identifier |
| readAt | Date | No | Default: Date.now |

Compound unique index on `{ userId, key }`.

---

## 15. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| POST | `/api/auth/login` | No | Login with email and password. Returns JWT token. |
| GET | `/api/auth/me` | Yes | Get current user profile. |
| PUT | `/api/auth/change-password` | Yes | Change password (requires current password). |

### Users

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/users` | Admin+ | List all non-customer users. Supports role, status, search filters. |
| POST | `/api/users` | Admin+ | Create a new staff/admin user. |
| PUT | `/api/users/:id` | Admin+ | Update user (except password). |
| DELETE | `/api/users/:id` | Admin+ | Delete user. Superadmins cannot be deleted. |
| GET | `/api/users/customers` | Admin+ | List all customer-role users. |
| POST | `/api/users/customers` | Admin+ | Create customer with User + billing record + prorated bill + welcome email. |
| PUT | `/api/users/customers/:id` | Admin+ | Update customer user (syncs to billing Customer record). |
| DELETE | `/api/users/customers/:id` | Admin+ | Delete customer user and billing record. |

### Customers (Billing Records)

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/customers` | Admin | List customers with pagination. Supports status, search, page, limit. |
| POST | `/api/customers` | Admin | Create billing customer record. Auto-generates customerId. |
| GET | `/api/customers/:id` | Yes | Get single customer. |
| PUT | `/api/customers/:id` | Admin | Update customer. |
| DELETE | `/api/customers/:id` | Admin | Delete customer. |

### Bills

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/bills` | Yes | List bills with pagination and summary. Customer role auto-filters to own bills. |
| POST | `/api/bills/generate` | Admin | Generate a bill with line items. Auto-calculates taxes. Sends invoice email. |
| GET | `/api/bills/:id` | Yes | Get single bill. |
| GET | `/api/bills/:id/invoice` | Yes | Download bill as PDF. |

### Payments

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/payments` | Yes | List payments with pagination and reconciliation summary. |
| POST | `/api/payments` | Yes | Record a manual payment. Validates ownership for customers. Sends confirmation email. |
| PUT | `/api/payments/:id/reconcile` | Admin | Update reconciliation status for a payment. |

### Razorpay

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/razorpay/key` | Yes | Get Razorpay public key. |
| POST | `/api/razorpay/create-order` | Yes | Create a Razorpay payment order. |
| POST | `/api/razorpay/verify-payment` | Yes | Verify Razorpay payment signature and record payment. |
| GET | `/api/razorpay/test` | Yes | Test Razorpay API credentials. |

### Plans

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/plans` | Yes | List all plans (sorted by creation date, newest first). |
| POST | `/api/plans` | Admin | Create a plan. |
| PUT | `/api/plans/:id` | Admin | Update a plan. |
| DELETE | `/api/plans/:id` | Admin | Delete a plan. |

### Offers

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/offers` | Yes | List all offers with populated customer data. |
| POST | `/api/offers` | Admin | Create an offer. |
| PUT | `/api/offers/:id` | Admin | Update an offer. |
| DELETE | `/api/offers/:id` | Admin | Delete an offer. |

### Configuration

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/config/invoicing` | Admin | Get invoicing configuration (creates default if none exists). |
| PUT | `/api/config/invoicing` | Admin | Update invoicing configuration. |

### Dashboard

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/dashboard/stats` | Yes | Get dashboard statistics. Returns different data for admin and customer roles. |

### Email

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/email/test-connection` | Admin | Test SMTP connection. |
| POST | `/api/email/send-test` | Admin | Send a test email. |
| POST | `/api/email/send-invoice` | Admin | Send an invoice notification email. |
| GET | `/api/email/config` | Admin | Get email server configuration. |
| GET | `/api/email/drafts` | Public | Get all email draft templates. |
| POST | `/api/email/send-draft` | Admin | Send a draft email with template variable replacement. |
| POST | `/api/email/send-monthly-report` | Admin | Generate and send monthly financial report. |

### Tickets

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/tickets` | Yes | List tickets. Customer role auto-filters to own tickets. |
| POST | `/api/tickets` | Yes | Create a new ticket. |
| GET | `/api/tickets/:id` | Yes | Get ticket with messages. |
| POST | `/api/tickets/:id/messages` | Yes | Add a message with optional file attachment. Sends email notification. |
| PUT | `/api/tickets/:id/status` | Admin | Update ticket status. |
| DELETE | `/api/tickets/:id` | Admin | Delete a ticket. |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/notifications` | Yes | Get dynamically generated notifications with read/unread status. |
| PUT | `/api/notifications/read-all` | Yes | Mark all specified notifications as read. |
| PUT | `/api/notifications/:key/read` | Yes | Mark a single notification as read. |

### Health Check

| Method | Endpoint | Auth | Description |
|--------|---------|------|------------|
| GET | `/api/health` | No | Returns { status: ok, timestamp }. |

---

## 16. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|------------|
| PORT | No | 5000 | Server port (local development) |
| VERCEL | Auto | — | Set by Vercel. Disables cron jobs and app.listen. |
| MONGODB_URI | Yes | mongodb://localhost:27017/recordrx | MongoDB connection string |
| JWT_SECRET | Yes | recordrx-secret-key | Secret key for JWT signing |
| JWT_EXPIRES_IN | No | 7d | JWT token expiration |
| EMAIL_HOST | No | smtp.gmail.com | SMTP server hostname |
| EMAIL_PORT | No | 587 | SMTP server port |
| EMAIL_SECURE | No | false | Use TLS (true for port 465) |
| EMAIL_USER | Yes | — | SMTP username/email |
| EMAIL_PASSWORD | Yes | — | SMTP password or app password |
| EMAIL_FROM_NAME | No | RECORDRx | Display name in "From" field |
| EMAIL_FROM_ADDRESS | No | Same as EMAIL_USER | "From" email address |
| ADMIN_EMAIL | Yes | — | Admin email for notifications and welcome emails |
| REPORT_RECEIVER_EMAIL | No | — | Additional recipient for monthly reports |
| RAZORPAY_KEY_ID | Yes | — | Razorpay public key (starts with rzp_) |
| RAZORPAY_KEY_SECRET | Yes | — | Razorpay secret key |

---

## 17. Deployment

### Hosting Platform
Both frontend and backend are deployed on **Vercel** as separate projects.

### Frontend Deployment
- **Framework:** Next.js (auto-detected by Vercel)
- **Root directory:** `frontend`
- **Build command:** `next build` (auto)
- **Output directory:** `.next` (auto)
- **Environment variable:**
  - `NEXT_PUBLIC_API_URL` = `https://recordrx-backend.vercel.app/api`

### Backend Deployment
- **Framework:** Other (Express.js as serverless function)
- **Root directory:** `backend`
- **Vercel configuration** (`backend/vercel.json`):
  ```json
  {
    "version": 2,
    "builds": [{ "src": "server.js", "use": "@vercel/node" }],
    "routes": [{ "src": "/(.*)", "dest": "server.js" }]
  }
  ```
- All routes are directed to `server.js` deployed as a single serverless function
- `module.exports = app` exposes the Express app to Vercel's serverless runtime
- Cron jobs and `app.listen()` wrapped in `if (!process.env.VERCEL)` to prevent serverless crashes

### Environment Variables (Backend — Vercel)
All environment variables listed in Section 16 must be configured in the Vercel project's environment variables settings.

---

## Appendix A: ID Format Reference

| Entity | Format | Example |
|--------|--------|---------|
| Customer ID | CUST{NNNNN} | CUST00001 |
| Bill Number | RRX{YY}{MM}{NNNN} | RRX25010001 |
| Invoice Number | INV/{YYYY}/{NNNNN} | INV/2025/00001 |
| Payment ID | PAY{YY}{MM}{DD}{NNNN} | PAY2501150001 |
| Ticket ID | TKT{NNNNN} | TKT00001 |

## Appendix B: Status Values Reference

### Bill Status Flow
```
draft -> pending -> partial -> paid
                 \            /
                  -> overdue
                  cancelled
```

| Status | Color | Description |
|--------|-------|------------|
| Draft | Gray | Created but not finalized |
| Pending | Amber | Awaiting payment |
| Partial | Blue | Partially paid |
| Paid | Green | Fully paid |
| Overdue | Red | Past due date and grace period |
| Cancelled | Slate | Cancelled |

### Ticket Status Flow
```
pending -> in-progress -> closed
```

| Status | Color | Description |
|--------|-------|------------|
| Pending (Open) | Blue/Amber | Newly created, awaiting response |
| In Progress | Cyan/Amber | Being worked on |
| Resolved/Closed | Green/Slate | Issue resolved |

### Payment Reconciliation Status

| Status | Description |
|--------|------------|
| Pending | Not yet reconciled |
| Matched | Payment matches bank statement |
| Unmatched | Payment does not match bank records |
| Disputed | Under dispute |
| Resolved | Dispute resolved |

### Customer/User Status

| Status | Description |
|--------|------------|
| Active | Account is active and functional |
| Inactive | Account is deactivated |
| Suspended | Account is temporarily suspended |

---

*End of Document*
