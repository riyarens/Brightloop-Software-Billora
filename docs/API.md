# BILLORA – API Specification & Integration Contract
**Project:** BILLORA – Subscription Management System (Brightloop Software)  
**Hackathon:** Odoo Hackathon  
**Author / Tech Lead:** Member 1 – Riya (Branch: `Riya`)  
**Base URL:** `http://localhost:5000/api`

---

## 1. Standard Response Format

All APIs follow a unified envelope for both success and error responses.

### 1.1 Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### 1.2 Error Response (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "message": "Validation failed or error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address format"
    }
  ]
}
```

---

## 2. Authentication & Authorization

All protected routes require an HTTP Authorization header with a Bearer JWT:
```http
Authorization: Bearer <jwt_token>
```

### Roles:
- `ADMIN`: Full access to all endpoints, configurations, staff creation, and all records.
- `STAFF`: Day-to-day operations, customer and subscription management. Cannot create staff accounts.
- `CUSTOMER`: Access restricted exclusively to their own profile, subscriptions, invoices, and payments. Customer data isolation is strictly enforced at the database query layer.

---

## 3. Module 1: Authentication (`/api/auth`)

### 3.1 Register User
- **Endpoint:** `POST /api/auth/register`
- **Access:** Public
- **Description:** Registers a new user. Enforces strong password policy (>8 chars, uppercase, lowercase, special char).
- **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "StrongPassword!123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER"
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "createdAt": "2026-10-31T00:00:00.000Z"
    },
    "token": "jwt_token_string"
  }
}
```

### 3.2 Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword!123"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ADMIN"
    },
    "token": "jwt_token_string"
  }
}
```

### 3.3 Forgot Password
- **Endpoint:** `POST /api/auth/forgot-password`
- **Access:** Public
- **Description:** Generates a cryptographically secure token (30-minute expiry), saves token hash, and sends reset email via Nodemailer/Mailtrap.
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "If this email is registered, a password reset link has been dispatched."
}
```

### 3.4 Reset Password
- **Endpoint:** `POST /api/auth/reset-password`
- **Access:** Public
- **Request Body:**
```json
{
  "token": "raw_reset_token_from_email",
  "password": "NewStrongPassword!456"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

### 3.5 Current Authenticated User Profile
- **Endpoint:** `GET /api/auth/me`
- **Access:** Authenticated (`ADMIN`, `STAFF`, `CUSTOMER`)
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "User profile fetched",
  "data": {
    "id": "uuid",
    "email": "admin@brightloop.com",
    "firstName": "Riya",
    "lastName": "Admin",
    "role": "ADMIN",
    "customer": null
  }
}
```

---

## 4. Module 2: Staff Management (`/api/users/staff`)

### 4.1 Create Staff Account
- **Endpoint:** `POST /api/users/staff`
- **Access:** `ADMIN` only (Forbidden to `STAFF` and `CUSTOMER` with `403`)
- **Request Body:**
```json
{
  "email": "staff1@brightloop.com",
  "password": "StaffPassword!123",
  "firstName": "Alex",
  "lastName": "Smith"
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Staff account created successfully",
  "data": {
    "id": "uuid",
    "email": "staff1@brightloop.com",
    "firstName": "Alex",
    "lastName": "Smith",
    "role": "STAFF",
    "isActive": true
  }
}
```

