import { BillingPeriod, ProductType } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { signJwtToken } from '../src/utils/token';

const app = createApp();
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const planPrefix = `TEST-PLAN-${runId}`;

const userIds: string[] = [];
const productIds: string[] = [];
const planIds: string[] = [];

let adminToken: string;
let staffToken: string;
let customerToken: string;
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function createTestUser(role: 'ADMIN' | 'STAFF' | 'CUSTOMER') {
  const user = await prisma.user.create({
    data: {
      firstName: 'Plan API',
      lastName: role,
      email: `plan-${role.toLowerCase()}-${runId}@billora.test`,
      password: await bcrypt.hash('PlanTest!Password123', 10),
      role,
    },
  });
  userIds.push(user.id);

  return signJwtToken({ userId: user.id, role, email: user.email });
}

async function cleanup() {
  if (planIds.length > 0) {
    await prisma.planProduct.deleteMany({
      where: { planId: { in: planIds } },
    });
    await prisma.plan.deleteMany({
      where: { id: { in: planIds } },
    });
  }

  if (productIds.length > 0) {
    await prisma.product.deleteMany({
      where: { id: { in: productIds } },
    });
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }
}

async function runTests() {
  try {
    adminToken = await createTestUser('ADMIN');
    staffToken = await createTestUser('STAFF');
    customerToken = await createTestUser('CUSTOMER');

    const product = await prisma.product.create({
      data: {
        name: `${planPrefix} Product`,
        code: `${planPrefix}-PRODUCT`,
        type: ProductType.SERVICE,
        salesPrice: 125,
      },
    });
    productIds.push(product.id);

    const basePlan = {
      name: `${planPrefix} Monthly Alpha`,
      code: `${planPrefix}-ALPHA`,
      billingPeriod: BillingPeriod.MONTHLY,
      billingInterval: 1,
      price: 99.95,
    };

    console.log('\n=== PLAN API INTEGRATION TESTS ===\n');

    const unauthenticatedRequests = [
      request(app).get('/api/plans'),
      request(app).get('/api/plans/00000000-0000-0000-0000-000000000000'),
      request(app).post('/api/plans').send(basePlan),
      request(app).put('/api/plans/00000000-0000-0000-0000-000000000000').send({ name: 'No auth' }),
      request(app).delete('/api/plans/00000000-0000-0000-0000-000000000000'),
      request(app).post('/api/plans/00000000-0000-0000-0000-000000000000/products').send({ productId: product.id }),
      request(app)
        .put(`/api/plans/00000000-0000-0000-0000-000000000000/products/${product.id}`)
        .send({ defaultQuantity: 2 }),
      request(app).delete(`/api/plans/00000000-0000-0000-0000-000000000000/products/${product.id}`),
    ];
    const unauthenticatedResponses = await Promise.all(unauthenticatedRequests);
    assert(
      'All plan endpoints reject unauthenticated requests',
      unauthenticatedResponses.every((response) => response.status === 401),
      unauthenticatedResponses.map((response) => response.status).join(', ')
    );

    const createResponse = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePlan);
    assert('ADMIN creates plan (201)', createResponse.status === 201, `got ${createResponse.status}`);
    assert('Create response contains plan data', !!createResponse.body?.data?.id);
    const primaryPlanId = createResponse.body?.data?.id as string | undefined;
    if (primaryPlanId) planIds.push(primaryPlanId);
    assert('Created plan has expected name', createResponse.body?.data?.name === basePlan.name);

    const staffCreate = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ ...basePlan, code: `${planPrefix}-STAFF` });
    const customerCreate = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...basePlan, code: `${planPrefix}-CUSTOMER` });
    assert('STAFF cannot create plans (403)', staffCreate.status === 403, `got ${staffCreate.status}`);
    assert('CUSTOMER cannot create plans (403)', customerCreate.status === 403, `got ${customerCreate.status}`);

    const secondPlanResponse = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...basePlan,
        name: `${planPrefix} Monthly Beta`,
        code: `${planPrefix}-BETA`,
      });
    assert('ADMIN creates second test plan (201)', secondPlanResponse.status === 201, `got ${secondPlanResponse.status}`);
    const secondPlanId = secondPlanResponse.body?.data?.id as string | undefined;
    if (secondPlanId) planIds.push(secondPlanId);

    const yearlyPlanResponse = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...basePlan,
        name: `${planPrefix} Yearly Gamma`,
        code: `${planPrefix}-GAMMA`,
        billingPeriod: BillingPeriod.YEARLY,
      });
    assert('ADMIN creates yearly test plan (201)', yearlyPlanResponse.status === 201, `got ${yearlyPlanResponse.status}`);
    const yearlyPlanId = yearlyPlanResponse.body?.data?.id as string | undefined;
    if (yearlyPlanId) planIds.push(yearlyPlanId);

    for (const [role, token] of [
      ['ADMIN', adminToken],
      ['STAFF', staffToken],
      ['CUSTOMER', customerToken],
    ] as const) {
      const listResponse = await request(app)
        .get('/api/plans')
        .set('Authorization', `Bearer ${token}`);
      assert(`${role} can list plans (200)`, listResponse.status === 200, `got ${listResponse.status}`);
      assert(`${role} list response includes plans and pagination`, Array.isArray(listResponse.body?.data) && !!listResponse.body?.meta);
    }

    const pageOne = await request(app)
      .get('/api/plans')
      .query({ search: planPrefix, billingPeriod: BillingPeriod.MONTHLY, page: 1, limit: 1 })
      .set('Authorization', `Bearer ${adminToken}`);
    const pageTwo = await request(app)
      .get('/api/plans')
      .query({ search: planPrefix, billingPeriod: BillingPeriod.MONTHLY, page: 2, limit: 1 })
      .set('Authorization', `Bearer ${adminToken}`);
    assert('Plan search and billing-period filter are applied', pageOne.status === 200 && pageOne.body?.meta?.total === 2);
    assert(
      'Pagination returns one plan per page with expected metadata',
      pageOne.body?.data?.length === 1 &&
        pageTwo.body?.data?.length === 1 &&
        pageOne.body?.meta?.limit === 1 &&
        pageOne.body?.meta?.totalPages === 2 &&
        pageOne.body?.data?.[0]?.id !== pageTwo.body?.data?.[0]?.id
    );

    if (primaryPlanId) {
      for (const [role, token] of [
        ['ADMIN', adminToken],
        ['STAFF', staffToken],
        ['CUSTOMER', customerToken],
      ] as const) {
        const getResponse = await request(app)
          .get(`/api/plans/${primaryPlanId}`)
          .set('Authorization', `Bearer ${token}`);
        assert(`${role} can retrieve a plan by ID (200)`, getResponse.status === 200, `got ${getResponse.status}`);
        assert(`${role} receives the requested plan`, getResponse.body?.data?.id === primaryPlanId);
      }

      const missingPlan = await request(app)
        .get('/api/plans/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      const invalidPlanId = await request(app)
        .get('/api/plans/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);
      assert('Nonexistent plan returns 404', missingPlan.status === 404, `got ${missingPlan.status}`);
      assert('Invalid plan UUID returns 400', invalidPlanId.status === 400, `got ${invalidPlanId.status}`);
    }

    const invalidCreate = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePlan, code: `${planPrefix}-INVALID`, name: '   ' });
    const invalidListQuery = await request(app)
      .get('/api/plans')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${adminToken}`);
    assert('Invalid plan input is rejected (400)', invalidCreate.status === 400, `got ${invalidCreate.status}`);
    assert('Invalid pagination input is rejected (400)', invalidListQuery.status === 400, `got ${invalidListQuery.status}`);

    if (primaryPlanId) {
      const updateResponse = await request(app)
        .put(`/api/plans/${primaryPlanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${planPrefix} Updated`, price: 149.5 });
      assert('ADMIN updates plan (200)', updateResponse.status === 200, `got ${updateResponse.status}`);
      assert('Updated plan fields are returned', updateResponse.body?.data?.name === `${planPrefix} Updated`);

      for (const [role, token] of [
        ['STAFF', staffToken],
        ['CUSTOMER', customerToken],
      ] as const) {
        const response = await request(app)
          .put(`/api/plans/${primaryPlanId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ name: `${planPrefix} Unauthorized Update` });
        assert(`${role} cannot update plans (403)`, response.status === 403, `got ${response.status}`);
      }

      const addAssociation = await request(app)
        .post(`/api/plans/${primaryPlanId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, defaultQuantity: 2, isMandatory: true });
      assert('ADMIN adds a product to a plan (201)', addAssociation.status === 201, `got ${addAssociation.status}`);
      assert('Created association has expected fields', addAssociation.body?.data?.productId === product.id);

      const duplicateAssociation = await request(app)
        .post(`/api/plans/${primaryPlanId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id });
      assert('Duplicate plan-product association is rejected (409)', duplicateAssociation.status === 409, `got ${duplicateAssociation.status}`);

      const invalidAssociation = await request(app)
        .post(`/api/plans/${primaryPlanId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId: product.id, defaultQuantity: 0 });
      assert('Invalid association input is rejected (400)', invalidAssociation.status === 400, `got ${invalidAssociation.status}`);

      for (const [role, token] of [
        ['STAFF', staffToken],
        ['CUSTOMER', customerToken],
      ] as const) {
        const createResponse = await request(app)
          .post(`/api/plans/${primaryPlanId}/products`)
          .set('Authorization', `Bearer ${token}`)
          .send({ productId: product.id });
        const updateResponse = await request(app)
          .put(`/api/plans/${primaryPlanId}/products/${product.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ defaultQuantity: 3 });
        const deleteResponse = await request(app)
          .delete(`/api/plans/${primaryPlanId}/products/${product.id}`)
          .set('Authorization', `Bearer ${token}`);
        assert(`${role} cannot add plan products (403)`, createResponse.status === 403, `got ${createResponse.status}`);
        assert(`${role} cannot update plan products (403)`, updateResponse.status === 403, `got ${updateResponse.status}`);
        assert(`${role} cannot remove plan products (403)`, deleteResponse.status === 403, `got ${deleteResponse.status}`);
      }

      const updateAssociation = await request(app)
        .put(`/api/plans/${primaryPlanId}/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ defaultQuantity: 4, isMandatory: false });
      assert('ADMIN updates a plan-product association (200)', updateAssociation.status === 200, `got ${updateAssociation.status}`);
      assert(
        'Association update is persisted',
        updateAssociation.body?.data?.defaultQuantity === 4 &&
          updateAssociation.body?.data?.isMandatory === false
      );

      const removeAssociation = await request(app)
        .delete(`/api/plans/${primaryPlanId}/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert('ADMIN removes a product from a plan (200)', removeAssociation.status === 200, `got ${removeAssociation.status}`);
      const removedAssociation = await prisma.planProduct.findUnique({
        where: { planId_productId: { planId: primaryPlanId, productId: product.id } },
      });
      assert('Removed plan-product association no longer exists', removedAssociation === null);

      const invalidPlanUuid = await request(app)
        .put(`/api/plans/not-a-uuid/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ defaultQuantity: 2 });
      const invalidProductUuid = await request(app)
        .delete(`/api/plans/${primaryPlanId}/products/not-a-uuid`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert('Invalid plan UUID in association route returns 400', invalidPlanUuid.status === 400, `got ${invalidPlanUuid.status}`);
      assert('Invalid product UUID in association route returns 400', invalidProductUuid.status === 400, `got ${invalidProductUuid.status}`);
    }

    if (secondPlanId) {
      const deactivateStaff = await request(app)
        .delete(`/api/plans/${secondPlanId}`)
        .set('Authorization', `Bearer ${staffToken}`);
      const deactivateCustomer = await request(app)
        .delete(`/api/plans/${secondPlanId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      assert('STAFF cannot deactivate plans (403)', deactivateStaff.status === 403, `got ${deactivateStaff.status}`);
      assert('CUSTOMER cannot deactivate plans (403)', deactivateCustomer.status === 403, `got ${deactivateCustomer.status}`);
    }

    if (yearlyPlanId) {
      const deactivateResponse = await request(app)
        .delete(`/api/plans/${yearlyPlanId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert('ADMIN deactivates plan (200)', deactivateResponse.status === 200, `got ${deactivateResponse.status}`);
      const deactivatedPlan = await prisma.plan.findUnique({ where: { id: yearlyPlanId } });
      assert('Deactivation is persisted', deactivatedPlan?.isActive === false);
    }
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  if (failed > 0) process.exitCode = 1;
}

runTests().catch((error) => {
  console.error('Unexpected Plan API test error:', error);
  process.exitCode = 1;
});
