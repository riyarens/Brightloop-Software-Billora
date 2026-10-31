# BILLORA – Subscription Management System
> Built for the Odoo Hackathon by Brightloop Software Team

---

## 🚀 Overview
**BILLORA** is an enterprise-grade Subscription Management System designed for **Brightloop Software** to streamline recurring billing, customer subscriptions, automated invoicing, discount & tax management, and revenue leakage detection.

---

## 👥 Team Roles & Responsibilities

| Role | Member | Responsibilities | Assigned Branch |
|---|---|---|---|
| **Member 1 (Team Lead)** | **Riya** | Database Architecture, Authentication (JWT/bcrypt), RBAC, Staff & Customer Management, Subscription Lifecycle, Integration Lead | `Riya` |
| **Member 2** | Teammate | Products, Variants, Plans, Taxes, Discounts, Quotation Templates, Shared Pricing Utility (`pricing.ts`) | Feature Branch |
| **Member 3** | Teammate | Recurring Invoices, Automated Billing Engine, Payments, Overdue Tracking, Revenue Leakage Detection | Feature Branch |
| **Member 4** | Teammate | UI Shell, Shared Layouts, Seed Data, Analytics Dashboards, Performance Optimization | Feature Branch |

---

## 🛠️ Technology Stack

- **Backend:** Node.js, Express.js, TypeScript, REST APIs
- **Database:** PostgreSQL 16+
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT, bcrypt
- **Mailing:** Nodemailer with Mailtrap
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Recharts, react-hot-toast
- **DevOps:** Docker Compose, GitHub

---

## 🗄️ Database Architecture
The database schema (`backend/prisma/schema.prisma`) is centrally owned and maintained by Member 1 (Riya). It includes **20 models**:
1. `User` (RBAC: ADMIN, STAFF, CUSTOMER)
2. `Customer`
3. `Product`
4. `Variant` (with Odoo variant `+560` pricing support)
5. `Plan` (Daily, Weekly, Monthly, Yearly billing cycles)
6. `PlanProduct`
7. `Tax`
8. `Discount`
9. `QuotationTemplate`
10. `Quotation`
11. `QuotationLine`
12. `Subscription` (Full state-machine lifecycle)
13. `SubscriptionLine`
14. `SubscriptionEvent` (Audit trail for lifecycle changes)
15. `Invoice` (Includes idempotency constraint: `@@unique([subscriptionId, billingPeriodStart])`)
16. `InvoiceLine`
17. `Payment` (Indexed on `paymentDate`)
18. `AuditLog`
19. `Notification`
20. `RevenueAlert` (Overdue and leakage tracking)

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v20+ or v22+)
- PostgreSQL (v16+)
- npm

### 2. Environment Setup
Create `backend/.env` based on `.env.example`:
```bash
cp .env.example backend/.env
```
Ensure your PostgreSQL credentials in `DATABASE_URL` are correct:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billora_db?schema=public"
```

### 3. Database Migration & Prisma Generation
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
```

### 4. Running the Development Server
```bash
cd backend
npm run dev
```
The server will start on `http://localhost:5000` with the healthcheck at `http://localhost:5000/api/health`.

---

## 📖 API Documentation
Detailed API contracts, request payloads, response envelopes, and error schemas are documented in [docs/API.md](file:///c:/Dermo/Brightloop-Software-Billora/docs/API.md).
