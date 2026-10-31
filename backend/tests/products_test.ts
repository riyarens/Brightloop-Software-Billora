/**
 * BILLORA – Product & Variant Integration Tests
 * Member 1 (Riya): Validates Niranjana's Product/Variant module integrated into Riya branch.
 *
 * Tests:
 *  1.  POST /api/products (Admin creates product → 201)
 *  2.  POST /api/products (Staff attempts create → 403)
 *  3.  POST /api/products (Customer attempts create → 403)
 *  4.  POST /api/products (Duplicate code → 409)
 *  5.  GET  /api/products (Admin list with pagination → 200)
 *  6.  GET  /api/products (Staff list → 200)
 *  7.  GET  /api/products/:id (Get by ID → 200)
 *  8.  GET  /api/products/:id (Non-existent → 404)
 *  9.  PUT  /api/products/:id (Admin updates → 200)
 *  10. DELETE /api/products/:id (Admin soft-deletes → 200, isActive false)
 *  11. POST /api/products/:id/variants (Admin creates Odoo variant +560 → 201)
 *  12. POST /api/products/:id/variants (Staff attempts → 403)
 *  13. GET  /api/products/:id/variants (Admin list variants → 200)
 *  14. PUT  /api/variants/:id (Admin updates extraPrice → 200)
 *  15. DELETE /api/variants/:id (Admin soft-deletes variant → 200, isActive false)
 *  16. Customer cannot list products → 403
 */

import { createApp } from '../src/app';
import request from 'supertest';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcrypt';
import { signJwtToken } from '../src/utils/token';

const app = createApp();

// ─── Helper: issue JWTs without HTTP login ───────────────────────────────────
function makeToken(userId: string, role: 'ADMIN' | 'STAFF' | 'CUSTOMER') {
  return signJwtToken({ userId, role });
}

// ─── Test State ───────────────────────────────────────────────────────────────
let adminId: string;
let staffId: string;
let customerId: string;
let adminToken: string;
let staffToken: string;
let customerToken: string;
let productId: string;
let variantId: string;

const PRODUCT_CODE = `TEST-PROD-${Date.now()}`;
const PRODUCT_CODE_2 = `TEST-PROD2-${Date.now()}`;

// ─── Setup ────────────────────────────────────────────────────────────────────
async function setup() {
  const hash = await bcrypt.hash('Str0ng@Pass!', 10);
  const ts = Date.now();

  const admin = await prisma.user.create({
    data: {
      firstName: 'Products',
      lastName: 'Admin',
      email: `prodadmin-${ts}@billora.test`,
      password: hash,
      role: 'ADMIN',
    },
  });
  adminId = admin.id;
  adminToken = makeToken(admin.id, 'ADMIN');

  const staff = await prisma.user.create({
    data: {
      firstName: 'Products',
      lastName: 'Staff',
      email: `prodstaff-${ts}@billora.test`,
      password: hash,
      role: 'STAFF',
    },
  });
  staffId = staff.id;
  staffToken = makeToken(staff.id, 'STAFF');

  const customer = await prisma.user.create({
    data: {
      firstName: 'Products',
      lastName: 'Customer',
      email: `prodcust-${ts}@billora.test`,
      password: hash,
      role: 'CUSTOMER',
    },
  });
  customerId = customer.id;
  customerToken = makeToken(customer.id, 'CUSTOMER');
}

// ─── Teardown ─────────────────────────────────────────────────────────────────
async function teardown() {
  // Variants are cascade-deleted when product is hard-deleted; but we soft-deleted
  // during tests. Hard-delete test products first (they are test data only).
  if (productId) {
    await prisma.variant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  }
  // Clean up second product used for duplicate-code test
  await prisma.product.deleteMany({ where: { code: PRODUCT_CODE_2 } });
  // Clean up users
  await prisma.user.deleteMany({ where: { id: { in: [adminId, staffId, customerId] } } });
}

// ─── Assertion Helper ─────────────────────────────────────────────────────────
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

