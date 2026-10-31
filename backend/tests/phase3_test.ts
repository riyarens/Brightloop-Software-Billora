import http from 'http';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcrypt';
import { BillingPeriod, DiscountType, ProductType, Role, SubscriptionStatus, TaxType } from '@prisma/client';

async function runPhase3Tests() {
  console.log('🧪 Starting Phase 3 - Subscription Management Test Suite...\n');

  const app = createApp();
  const PORT = 5056;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  const BASE_URL = `http://localhost:${PORT}/api`;

  try {
    // 0. Clean DB tables for isolated test run
    console.log('🧹 Cleaning test records...');
    await prisma.subscriptionEvent.deleteMany();
    await prisma.subscriptionLine.deleteMany();
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.planProduct.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.tax.deleteMany();
    await prisma.discount.deleteMany();

    // 1. Seed Prerequisites: Admin, Staff, Customer A, Customer B
    console.log('🌱 Setting up users, roles, and catalog entities...');
    const passwordHash = await bcrypt.hash('TestStrongPassword!123', 10);

    const admin = await prisma.user.create({
      data: { email: 'admin@brightloop.com', password: passwordHash, role: Role.ADMIN, firstName: 'Riya' },
    });
    const staff = await prisma.user.create({
      data: { email: 'staff@brightloop.com', password: passwordHash, role: Role.STAFF, firstName: 'Alex' },
    });
    const custUserA = await prisma.user.create({
      data: { email: 'alice@client.com', password: passwordHash, role: Role.CUSTOMER, firstName: 'Alice' },
    });
    const custUserB = await prisma.user.create({
      data: { email: 'bob@client.com', password: passwordHash, role: Role.CUSTOMER, firstName: 'Bob' },
    });

    const custA = await prisma.customer.create({
      data: { userId: custUserA.id, name: 'Alice Corp', email: 'alice@client.com', company: 'Alice Corp' },
    });
    const custB = await prisma.customer.create({
      data: { userId: custUserB.id, name: 'Bob Inc', email: 'bob@client.com', company: 'Bob Inc' },
    });

    // Seed Product with Odoo Variant (+560)
    const product = await prisma.product.create({
      data: {
        name: 'Enterprise Cloud ERP',
        code: 'ERP-ENT',
        type: ProductType.SERVICE,
        salesPrice: 1000.0,
      },
    });

    const odooVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        brand: 'Odoo',
        name: 'Odoo Enterprise Edition',
        extraPrice: 560.0, // +560 required by hackathon spec
      },
    });

    // Seed Tax (18% Exclusive), Tax (18% Inclusive) and Discount (10%)
    const gstTax = await prisma.tax.create({
      data: {
        name: 'GST 18%',
        rate: 18.0,
        type: TaxType.PERCENTAGE,
        isIncludedInPrice: false,
      },
    });

    const vatInclusiveTax = await prisma.tax.create({
      data: {
        name: 'VAT 18% Inclusive',
        rate: 18.0,
        type: TaxType.PERCENTAGE,
        isIncludedInPrice: true,
      },
    });

    const discount10 = await prisma.discount.create({
      data: {
        name: 'Promo 10%',
        code: 'PROMO10',
        value: 10.0,
        type: DiscountType.PERCENTAGE,
      },
    });

    // Seed Standard Plan (Monthly, minQuantity: 2, all flags true)
    const standardPlan = await prisma.plan.create({
      data: {
        name: 'Monthly Pro Plan',
        code: 'PLAN-PRO',
        billingPeriod: BillingPeriod.MONTHLY,
        billingInterval: 1,
        price: 2000.0,
        minQuantity: 2,
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
      },
    });

    // Seed Strict Plan (No pause, no renew, no early close)
    const strictPlan = await prisma.plan.create({
      data: {
        name: 'Strict Annual Enterprise',
        code: 'PLAN-STRICT',
        billingPeriod: BillingPeriod.YEARLY,
        billingInterval: 1,
        price: 50000.0,
        minQuantity: 1,
        allowPause: false, // Flag disabled
        allowRenew: false, // Flag disabled
        allowEarlyClose: false, // Flag disabled
      },
    });

    // Helper to log in and get JWT
    async function login(email: string) {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'TestStrongPassword!123' }),
      });
      const data = await res.json();
      return data.data.token as string;
    }

    const tokenAdmin = await login('admin@brightloop.com');
    const tokenStaff = await login('staff@brightloop.com');
    const tokenCustA = await login('alice@client.com');
    const tokenCustB = await login('bob@client.com');

    // --------------------------------------------------------------------------
    // Test 1: Subscription Creation & Pricing Adapter Integration
    // --------------------------------------------------------------------------
    console.log('\n--- Test 1: Subscription Creation & Pricing Integration ---');

    // 1a. Attempt creation violating minQuantity (qty 1 < minQuantity 2)
    const resMinQtyFail = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        customerId: custA.id,
        planId: standardPlan.id,
        lines: [
          {
            productId: product.id,
            quantity: 1, // Invalid: min is 2
          },
        ],
      }),
    });
    const dataMinQtyFail = await resMinQtyFail.json();
    console.log(`[1a] MinQuantity violation check: HTTP ${resMinQtyFail.status} (Expected: 400) - Error: "${dataMinQtyFail.message}"`);
    if (resMinQtyFail.status !== 400) throw new Error('MinQuantity violation was not rejected!');

    // 1b. Valid subscription creation with Odoo Variant (+560), Tax (18%), and Discount (10%)
    // Base unit price: 1000 + 560 = 1560
    // Quantity: 2 -> Subtotal = 3120
    // Discount 10% = 312.00 -> Taxable = 2808.00
    // Tax 18% = 505.44
    // Total = 3313.44
    const resCreateSubA = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        customerId: custA.id,
        planId: standardPlan.id,
        paymentTerms: '30 Days Net',
        lines: [
          {
            productId: product.id,
            variantId: odooVariant.id, // Odoo variant +560
            quantity: 2,
            taxId: gstTax.id,
            discountId: discount10.id,
          },
        ],
      }),
    });
    const dataCreateSubA = await resCreateSubA.json();
    console.log(`[1b] Valid Subscription creation: HTTP ${resCreateSubA.status} (Expected: 201)`);
    if (resCreateSubA.status !== 201) throw new Error(`Create subscription failed: ${JSON.stringify(dataCreateSubA)}`);

    const subA = dataCreateSubA.data;
    const subA_Id = subA.id;
    console.log(`[1b] Subscription Number: ${subA.subscriptionNumber} (Unique format verified)`);
    if (!subA.subscriptionNumber.startsWith('SUB-')) throw new Error('Invalid subscription number format!');

    const lineA = subA.lines[0];
    console.log(`[1b] Line Calculations: unitPrice: ${lineA.unitPrice}, discountAmount: ${lineA.discountAmount}, taxRate: ${lineA.taxRate}, total: ${lineA.total}`);
    if (Number(lineA.unitPrice) !== 1560) throw new Error(`Expected unitPrice 1560 (1000+560), got ${lineA.unitPrice}`);
    if (Number(lineA.discountAmount) !== 312) throw new Error(`Expected discount 312, got ${lineA.discountAmount}`);
    if (Number(lineA.total) !== 3313.44) throw new Error(`Expected total 3313.44, got ${lineA.total}`);

    // Verify initial event
    console.log(`[1b] Subscription events count: ${subA.events.length}, Initial event: ${subA.events[0].eventType}`);
    if (subA.events[0].eventType !== 'CREATED') throw new Error('Initial event CREATED was not recorded!');

    // 1c. Valid Tax-Inclusive Subscription Creation (Odoo B2C Mode)
    // Unit price: 1560 (1000 + 560), Qty: 2 -> Gross: 3120
    // Discount: 10% = 312 -> Discounted amount: 2808
    // Tax 18% inclusive: Tax = 2808 * (18 / 118) = 428.34
    // Total = 2808.00 (tax already included in price)
    const resCreateSubInc = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        customerId: custA.id,
        planId: standardPlan.id,
        lines: [
          {
            productId: product.id,
            variantId: odooVariant.id,
            quantity: 2,
            taxId: vatInclusiveTax.id, // Tax with isIncludedInPrice: true
            discountId: discount10.id,
          },
        ],
      }),
    });
    const dataCreateSubInc = await resCreateSubInc.json();
    console.log(`[1c] Tax-Inclusive Subscription: HTTP ${resCreateSubInc.status} (Expected: 201)`);
    if (resCreateSubInc.status !== 201) throw new Error(`Tax-inclusive subscription creation failed: ${JSON.stringify(dataCreateSubInc)}`);
    const lineInc = dataCreateSubInc.data.lines[0];
    console.log(`[1c] Tax-Inclusive calculations: unitPrice: ${lineInc.unitPrice}, discount: ${lineInc.discountAmount}, total: ${lineInc.total}`);
    if (Number(lineInc.total) !== 2808.00) throw new Error(`Expected tax-inclusive total 2808.00, got ${lineInc.total}`);

    console.log('✅ Subscription creation & pricing calculations (tax-exclusive & tax-inclusive) verified.');

    // --------------------------------------------------------------------------
    // Test 2: Lifecycle State Machine Transitions
    // --------------------------------------------------------------------------
    console.log('\n--- Test 2: Lifecycle State Machine Transitions ---');

    // 2a. DRAFT -> QUOTATION
    const resDraftToQuote = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
      body: JSON.stringify({ status: SubscriptionStatus.QUOTATION, note: 'Quotation prepared for client' }),
    });
    const dataDraftToQuote = await resDraftToQuote.json();
    console.log(`[2a] DRAFT -> QUOTATION: HTTP ${resDraftToQuote.status} (Expected: 200) - Status: ${dataDraftToQuote.data?.status}`);
    if (dataDraftToQuote.data?.status !== 'QUOTATION') throw new Error('Transition to QUOTATION failed!');

    // 2b. QUOTATION -> CONFIRMED
    const resQuoteToConf = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
      body: JSON.stringify({ status: SubscriptionStatus.CONFIRMED }),
    });
    const dataQuoteToConf = await resQuoteToConf.json();
    console.log(`[2b] QUOTATION -> CONFIRMED: HTTP ${resQuoteToConf.status} (Expected: 200) - Status: ${dataQuoteToConf.data?.status}`);
    if (dataQuoteToConf.data?.status !== 'CONFIRMED') throw new Error('Transition to CONFIRMED failed!');

    // 2c. CONFIRMED -> ACTIVE (Calculates nextBillingDate)
    const resConfToActive = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
      body: JSON.stringify({ status: SubscriptionStatus.ACTIVE }),
    });
    const dataConfToActive = await resConfToActive.json();
    console.log(`[2c] CONFIRMED -> ACTIVE: HTTP ${resConfToActive.status} (Expected: 200) - NextBillingDate: ${dataConfToActive.data?.nextBillingDate}`);
    if (dataConfToActive.data?.status !== 'ACTIVE' || !dataConfToActive.data?.nextBillingDate) {
      throw new Error('Transition to ACTIVE failed or nextBillingDate not set!');
    }

    // 2d. Invalid transition test: Transitioning from ACTIVE back to DRAFT or QUOTATION -> Expected 400
    const resInvalidRetro = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
      body: JSON.stringify({ status: SubscriptionStatus.DRAFT }),
    });
    console.log(`[2d] Invalid transition ACTIVE -> DRAFT: HTTP ${resInvalidRetro.status} (Expected: 400)`);
    if (resInvalidRetro.status !== 400) throw new Error('Invalid retrograde transition was not rejected!');

    console.log('✅ Lifecycle state transitions verified.');

    // --------------------------------------------------------------------------
    // Test 3: Pause and Resume Operations & Next Billing Date Recalculation
    // --------------------------------------------------------------------------
    console.log('\n--- Test 3: Pause & Resume Operations ---');

    // 3a. Customer A pauses their own active subscription
    const resPause = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCustA}`,
      },
      body: JSON.stringify({ reason: 'Client vacation for 2 weeks' }),
    });
    const dataPause = await resPause.json();
    console.log(`[3a] Customer pauses subscription: HTTP ${resPause.status} (Expected: 200) - isPaused: ${dataPause.data?.isPaused}, pauseCount: ${dataPause.data?.pauseCount}`);
    if (!dataPause.data?.isPaused || dataPause.data?.pauseCount !== 1) {
      throw new Error('Pause subscription failed!');
    }

    // 3b. Attempt to pause an already paused subscription -> Expected 400
    const resAlreadyPaused = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCustA}`,
      },
    });
    console.log(`[3b] Double pause check: HTTP ${resAlreadyPaused.status} (Expected: 400)`);
    if (resAlreadyPaused.status !== 400) throw new Error('Pausing already paused subscription was not rejected!');

    // 3c. Customer resumes subscription
    const resResume = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCustA}`,
      },
    });
    const dataResume = await resResume.json();
    console.log(`[3c] Resume subscription: HTTP ${resResume.status} (Expected: 200) - isPaused: ${dataResume.data?.isPaused}`);
    if (dataResume.data?.isPaused !== false) throw new Error('Resume subscription failed!');

    console.log('✅ Pause and resume operations verified.');

    // --------------------------------------------------------------------------
    // Test 4: Plan Policy Flags (allowPause, allowRenew, allowEarlyClose)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 4: Plan Policy Flags Enforcement ---');

    // Create a subscription with the STRICT plan (all flags false)
    const resStrictSub = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        customerId: custB.id,
        planId: strictPlan.id,
        status: SubscriptionStatus.ACTIVE,
        lines: [{ productId: product.id, quantity: 1 }],
      }),
    });
    const dataStrictSub = await resStrictSub.json();
    const strictSubId = dataStrictSub.data.id;

    // 4a. Trying to pause strict plan -> Expected 400 (allowPause is false)
    const resStrictPause = await fetch(`${BASE_URL}/subscriptions/${strictSubId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });
    const dataStrictPause = await resStrictPause.json();
    console.log(`[4a] Pause blocked by plan policy: HTTP ${resStrictPause.status} (Expected: 400) - Error: "${dataStrictPause.message}"`);
    if (resStrictPause.status !== 400) throw new Error('Plan policy allowPause=false was bypassed!');

    // 4b. Trying to renew strict plan -> Expected 400 (allowRenew is false)
    const resStrictRenew = await fetch(`${BASE_URL}/subscriptions/${strictSubId}/renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });
    const dataStrictRenew = await resStrictRenew.json();
    console.log(`[4b] Renew blocked by plan policy: HTTP ${resStrictRenew.status} (Expected: 400) - Error: "${dataStrictRenew.message}"`);
    if (resStrictRenew.status !== 400) throw new Error('Plan policy allowRenew=false was bypassed!');

    // 4c. Trying to early close strict plan -> Expected 400 (allowEarlyClose is false)
    const resStrictClose = await fetch(`${BASE_URL}/subscriptions/${strictSubId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
    });
    const dataStrictClose = await resStrictClose.json();
    console.log(`[4c] Close blocked by plan policy: HTTP ${resStrictClose.status} (Expected: 400) - Error: "${dataStrictClose.message}"`);
    if (resStrictClose.status !== 400) throw new Error('Plan policy allowEarlyClose=false was bypassed!');

    console.log('✅ Plan policy flags strictly enforced.');

    // --------------------------------------------------------------------------
    // Test 5: Customer Ownership & Cross-Customer Isolation
    // --------------------------------------------------------------------------
    console.log('\n--- Test 5: Customer Ownership & Cross-Customer Isolation ---');

    // 5a. Customer A reads own subscription -> Expected 200
    const resCustOwnSub = await fetch(`${BASE_URL}/subscriptions/${subA_Id}`, {
      headers: { Authorization: `Bearer ${tokenCustA}` },
    });
    console.log(`[5a] Customer A reads own subscription: HTTP ${resCustOwnSub.status} (Expected: 200)`);
    if (resCustOwnSub.status !== 200) throw new Error('Customer A could not read own subscription!');

    // 5b. Customer A attempts to read Customer B's subscription -> Expected 403 Forbidden!
    const resCustCrossSub = await fetch(`${BASE_URL}/subscriptions/${strictSubId}`, {
      headers: { Authorization: `Bearer ${tokenCustA}` },
    });
    console.log(`[5b] Customer A reads Customer B's subscription: HTTP ${resCustCrossSub.status} (Expected: 403 Forbidden)`);
    if (resCustCrossSub.status !== 403) {
      throw new Error(`SECURITY BREACH: Customer A accessed Customer B's subscription with HTTP ${resCustCrossSub.status}! Expected 403!`);
    }

    // 5c. Customer A attempts to pause Customer B's subscription -> Expected 403 Forbidden!
    const resCustCrossPause = await fetch(`${BASE_URL}/subscriptions/${strictSubId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCustA}`,
      },
    });
    console.log(`[5c] Customer A pauses Customer B's subscription: HTTP ${resCustCrossPause.status} (Expected: 403 Forbidden)`);
    if (resCustCrossPause.status !== 403) {
      throw new Error(`SECURITY BREACH: Customer A paused Customer B's subscription with HTTP ${resCustCrossPause.status}! Expected 403!`);
    }

    // 5d. Customer Portal: GET /api/me/subscriptions returns only Customer A's subscriptions (2 subs: subA & subInc)
    const resMySubs = await fetch(`${BASE_URL}/me/subscriptions`, {
      headers: { Authorization: `Bearer ${tokenCustA}` },
    });
    const dataMySubs = await resMySubs.json();
    console.log(`[5d] Customer Portal /api/me/subscriptions: HTTP ${resMySubs.status} (Expected: 200) - Count: ${dataMySubs.data?.length}`);
    if (resMySubs.status !== 200 || dataMySubs.data?.length !== 2) {
      throw new Error('Customer portal did not isolate subscriptions accurately!');
    }

    // 5e. Customer attempts to perform admin-only transition -> Expected 403
    const resCustStatusChange = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCustA}`,
      },
      body: JSON.stringify({ status: SubscriptionStatus.CLOSED }),
    });
    console.log(`[5e] Customer attempts status transition: HTTP ${resCustStatusChange.status} (Expected: 403 Forbidden)`);
    if (resCustStatusChange.status !== 403) {
      throw new Error('Customer was allowed to change subscription status!');
    }

    console.log('✅ Customer ownership and RBAC enforcement verified.');

    // --------------------------------------------------------------------------
    // Test 6: Renewal and Early Closure
    // --------------------------------------------------------------------------
    console.log('\n--- Test 6: Renewal and Early Closure ---');

    // 6a. Renew Standard Subscription (allowed by standardPlan)
    const resRenew = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
    });
    const dataRenew = await resRenew.json();
    console.log(`[6a] Staff renews subscription: HTTP ${resRenew.status} (Expected: 200) - New ExpiryDate: ${dataRenew.data?.expiryDate}`);
    if (resRenew.status !== 200 || !dataRenew.data?.expiryDate) {
      throw new Error('Subscription renewal failed!');
    }

    // 6b. Early Close Standard Subscription (allowed by standardPlan)
    const resClose = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
      body: JSON.stringify({ reason: 'Customer requested cancellation' }),
    });
    const dataClose = await resClose.json();
    console.log(`[6b] Staff closes subscription: HTTP ${resClose.status} (Expected: 200) - Status: ${dataClose.data?.status}`);
    if (resClose.status !== 200 || dataClose.data?.status !== 'CLOSED') {
      throw new Error('Subscription closure failed!');
    }

    // 6c. Attempting transition on a CLOSED subscription -> Expected 400 (Terminal state)
    const resClosedTransition = await fetch(`${BASE_URL}/subscriptions/${subA_Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
      body: JSON.stringify({ status: SubscriptionStatus.ACTIVE }),
    });
    console.log(`[6c] Transition from terminal CLOSED: HTTP ${resClosedTransition.status} (Expected: 400)`);
    if (resClosedTransition.status !== 400) {
      throw new Error('Transition on closed subscription was not blocked!');
    }

    console.log('✅ Renewal and closure lifecycles verified.');

    console.log('\n🎉 ALL PHASE 3 SUBSCRIPTION TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase3Tests().catch((err) => {
  console.error('\n❌ Phase 3 test suite failed:', err);
  process.exit(1);
});

