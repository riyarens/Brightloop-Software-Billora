/**
 * BILLORA – Member 3 (Nipuna) Integration Test Suite
 * Validates Invoices, Payments, Revenue Leakage Detection, and Recurring Billing Engine.
 */

import { createApp } from '../src/app';
import request from 'supertest';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcrypt';
import { signJwtToken } from '../src/utils/token';
import { Prisma } from '@prisma/client';

const app = createApp();

function makeToken(userId: string, role: 'ADMIN' | 'STAFF' | 'CUSTOMER') {
  return signJwtToken({ userId, role });
}

let adminId: string;
let staffId: string;
let customerId: string;
let customerUserId: string;
let otherCustomerId: string;
let otherCustomerUserId: string;

let adminToken: string;
let staffToken: string;
let customerToken: string;
let otherCustomerToken: string;

let testPlanId: string;
let testProductId: string;
let testSubscriptionId: string;
let testInvoiceId: string;

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function setup() {
  const hash = await bcrypt.hash('Str0ng@Pass!', 10);
  const ts = Date.now();

  const admin = await prisma.user.create({
    data: {
      firstName: 'Billing',
      lastName: 'Admin',
      email: `billadmin-${ts}@billora.test`,
      password: hash,
      role: 'ADMIN',
    },
  });
  adminId = admin.id;
  adminToken = makeToken(admin.id, 'ADMIN');

  const staff = await prisma.user.create({
    data: {
      firstName: 'Billing',
      lastName: 'Staff',
      email: `billstaff-${ts}@billora.test`,
      password: hash,
      role: 'STAFF',
    },
  });
  staffId = staff.id;
  staffToken = makeToken(staff.id, 'STAFF');

  const custUser = await prisma.user.create({
    data: {
      firstName: 'Customer',
      lastName: 'One',
      email: `billcust1-${ts}@billora.test`,
      password: hash,
      role: 'CUSTOMER',
    },
  });
  customerUserId = custUser.id;
  customerToken = makeToken(custUser.id, 'CUSTOMER');

  const cust = await prisma.customer.create({
    data: {
      userId: custUser.id,
      name: 'Acme Corp',
      email: custUser.email,
    },
  });
  customerId = cust.id;

  const otherUser = await prisma.user.create({
    data: {
      firstName: 'Customer',
      lastName: 'Two',
      email: `billcust2-${ts}@billora.test`,
      password: hash,
      role: 'CUSTOMER',
    },
  });
  otherCustomerUserId = otherUser.id;
  otherCustomerToken = makeToken(otherUser.id, 'CUSTOMER');

  const otherCust = await prisma.customer.create({
    data: {
      userId: otherUser.id,
      name: 'Beta LLC',
      email: otherUser.email,
    },
  });
  otherCustomerId = otherCust.id;

  // Create Product & Plan
  const product = await prisma.product.create({
    data: {
      name: `Billing Product ${ts}`,
      code: `BPROD-${ts}`,
      salesPrice: new Prisma.Decimal(1000),
    },
  });
  testProductId = product.id;

  const plan = await prisma.plan.create({
    data: {
      name: `Billing Plan ${ts}`,
      code: `BPLAN-${ts}`,
      billingPeriod: 'MONTHLY',
      billingInterval: 1,
      price: new Prisma.Decimal(1000),
      minQuantity: 1,
    },
  });
  testPlanId = plan.id;

  // Create an active Subscription due for billing
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // yesterday

  const sub = await prisma.subscription.create({
    data: {
      subscriptionNumber: `SUB-BILL-${ts}`,
      customerId: cust.id,
      planId: plan.id,
      status: 'ACTIVE',
      startDate: new Date(),
      paymentTerms: '30 days',
      autoRenew: true,
      nextBillingDate: pastDate,
      lines: {
        create: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice: new Prisma.Decimal(1000),
            total: new Prisma.Decimal(2000),
          },
        ],
      },
    },
  });
  testSubscriptionId = sub.id;

  // Create a confirmed invoice with an overdue dueDate for leakage testing
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 15); // 15 days overdue

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${ts}-TEST`,
      subscriptionId: sub.id,
      customerId: cust.id,
      billingPeriodStart: new Date(Date.now() - 30 * 86400000),
      billingPeriodEnd: new Date(Date.now() - 86400000),
      dueDate: overdueDate,
      subtotal: new Prisma.Decimal(2000),
      total: new Prisma.Decimal(2000),
      amountPaid: new Prisma.Decimal(0),
      status: 'CONFIRMED',
      lines: {
        create: [
          {
            productId: product.id,
            description: 'Monthly ERP',
            quantity: 2,
            unitPrice: new Prisma.Decimal(1000),
            total: new Prisma.Decimal(2000),
          },
        ],
      },
    },
  });
  testInvoiceId = invoice.id;
}

async function teardown() {
  await prisma.payment.deleteMany({ where: { invoiceId: testInvoiceId } });
  await prisma.invoiceLine.deleteMany({ where: { invoiceId: testInvoiceId } });
  await prisma.invoice.deleteMany({ where: { subscriptionId: testSubscriptionId } });
  await prisma.subscriptionLine.deleteMany({ where: { subscriptionId: testSubscriptionId } });
  await prisma.subscription.deleteMany({ where: { id: testSubscriptionId } });
  await prisma.plan.deleteMany({ where: { id: testPlanId } });
  await prisma.product.deleteMany({ where: { id: testProductId } });
  await prisma.customer.deleteMany({ where: { id: { in: [customerId, otherCustomerId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, staffId, customerUserId, otherCustomerUserId] } } });
}

async function runTests() {
  await setup();
  console.log('\n=== MEMBER 3 (NIPUNA) INTEGRATION TESTS ===\n');

  // Test 1: Invoices listing (Admin)
  console.log('Test 1: GET /api/invoices (Admin → 200)');
  const res1 = await request(app)
    .get('/api/invoices')
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res1.status === 200, `got ${res1.status}`);
  assert('Has invoices array', Array.isArray(res1.body?.data));

  // Test 2: Invoices listing (Customer isolation)
  console.log('\nTest 2: GET /api/invoices (Customer isolation)');
  const res2a = await request(app)
    .get('/api/invoices')
    .set('Authorization', `Bearer ${customerToken}`);
  assert('Status 200 for customer', res2a.status === 200, `got ${res2a.status}`);
  assert('Customer sees their invoice', res2a.body?.data?.some((inv: any) => inv.id === testInvoiceId));

  const res2b = await request(app)
    .get('/api/invoices')
    .set('Authorization', `Bearer ${otherCustomerToken}`);
  assert('Other customer sees 0 invoices', res2b.body?.data?.length === 0);

  // Test 3: Get invoice by ID
  console.log('\nTest 3: GET /api/invoices/:id (Admin → 200)');
  const res3 = await request(app)
    .get(`/api/invoices/${testInvoiceId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res3.status === 200, `got ${res3.status}`);
  assert('Invoice ID matches', res3.body?.data?.id === testInvoiceId);
  assert('Has line items', Array.isArray(res3.body?.data?.lines));

  // Test 4: Record partial payment
  console.log('\nTest 4: POST /api/payments (Partial payment → 201)');
  const res4 = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      invoiceId: testInvoiceId,
      amount: 500,
      paymentMethod: 'BANK_TRANSFER',
      transactionReference: 'TXN-001',
    });
  assert('Status 201', res4.status === 201, `got ${res4.status}`);
  assert('Payment amount is 500', Number(res4.body?.data?.amount) === 500);

  // Verify invoice amountPaid updated
  const updatedInv = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
  assert('Invoice amountPaid is 500', Number(updatedInv?.amountPaid) === 500);
  assert('Invoice status remains CONFIRMED', updatedInv?.status === 'CONFIRMED');

  // Test 5: Reject payment exceeding outstanding balance
  console.log('\nTest 5: POST /api/payments (Overpayment → 400)');
  const res5 = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      invoiceId: testInvoiceId,
      amount: 2000, // outstanding is only 1500
      paymentMethod: 'CREDIT_CARD',
    });
  assert('Status 400 for overpayment', res5.status === 400, `got ${res5.status}`);

  // Test 6: Settle remaining balance -> status becomes PAID
  console.log('\nTest 6: POST /api/payments (Final settlement → PAID)');
  const res6 = await request(app)
    .post('/api/payments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      invoiceId: testInvoiceId,
      amount: 1500,
      paymentMethod: 'BANK_TRANSFER',
    });
  assert('Status 201', res6.status === 201, `got ${res6.status}`);
  const fullyPaidInv = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
  assert('Invoice status is now PAID', fullyPaidInv?.status === 'PAID');
  assert('Total equals amountPaid', Number(fullyPaidInv?.total) === Number(fullyPaidInv?.amountPaid));

  // Test 7: Revenue Leakage Report
  console.log('\nTest 7: GET /api/leakage (Leakage summary → 200)');
  const res7 = await request(app)
    .get('/api/leakage')
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res7.status === 200, `got ${res7.status}`);
  assert('Has totalOutstanding', res7.body?.data?.summary?.totalOutstanding !== undefined);

  // Test 8: Recurring Billing Engine - Preview due subscriptions
  console.log('\nTest 8: GET /api/billing/preview (Admin → 200)');
  const res8 = await request(app)
    .get('/api/billing/preview')
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res8.status === 200, `got ${res8.status}`);
  assert('Preview contains due subscription', res8.body?.data?.some((s: any) => s.id === testSubscriptionId));

  // Test 9: Recurring Billing Engine - Generate recurring invoices
  console.log('\nTest 9: POST /api/billing/generate (Admin → 200)');
  const res9 = await request(app)
    .post('/api/billing/generate')
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res9.status === 200, `got ${res9.status}`);
  assert('Generated at least 1 invoice', res9.body?.data?.generated >= 1);

  // Test 10: Idempotency check (Running again skips duplicate billing)
  console.log('\nTest 10: POST /api/billing/generate (Idempotency run → 200, skipped)');
  const res10 = await request(app)
    .post('/api/billing/generate')
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res10.status === 200, `got ${res10.status}`);
  assert('Generated 0 on rerun (idempotent)', res10.body?.data?.generated === 0);

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  if (failed === 0) {
    console.log('🎉 ALL MEMBER 3 (NIPUNA) TESTS PASSED!');
  } else {
    process.exitCode = 1;
  }

  await teardown();
  await prisma.$disconnect();
}

runTests().catch(async (err) => {
  console.error('Test run error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