// ─── Tests ────────────────────────────────────────────────────────────────────
async function runTests() {
  await setup();

  console.log('\n=== PRODUCT & VARIANT MODULE TESTS ===\n');

  // Test 1 – Admin creates product
  console.log('Test 1: POST /api/products (Admin → 201)');
  const res1 = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Cloud Hosting Pro',
      code: PRODUCT_CODE,
      description: 'Managed cloud hosting solution',
      type: 'SERVICE',
      salesPrice: 2500,
      costPrice: 1800,
    });
  assert('Status 201', res1.status === 201, `got ${res1.status}`);
  assert('Has product id', !!res1.body?.data?.id, JSON.stringify(res1.body));
  assert('isActive true', res1.body?.data?.isActive === true);
  productId = res1.body?.data?.id;

  // Test 2 – Staff cannot create product
  console.log('\nTest 2: POST /api/products (Staff → 403)');
  const res2 = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ name: 'Staff Product', salesPrice: 100 });
  assert('Status 403', res2.status === 403, `got ${res2.status}`);

  // Test 3 – Customer cannot create product
  console.log('\nTest 3: POST /api/products (Customer → 403)');
  const res3 = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ name: 'Customer Product', salesPrice: 100 });
  assert('Status 403', res3.status === 403, `got ${res3.status}`);

  // Test 4 – Duplicate code → 409
  console.log('\nTest 4: POST /api/products (Duplicate code → 409)');
  const res4 = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Duplicate Code Product', code: PRODUCT_CODE, salesPrice: 999 });
  assert('Status 409', res4.status === 409, `got ${res4.status}`);

  // Test 5 – Admin lists products with pagination
  console.log('\nTest 5: GET /api/products (Admin pagination → 200)');
  const res5 = await request(app)
    .get('/api/products?page=1&limit=5')
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res5.status === 200, `got ${res5.status}`);
  // Niranjana's controller sends data = products[], meta = pagination
  assert('Has pagination in meta', !!res5.body?.meta, JSON.stringify(res5.body));
  assert('Products array', Array.isArray(res5.body?.data));

  // Test 6 – Staff lists products
  console.log('\nTest 6: GET /api/products (Staff → 200)');
  const res6 = await request(app)
    .get('/api/products')
    .set('Authorization', `Bearer ${staffToken}`);
  assert('Status 200', res6.status === 200, `got ${res6.status}`);

  // Test 7 – Get product by ID
  console.log('\nTest 7: GET /api/products/:id (Admin → 200)');
  const res7 = await request(app)
    .get(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res7.status === 200, `got ${res7.status}`);
  assert('Correct product', res7.body?.data?.id === productId);
  assert('Has variants array', Array.isArray(res7.body?.data?.variants));

  // Test 8 – Non-existent product → 404
  console.log('\nTest 8: GET /api/products/:id (Not found → 404)');
  const res8 = await request(app)
    .get('/api/products/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 404', res8.status === 404, `got ${res8.status}`);

  // Test 9 – Admin updates product
  console.log('\nTest 9: PUT /api/products/:id (Admin → 200)');
  const res9 = await request(app)
    .put(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ salesPrice: 2800, description: 'Updated hosting solution' });
  assert('Status 200', res9.status === 200, `got ${res9.status}`);
  assert('Price updated', Number(res9.body?.data?.salesPrice) === 2800);

  // Test 10 – Admin soft-deletes product
  console.log('\nTest 10: DELETE /api/products/:id (Admin soft-delete → 200)');
  // First create a second product to delete (don't delete our main productId yet)
  const pDel = await prisma.product.create({
    data: { name: 'Delete Me', code: PRODUCT_CODE_2, salesPrice: new (await import('@prisma/client')).Prisma.Decimal(100) },
  });
  const res10 = await request(app)
    .delete(`/api/products/${pDel.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res10.status === 200, `got ${res10.status}`);
  const deletedProduct = await prisma.product.findUnique({ where: { id: pDel.id } });
  assert('isActive is false', deletedProduct?.isActive === false);

  // Test 11 – Admin creates variant with Odoo brand (+560 extraPrice)
  console.log('\nTest 11: POST /api/products/:id/variants (Odoo brand +560 → 201)');
  const res11 = await request(app)
    .post(`/api/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ brand: 'Odoo', name: 'Enterprise Edition', extraPrice: 560, sku: 'ODOO-ENT-001' });
  assert('Status 201', res11.status === 201, `got ${res11.status}`);
  assert('Brand is Odoo', res11.body?.data?.brand === 'Odoo');
  assert('extraPrice is 560', Number(res11.body?.data?.extraPrice) === 560);
  variantId = res11.body?.data?.id;

  // Test 12 – Staff cannot create variant
  console.log('\nTest 12: POST /api/products/:id/variants (Staff → 403)');
  const res12 = await request(app)
    .post(`/api/products/${productId}/variants`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ brand: 'Generic', extraPrice: 100 });
  assert('Status 403', res12.status === 403, `got ${res12.status}`);

  // Test 13 – Admin lists variants for product
  console.log('\nTest 13: GET /api/products/:id/variants (Admin → 200)');
  const res13 = await request(app)
    .get(`/api/products/${productId}/variants`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res13.status === 200, `got ${res13.status}`);
  assert('Variants array', Array.isArray(res13.body?.data), JSON.stringify(res13.body));
  assert('Contains our variant', res13.body?.data?.some((v: any) => v.id === variantId));

  // Test 14 – Admin updates variant extraPrice
  console.log('\nTest 14: PUT /api/variants/:id (Admin updates extraPrice → 200)');
  const res14 = await request(app)
    .put(`/api/variants/${variantId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ extraPrice: 620, name: 'Enterprise Edition v2' });
  assert('Status 200', res14.status === 200, `got ${res14.status}`);
  assert('extraPrice updated to 620', Number(res14.body?.data?.extraPrice) === 620);

  // Test 15 – Admin soft-deletes variant
  console.log('\nTest 15: DELETE /api/variants/:id (Admin soft-delete → 200)');
  const res15 = await request(app)
    .delete(`/api/variants/${variantId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert('Status 200', res15.status === 200, `got ${res15.status}`);
  const deletedVariant = await prisma.variant.findUnique({ where: { id: variantId } });
  assert('Variant isActive is false', deletedVariant?.isActive === false);

  // Test 16 – Customer cannot list products
  console.log('\nTest 16: GET /api/products (Customer → 403)');
  const res16 = await request(app)
    .get('/api/products')
    .set('Authorization', `Bearer ${customerToken}`);
  assert('Status 403', res16.status === 403, `got ${res16.status}`);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  if (failed === 0) {
    console.log('🎉 All Product & Variant tests PASSED');
  } else {
    console.error(`⚠️  ${failed} assertion(s) FAILED`);
    process.exitCode = 1;
  }

  await teardown();
  await prisma.$disconnect();
}

runTests().catch(async (err) => {
  console.error('Unexpected error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
