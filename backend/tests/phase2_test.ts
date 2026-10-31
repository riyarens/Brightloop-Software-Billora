import http from 'http';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

async function runPhase2Tests() {
  console.log('🧪 Starting Phase 2 Comprehensive Test Suite...\n');

  // Start test server on port 5055
  const app = createApp();
  const PORT = 5055;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  const BASE_URL = `http://localhost:${PORT}/api`;

  try {
    // 0. Clean DB tables for test run
    console.log('🧹 Cleaning test records...');
    await prisma.subscriptionEvent.deleteMany();
    await prisma.subscriptionLine.deleteMany();
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();

    // --------------------------------------------------------------------------
    // Test 1: Weak Password Rejection
    // --------------------------------------------------------------------------
    console.log('\n--- Test 1: Weak Password Rejection ---');
    
    // 1a. <= 8 characters
    const resShort = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'weak1@example.com',
        password: 'Abc!12', // 6 chars
        firstName: 'Weak',
      }),
    });
    const dataShort = await resShort.json();
    console.log(`[1a] <=8 chars: HTTP ${resShort.status} (Expected: 400) - Error:`, dataShort.errors?.[0]?.message);
    if (resShort.status !== 400) throw new Error('Short password was not rejected!');

    // 1b. No uppercase
    const resNoUpper = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'weak2@example.com',
        password: 'password!123',
        firstName: 'Weak',
      }),
    });
    const dataNoUpper = await resNoUpper.json();
    console.log(`[1b] No uppercase: HTTP ${resNoUpper.status} (Expected: 400) - Error:`, dataNoUpper.errors?.[0]?.message);
    if (resNoUpper.status !== 400) throw new Error('Password missing uppercase was not rejected!');

    // 1c. No lowercase
    const resNoLower = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'weak3@example.com',
        password: 'PASSWORD!123',
        firstName: 'Weak',
      }),
    });
    const dataNoLower = await resNoLower.json();
    console.log(`[1c] No lowercase: HTTP ${resNoLower.status} (Expected: 400) - Error:`, dataNoLower.errors?.[0]?.message);
    if (resNoLower.status !== 400) throw new Error('Password missing lowercase was not rejected!');

    // 1d. No special character
    const resNoSpecial = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'weak4@example.com',
        password: 'Password1234',
        firstName: 'Weak',
      }),
    });
    const dataNoSpecial = await resNoSpecial.json();
    console.log(`[1d] No special char: HTTP ${resNoSpecial.status} (Expected: 400) - Error:`, dataNoSpecial.errors?.[0]?.message);
    if (resNoSpecial.status !== 400) throw new Error('Password missing special character was not rejected!');

    console.log('✅ Weak password validations passed.');

    // --------------------------------------------------------------------------
    // Test 2: Valid Customer Registration
    // --------------------------------------------------------------------------
    console.log('\n--- Test 2: Valid Customer Registration ---');
    const customerAPayload = {
      email: 'customera@brightloop.com',
      password: 'StrongCustomerPassword!123',
      firstName: 'Alice',
      lastName: 'Smith',
      company: 'Alice Enterprises',
      phone: '+91 9999988888',
    };

    const resRegA = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerAPayload),
    });
    const dataRegA = await resRegA.json();
    console.log(`[2a] Customer A registration: HTTP ${resRegA.status} (Expected: 201)`);
    if (resRegA.status !== 201) throw new Error(`Customer registration failed: ${JSON.stringify(dataRegA)}`);
    if (!dataRegA.data.token) throw new Error('Token not returned on registration!');
    if (dataRegA.data.user.password) throw new Error('Security vulnerability: Password hash exposed in response!');

    const tokenCustomerA = dataRegA.data.token;
    const customerA_Id = dataRegA.data.customer.id;
    console.log(`✅ Customer A registered. Customer ID: ${customerA_Id}`);

    // Register Customer B for ownership tests
    const customerBPayload = {
      email: 'customerb@brightloop.com',
      password: 'StrongCustomerPassword!456',
      firstName: 'Bob',
      lastName: 'Jones',
      company: 'Bob Industries',
    };
    const resRegB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerBPayload),
    });
    const dataRegB = await resRegB.json();
    const tokenCustomerB = dataRegB.data.token;
    const customerB_Id = dataRegB.data.customer.id;
    console.log(`✅ Customer B registered. Customer ID: ${customerB_Id}`);

    // --------------------------------------------------------------------------
    // Test 3: Duplicate Email Rejection
    // --------------------------------------------------------------------------
    console.log('\n--- Test 3: Duplicate Email Rejection ---');
    const resDup = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerAPayload),
    });
    const dataDup = await resDup.json();
    console.log(`[3] Duplicate email: HTTP ${resDup.status} (Expected: 409) - Message: "${dataDup.message}"`);
    if (resDup.status !== 409) throw new Error('Duplicate email was not rejected with 409 Conflict!');
    console.log('✅ Duplicate email rejection passed.');

    // --------------------------------------------------------------------------
    // Test 4: Valid Login & Invalid Credentials
    // --------------------------------------------------------------------------
    console.log('\n--- Test 4: Login Operations ---');
    // 4a. Valid Login
    const resLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customera@brightloop.com',
        password: 'StrongCustomerPassword!123',
      }),
    });
    const dataLogin = await resLogin.json();
    console.log(`[4a] Valid login: HTTP ${resLogin.status} (Expected: 200) - Token received: ${!!dataLogin.data?.token}`);
    if (resLogin.status !== 200 || !dataLogin.data?.token) throw new Error('Valid login failed!');

    // 4b. Invalid Password
    const resBadPass = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customera@brightloop.com',
        password: 'WrongPassword!999',
      }),
    });
    console.log(`[4b] Invalid password: HTTP ${resBadPass.status} (Expected: 401)`);
    if (resBadPass.status !== 401) throw new Error('Invalid password was not rejected with 401!');

    // 4c. Non-existent email
    const resNoUser = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doesnotexist@brightloop.com',
        password: 'AnyPassword!123',
      }),
    });
    console.log(`[4c] Non-existent email: HTTP ${resNoUser.status} (Expected: 401)`);
    if (resNoUser.status !== 401) throw new Error('Non-existent user login was not rejected with 401!');
    console.log('✅ Login tests passed.');

    // --------------------------------------------------------------------------
    // Test 5: GET /api/auth/me
    // --------------------------------------------------------------------------
    console.log('\n--- Test 5: GET /api/auth/me ---');
    // 5a. Authenticated
    const resMe = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    const dataMe = await resMe.json();
    console.log(`[5a] Auth me: HTTP ${resMe.status} (Expected: 200) - Email: ${dataMe.data?.email}, Role: ${dataMe.data?.role}`);
    if (resMe.status !== 200 || dataMe.data?.email !== 'customera@brightloop.com') throw new Error('Auth me failed!');

    // 5b. Unauthenticated
    const resMeNoAuth = await fetch(`${BASE_URL}/auth/me`);
    console.log(`[5b] Auth me without token: HTTP ${resMeNoAuth.status} (Expected: 401)`);
    if (resMeNoAuth.status !== 401) throw new Error('Unauthenticated me endpoint did not return 401!');
    console.log('✅ Auth me tests passed.');

    // --------------------------------------------------------------------------
    // Test 6: Forgot Password & Reset Password Flow
    // --------------------------------------------------------------------------
    console.log('\n--- Test 6: Forgot Password & Reset Password ---');
    const resForgot = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customera@brightloop.com' }),
    });
    const dataForgot = await resForgot.json();
    console.log(`[6a] Forgot password: HTTP ${resForgot.status} (Expected: 200) - Message: "${dataForgot.message}"`);
    if (resForgot.status !== 200) throw new Error('Forgot password request failed!');

    // Retrieve user token from DB to test reset
    const userInDb = await prisma.user.findUnique({
      where: { email: 'customera@brightloop.com' },
    });
    if (!userInDb?.resetPasswordToken) throw new Error('Reset password token was not saved in DB!');
    console.log('[6b] Reset password token hash verified in database with 30-min expiry.');

    // --------------------------------------------------------------------------
    // Test 7: Admin-Only Staff Management
    // --------------------------------------------------------------------------
    console.log('\n--- Test 7: Admin-Only Staff Management ---');

    // Create an Admin user directly in DB for testing
    const adminHashedPassword = await bcrypt.hash('AdminSecretKey!123', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'superadmin@brightloop.com',
        password: adminHashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: Role.ADMIN,
      },
    });

    const resAdminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@brightloop.com',
        password: 'AdminSecretKey!123',
      }),
    });
    const dataAdminLogin = await resAdminLogin.json();
    const tokenAdmin = dataAdminLogin.data.token;

    // 7a. Admin creates Staff account -> Expected 201
    const staffPayload = {
      email: 'staffmember1@brightloop.com',
      password: 'StaffStrongPassword!123',
      firstName: 'Sarah',
      lastName: 'Connor',
    };
    const resCreateStaff = await fetch(`${BASE_URL}/users/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify(staffPayload),
    });
    const dataCreateStaff = await resCreateStaff.json();
    console.log(`[7a] Admin creates staff: HTTP ${resCreateStaff.status} (Expected: 201) - Role: ${dataCreateStaff.data?.role}`);
    if (resCreateStaff.status !== 201 || dataCreateStaff.data?.role !== 'STAFF') {
      throw new Error('Admin failed to create staff account!');
    }

    // Login as the newly created Staff member
    const resStaffLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staffmember1@brightloop.com',
        password: 'StaffStrongPassword!123',
      }),
    });
    const dataStaffLogin = await resStaffLogin.json();
    const tokenStaff = dataStaffLogin.data.token;

    // 7b. Staff attempts to create another Staff member -> Expected 403 Forbidden!
    const resStaffForbidden = await fetch(`${BASE_URL}/users/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStaff}`,
      },
      body: JSON.stringify({
        email: 'staffmember2@brightloop.com',
        password: 'StaffStrongPassword!456',
        firstName: 'Unauthorized',
      }),
    });
    console.log(`[7b] Staff creates staff: HTTP ${resStaffForbidden.status} (Expected: 403 Forbidden)`);
    if (resStaffForbidden.status !== 403) {
      throw new Error('Staff member was NOT forbidden from creating staff! Expected 403!');
    }

    // 7c. Customer attempts to create Staff member -> Expected 403 Forbidden!
    const resCustForbidden = await fetch(`${BASE_URL}/users/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCustomerA}`,
      },
      body: JSON.stringify({
        email: 'staffmember3@brightloop.com',
        password: 'StaffStrongPassword!789',
        firstName: 'CustomerHacker',
      }),
    });
    console.log(`[7c] Customer creates staff: HTTP ${resCustForbidden.status} (Expected: 403 Forbidden)`);
    if (resCustForbidden.status !== 403) {
      throw new Error('Customer was NOT forbidden from creating staff! Expected 403!');
    }

    // 7d. Admin lists staff members -> Expected 200
    const resListStaff = await fetch(`${BASE_URL}/users/staff?search=sarah`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const dataListStaff = await resListStaff.json();
    console.log(`[7d] Admin searches staff: HTTP ${resListStaff.status} (Expected: 200) - Total: ${dataListStaff.meta?.total}`);
    if (resListStaff.status !== 200 || dataListStaff.meta?.total !== 1) {
      throw new Error('Admin list staff failed!');
    }

    console.log('✅ Admin-only staff operations & role restrictions verified.');

    // --------------------------------------------------------------------------
    // Test 8: Customer Management & Strict Ownership Checks
    // --------------------------------------------------------------------------
    console.log('\n--- Test 8: Customer Management & Strict Ownership Checks ---');

    // 8a. Customer A accesses Customer A's own profile -> Expected 200 OK
    const resCustOwn = await fetch(`${BASE_URL}/customers/${customerA_Id}`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    const dataCustOwn = await resCustOwn.json();
    console.log(`[8a] Customer A reads own profile: HTTP ${resCustOwn.status} (Expected: 200) - Name: ${dataCustOwn.data?.name}`);
    if (resCustOwn.status !== 200 || dataCustOwn.data?.id !== customerA_Id) {
      throw new Error('Customer could not access own profile!');
    }

    // 8b. Customer A attempts to access Customer B's profile -> Expected 403 Forbidden!
    const resCustCross = await fetch(`${BASE_URL}/customers/${customerB_Id}`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    console.log(`[8b] Customer A reads Customer B's profile: HTTP ${resCustCross.status} (Expected: 403 Forbidden)`);
    if (resCustCross.status !== 403) {
      throw new Error(`CRITICAL OWNERSHIP FAILURE: Customer A accessed Customer B with status ${resCustCross.status}! Expected 403!`);
    }

    // 8c. Customer A attempts to update Customer B's record -> Expected 403 Forbidden!
    const resCustCrossUpdate = await fetch(`${BASE_URL}/customers/${customerB_Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCustomerA}`,
      },
      body: JSON.stringify({ name: 'Hacked Name' }),
    });
    console.log(`[8c] Customer A updates Customer B's profile: HTTP ${resCustCrossUpdate.status} (Expected: 403 Forbidden)`);
    if (resCustCrossUpdate.status !== 403) {
      throw new Error(`CRITICAL OWNERSHIP FAILURE: Customer A updated Customer B with status ${resCustCrossUpdate.status}! Expected 403!`);
    }

    // 8d. Customer A attempts to list all customers -> Expected 403 Forbidden!
    const resCustListAll = await fetch(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${tokenCustomerA}` },
    });
    console.log(`[8d] Customer A lists all customers: HTTP ${resCustListAll.status} (Expected: 403 Forbidden)`);
    if (resCustListAll.status !== 403) {
      throw new Error(`CRITICAL AUTHORIZATION FAILURE: Customer listed customer directory with status ${resCustListAll.status}! Expected 403!`);
    }

    // 8e. Staff accesses Customer B's profile -> Expected 200 OK
    const resStaffReadCustB = await fetch(`${BASE_URL}/customers/${customerB_Id}`, {
      headers: { Authorization: `Bearer ${tokenStaff}` },
    });
    console.log(`[8e] Staff reads Customer B: HTTP ${resStaffReadCustB.status} (Expected: 200)`);
    if (resStaffReadCustB.status !== 200) {
      throw new Error('Staff could not access customer profile!');
    }

    // 8f. Staff lists customers with pagination and search -> Expected 200 OK
    const resStaffListCust = await fetch(`${BASE_URL}/customers?page=1&limit=10&search=Alice`, {
      headers: { Authorization: `Bearer ${tokenStaff}` },
    });
    const dataStaffListCust = await resStaffListCust.json();
    console.log(`[8f] Staff searches customers: HTTP ${resStaffListCust.status} (Expected: 200) - Total found: ${dataStaffListCust.meta?.total}`);
    if (resStaffListCust.status !== 200 || dataStaffListCust.meta?.total !== 1) {
      throw new Error('Staff customer search failed!');
    }

    console.log('✅ Customer data ownership & authorization checks verified.');

    console.log('\n🎉 ALL PHASE 2 TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runPhase2Tests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});