### 4.2 List Staff Accounts
- **Endpoint:** `GET /api/users/staff`
- **Access:** `ADMIN`
- **Query Params:** `?page=1&limit=10&search=alex`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Staff members retrieved",
  "data": [
    {
      "id": "uuid",
      "email": "staff1@brightloop.com",
      "firstName": "Alex",
      "lastName": "Smith",
      "role": "STAFF",
      "isActive": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 4.3 Get Staff Member by ID
- **Endpoint:** `GET /api/users/staff/:id`
- **Access:** `ADMIN`

---

## 5. Module 3: Customer Management (`/api/customers`)

### 5.1 List Customers
- **Endpoint:** `GET /api/customers`
- **Access:** `ADMIN`, `STAFF`
- **Query Params:** `?page=1&limit=10&search=bright&status=active`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Customers retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "phone": "+91 9876543210",
      "company": "Acme Corp",
      "city": "Mumbai",
      "country": "India",
      "taxId": "27AAAAA0000A1Z5",
      "isActive": true,
      "_count": {
        "subscriptions": 2,
        "invoices": 4
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5.2 Get Customer Details
- **Endpoint:** `GET /api/customers/:id`
- **Access:** `ADMIN`, `STAFF`, or `CUSTOMER` (only their own ID; returns `403` if customer attempts to read another customer)
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Customer retrieved",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "subscriptions": [],
    "invoices": []
  }
}
```

### 5.3 Update Customer Details
- **Endpoint:** `PUT /api/customers/:id`
- **Access:** `ADMIN`, `STAFF`, or owning `CUSTOMER`
- **Request Body:**
```json
{
  "name": "Acme Global Corp",
  "phone": "+91 9876543211",
  "address": "42 Tech Park, Bandra",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postalCode": "400050"
}
```

---

## 6. Module 4: Subscription Lifecycle Management (`/api/subscriptions`)

### 6.1 Create Subscription
- **Endpoint:** `POST /api/subscriptions`
- **Access:** `ADMIN`, `STAFF`
- **Request Body:**
```json
{
  "customerId": "uuid",
  "planId": "uuid",
  "quotationId": "uuid",
  "startDate": "2026-11-01T00:00:00.000Z",
  "paymentTerms": "30 Days Net",
  "autoRenew": true,
  "notes": "Standard annual corporate license",
  "lines": [
    {
      "productId": "uuid",
      "variantId": "uuid",
      "quantity": 10,
      "unitPrice": "1500.00",
      "taxId": "uuid",
      "discountId": "uuid"
    }
  ]
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "id": "uuid",
    "subscriptionNumber": "SUB-0001",
    "status": "DRAFT",
    "startDate": "2026-11-01T00:00:00.000Z",
    "lines": []
  }
}
```

### 6.2 List Subscriptions
- **Endpoint:** `GET /api/subscriptions`
- **Access:** `ADMIN`, `STAFF`
- **Query Params:** `?page=1&limit=10&status=ACTIVE&customerId=uuid`

### 6.3 Customer Subscriptions Portal
- **Endpoint:** `GET /api/me/subscriptions`
- **Access:** Authenticated `CUSTOMER`
- **Description:** Returns only subscriptions belonging to the calling customer's linked `userId`.

### 6.4 Get Subscription Details
- **Endpoint:** `GET /api/subscriptions/:id`
- **Access:** `ADMIN`, `STAFF`, or owning `CUSTOMER`

### 6.5 Subscription Lifecycle Actions
All state changes trigger a `SubscriptionEvent` and validate plan configuration flags.

| Endpoint | Method | Role | Lifecycle Action | Plan Flag Check |
|---|---|---|---|---|
| `/api/subscriptions/:id/status` | PATCH | ADMIN, STAFF | Status transition (e.g., CONFIRMED -> ACTIVE) | Validates transition graph |
| `/api/subscriptions/:id/pause` | POST | ADMIN, STAFF, CUSTOMER | Pauses active subscription, increments `pauseCount` | `plan.allowPause == true` |
| `/api/subscriptions/:id/resume` | POST | ADMIN, STAFF, CUSTOMER | Resumes paused subscription, recalculates `nextBillingDate` | - |
| `/api/subscriptions/:id/renew` | POST | ADMIN, STAFF | Renews subscription for next period | `plan.allowRenew == true` |
| `/api/subscriptions/:id/close` | POST | ADMIN, STAFF | Early termination / closure | `plan.allowEarlyClose == true` |

---

## 7. Integration Contracts for Teammates

### Member 2: Products, Variants, Plans, Taxes, Discounts & Quotations
- `backend/prisma/schema.prisma` already provides:
  - `Product`
  - `Variant` (with `extraPrice` supporting Odoo variant `+560`)
  - `Plan` (with `daily`, `weekly`, `monthly`, `yearly` periods and flags `allowPause`, `allowRenew`, `allowEarlyClose`, `autoClose`)
  - `PlanProduct`
  - `Tax`
  - `Discount`
  - `QuotationTemplate`
  - `Quotation` & `QuotationLine`
- **Shared Pricing Utility:** Member 2 owns `utils/pricing.ts`. Member 1 provides an isolated adapter interface so calculations remain cleanly unified.

### Member 3: Invoices, Billing Automation & Payments
- Schema models available:
  - `Invoice` & `InvoiceLine`
  - `Payment` (with index on `paymentDate`)
  - `RevenueAlert`
- **Critical Idempotency Constraint:**
  `@@unique([subscriptionId, billingPeriodStart])` on `Invoice` prevents duplicate billing runs for any subscription period.

### Member 4: UI Shell, Seed Data & Dashboards
- Frontend layout architecture supports role-based views (`ADMIN`, `STAFF`, `CUSTOMER`).
- Unified seed runner configured: `npm run prisma:seed` invoking `backend/prisma/seed.ts`.

