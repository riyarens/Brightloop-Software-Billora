// ==============================================================================
// BILLORA - Database Seed Implementation (Member 4)
// Safe & Idempotent Upserts - Preserves existing data
// ==============================================================================

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  PrismaClient,
  Role,
  ProductType,
  BillingPeriod,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  TaxType,
  DiscountType,
  Prisma,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BILLORA idempotent database seeding...');

  // 1. Password Hashes
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const staffPassword = await bcrypt.hash('Staff@12345', 10);
  const customerPassword = await bcrypt.hash('Customer@12345', 10);

  // 2. Core Users (Admin, Staff, Customer)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@billora.com' },
    update: {
      password: adminPassword,
      role: Role.ADMIN,
      firstName: 'Riya',
      lastName: 'Admin',
      isActive: true,
    },
    create: {
      email: 'admin@billora.com',
      password: adminPassword,
      role: Role.ADMIN,
      firstName: 'Riya',
      lastName: 'Admin',
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${adminUser.email}`);

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@billora.com' },
    update: {
      password: staffPassword,
      role: Role.STAFF,
      firstName: 'Alex',
      lastName: 'Smith',
      isActive: true,
    },
    create: {
      email: 'staff@billora.com',
      password: staffPassword,
      role: Role.STAFF,
      firstName: 'Alex',
      lastName: 'Smith',
      isActive: true,
    },
  });
  console.log(`✅ Staff user seeded: ${staffUser.email}`);

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@billora.com' },
    update: {
      password: customerPassword,
      role: Role.CUSTOMER,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
    },
    create: {
      email: 'customer@billora.com',
      password: customerPassword,
      role: Role.CUSTOMER,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
    },
  });
  console.log(`✅ Customer user seeded: ${customerUser.email}`);

  // 3. Customer Profile for customer@billora.com
  const customerProfile = await prisma.customer.upsert({
    where: { email: 'customer@billora.com' },
    update: {
      userId: customerUser.id,
      name: 'Acme Global Corp',
      company: 'Acme Global Corp',
      phone: '+91 9876543210',
      address: 'Plot 42, Tech Park, BKC',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      country: 'India',
      taxId: '27AAAAA0000A1Z5',
      isActive: true,
    },
    create: {
      userId: customerUser.id,
      name: 'Acme Global Corp',
      email: 'customer@billora.com',
      company: 'Acme Global Corp',
      phone: '+91 9876543210',
      address: 'Plot 42, Tech Park, BKC',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      country: 'India',
      taxId: '27AAAAA0000A1Z5',
      isActive: true,
    },
  });
  console.log(`✅ Customer profile linked: ${customerProfile.name}`);

  // Link existing users if any without customer profiles
  const allCustomersUsers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER, customer: null },
  });
  for (const cu of allCustomersUsers) {
    await prisma.customer.upsert({
      where: { email: cu.email },
      update: { userId: cu.id },
      create: {
        userId: cu.id,
        email: cu.email,
        name: cu.firstName ? `${cu.firstName} ${cu.lastName || ''}`.trim() : cu.email.split('@')[0],
        company: 'Independent Client',
        country: 'India',
        isActive: true,
      },
    });
  }

  // 4. Taxes
  const gstTax = await prisma.tax.upsert({
    where: { id: 'tax-gst-18' },
    update: { name: 'GST 18%', rate: new Prisma.Decimal(18.0), type: TaxType.PERCENTAGE },
    create: {
      id: 'tax-gst-18',
      name: 'GST 18%',
      rate: new Prisma.Decimal(18.0),
      type: TaxType.PERCENTAGE,
      isIncludedInPrice: false,
      isActive: true,
    },
  });

  const vatTax = await prisma.tax.upsert({
    where: { id: 'tax-vat-5' },
    update: { name: 'VAT 5%', rate: new Prisma.Decimal(5.0), type: TaxType.PERCENTAGE },
    create: {
      id: 'tax-vat-5',
      name: 'VAT 5%',
      rate: new Prisma.Decimal(5.0),
      type: TaxType.PERCENTAGE,
      isIncludedInPrice: false,
      isActive: true,
    },
  });
  console.log('✅ Taxes seeded');

  // 5. Discounts
  const welcomeDiscount = await prisma.discount.upsert({
    where: { code: 'WELCOME10' },
    update: { name: 'Welcome 10%', value: new Prisma.Decimal(10.0), type: DiscountType.PERCENTAGE },
    create: {
      name: 'Welcome 10%',
      code: 'WELCOME10',
      type: DiscountType.PERCENTAGE,
      value: new Prisma.Decimal(10.0),
      isActive: true,
    },
  });
  console.log('✅ Discounts seeded');

  // 6. Products
  const erpProduct = await prisma.product.upsert({
    where: { code: 'PROD-ERP-01' },
    update: {
      name: 'Cloud ERP Suite',
      salesPrice: new Prisma.Decimal(5000.0),
      costPrice: new Prisma.Decimal(2000.0),
      type: ProductType.SERVICE,
      description: 'Comprehensive Enterprise Resource Planning SaaS suite',
    },
    create: {
      code: 'PROD-ERP-01',
      name: 'Cloud ERP Suite',
      salesPrice: new Prisma.Decimal(5000.0),
      costPrice: new Prisma.Decimal(2000.0),
      type: ProductType.SERVICE,
      description: 'Comprehensive Enterprise Resource Planning SaaS suite',
      isActive: true,
    },
  });

  const crmProduct = await prisma.product.upsert({
    where: { code: 'PROD-CRM-01' },
    update: {
      name: 'CRM Pro Plus',
      salesPrice: new Prisma.Decimal(2500.0),
      costPrice: new Prisma.Decimal(1000.0),
      type: ProductType.DIGITAL,
      description: 'Advanced Customer Relationship & Leads Management',
    },
    create: {
      code: 'PROD-CRM-01',
      name: 'CRM Pro Plus',
      salesPrice: new Prisma.Decimal(2500.0),
      costPrice: new Prisma.Decimal(1000.0),
      type: ProductType.DIGITAL,
      description: 'Advanced Customer Relationship & Leads Management',
      isActive: true,
    },
  });

  const supportProduct = await prisma.product.upsert({
    where: { code: 'PROD-SUP-01' },
    update: {
      name: '24/7 Dedicated Support',
      salesPrice: new Prisma.Decimal(1500.0),
      costPrice: new Prisma.Decimal(500.0),
      type: ProductType.SERVICE,
      description: 'Round-the-clock priority technical support SLA',
    },
    create: {
      code: 'PROD-SUP-01',
      name: '24/7 Dedicated Support',
      salesPrice: new Prisma.Decimal(1500.0),
      costPrice: new Prisma.Decimal(500.0),
      type: ProductType.SERVICE,
      description: 'Round-the-clock priority technical support SLA',
      isActive: true,
    },
  });
  console.log('✅ Products seeded');

  // 7. Variants (Odoo Brand with +560 extra price)
  const odooVariant = await prisma.variant.upsert({
    where: { id: 'var-erp-odoo' },
    update: {
      extraPrice: new Prisma.Decimal(560.0),
      brand: 'Odoo',
      name: 'Odoo Enterprise Integrated',
    },
    create: {
      id: 'var-erp-odoo',
      productId: erpProduct.id,
      brand: 'Odoo',
      name: 'Odoo Enterprise Integrated',
      extraPrice: new Prisma.Decimal(560.0),
      sku: 'ERP-ODOO-560',
      isActive: true,
    },
  });

  const stdVariant = await prisma.variant.upsert({
    where: { id: 'var-erp-std' },
    update: {
      extraPrice: new Prisma.Decimal(0.0),
      brand: 'Brightloop',
      name: 'Standard Cloud Edition',
    },
    create: {
      id: 'var-erp-std',
      productId: erpProduct.id,
      brand: 'Brightloop',
      name: 'Standard Cloud Edition',
      extraPrice: new Prisma.Decimal(0.0),
      sku: 'ERP-STD-00',
      isActive: true,
    },
  });
  console.log('✅ Product Variants seeded (with Odoo +₹560)');

  // 8. Subscription Plans
  const starterPlan = await prisma.plan.upsert({
    where: { code: 'PLAN-START' },
    update: {
      name: 'Starter Monthly',
      price: new Prisma.Decimal(2500.0),
      billingPeriod: BillingPeriod.MONTHLY,
      billingInterval: 1,
      minQuantity: 1,
      allowPause: true,
      allowRenew: true,
      allowEarlyClose: true,
    },
    create: {
      code: 'PLAN-START',
      name: 'Starter Monthly',
      description: 'For growing businesses and agile teams',
      price: new Prisma.Decimal(2500.0),
      billingPeriod: BillingPeriod.MONTHLY,
      billingInterval: 1,
      minQuantity: 1,
      allowPause: true,
      allowRenew: true,
      allowEarlyClose: true,
      isActive: true,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { code: 'PLAN-PRO' },
    update: {
      name: 'Professional Monthly',
      price: new Prisma.Decimal(5560.0),
      billingPeriod: BillingPeriod.MONTHLY,
      billingInterval: 1,
      minQuantity: 1,
      allowPause: true,
      allowRenew: true,
      allowEarlyClose: true,
    },
    create: {
      code: 'PLAN-PRO',
      name: 'Professional Monthly',
      description: 'Complete ERP + Odoo integration for enterprise scale',
      price: new Prisma.Decimal(5560.0),
      billingPeriod: BillingPeriod.MONTHLY,
      billingInterval: 1,
      minQuantity: 1,
      allowPause: true,
      allowRenew: true,
      allowEarlyClose: true,
      isActive: true,
    },
  });

  const annualPlan = await prisma.plan.upsert({
    where: { code: 'PLAN-ENT' },
    update: {
      name: 'Enterprise Annual',
      price: new Prisma.Decimal(55000.0),
      billingPeriod: BillingPeriod.YEARLY,
      billingInterval: 1,
      minQuantity: 1,
      allowPause: true,
      allowRenew: true,
      allowEarlyClose: true,
    },
    create: {
      code: 'PLAN-ENT',
      name: 'Enterprise Annual',
      description: 'Unlimited access, full SLA, 24/7 dedicated support',
      price: new Prisma.Decimal(55000.0),
      billingPeriod: BillingPeriod.YEARLY,
      billingInterval: 1,
      minQuantity: 1,
      allowPause: true,
      allowRenew: true,
      allowEarlyClose: true,
      isActive: true,
    },
  });
  console.log('✅ Subscription Plans seeded');

  // 9. Subscriptions
  const startDate = new Date();
  const nextBillingDate = new Date();
  nextBillingDate.setDate(nextBillingDate.getDate() + 30);

  const sub1 = await prisma.subscription.upsert({
    where: { subscriptionNumber: 'SUB-0001' },
    update: {
      customerId: customerProfile.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      nextBillingDate,
      autoRenew: true,
    },
    create: {
      subscriptionNumber: 'SUB-0001',
      customerId: customerProfile.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      nextBillingDate,
      autoRenew: true,
      paymentTerms: 'Immediate Payment',
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            description: 'Cloud ERP Suite (Odoo Edition)',
            quantity: 1,
            unitPrice: new Prisma.Decimal(5560.0),
            total: new Prisma.Decimal(5560.0),
          },
        ],
      },
    },
  });

  const sub2 = await prisma.subscription.upsert({
    where: { subscriptionNumber: 'SUB-0002' },
    update: {
      customerId: customerProfile.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      nextBillingDate,
      autoRenew: true,
    },
    create: {
      subscriptionNumber: 'SUB-0002',
      customerId: customerProfile.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      nextBillingDate,
      autoRenew: true,
      paymentTerms: 'Immediate Payment',
      lines: {
        create: [
          {
            productId: crmProduct.id,
            description: 'CRM Pro Plus',
            quantity: 1,
            unitPrice: new Prisma.Decimal(2500.0),
            total: new Prisma.Decimal(2500.0),
          },
        ],
      },
    },
  });
  console.log('✅ Subscriptions seeded (SUB-0001 & SUB-0002)');

  // 10. Invoices (1 Paid, 1 Sent, 1 Overdue)
  const pastPeriodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const pastPeriodEnd = new Date();
  const pastDueDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-202610-0001' },
    update: {
      status: InvoiceStatus.PAID,
      amountPaid: new Prisma.Decimal(5560.0),
    },
    create: {
      invoiceNumber: 'INV-202610-0001',
      subscriptionId: sub1.id,
      customerId: customerProfile.id,
      billingPeriodStart: pastPeriodStart,
      billingPeriodEnd: pastPeriodEnd,
      dueDate: pastPeriodEnd,
      subtotal: new Prisma.Decimal(5560.0),
      taxAmount: new Prisma.Decimal(0.0),
      discountAmount: new Prisma.Decimal(0.0),
      total: new Prisma.Decimal(5560.0),
      amountPaid: new Prisma.Decimal(5560.0),
      status: InvoiceStatus.PAID,
      lines: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            description: 'Cloud ERP Suite (Odoo Edition) - Oct 2026',
            quantity: 1,
            unitPrice: new Prisma.Decimal(5560.0),
            total: new Prisma.Decimal(5560.0),
          },
        ],
      },
    },
  });

  const futureDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-202610-0002' },
    update: {
      status: InvoiceStatus.SENT,
      amountPaid: new Prisma.Decimal(0.0),
    },
    create: {
      invoiceNumber: 'INV-202610-0002',
      subscriptionId: sub2.id,
      customerId: customerProfile.id,
      billingPeriodStart: new Date(),
      billingPeriodEnd: futureDueDate,
      dueDate: futureDueDate,
      subtotal: new Prisma.Decimal(2500.0),
      taxAmount: new Prisma.Decimal(0.0),
      discountAmount: new Prisma.Decimal(0.0),
      total: new Prisma.Decimal(2500.0),
      amountPaid: new Prisma.Decimal(0.0),
      status: InvoiceStatus.SENT,
      lines: {
        create: [
          {
            productId: crmProduct.id,
            description: 'CRM Pro Plus - Nov 2026',
            quantity: 1,
            unitPrice: new Prisma.Decimal(2500.0),
            total: new Prisma.Decimal(2500.0),
          },
        ],
      },
    },
  });

  // Overdue Invoice
  const overdueStart = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  const overdueEnd = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-202609-0003' },
    update: {
      status: InvoiceStatus.CONFIRMED,
      dueDate: overdueEnd,
      amountPaid: new Prisma.Decimal(0.0),
    },
    create: {
      invoiceNumber: 'INV-202609-0003',
      subscriptionId: sub1.id,
      customerId: customerProfile.id,
      billingPeriodStart: overdueStart,
      billingPeriodEnd: overdueEnd,
      dueDate: overdueEnd,
      subtotal: new Prisma.Decimal(3000.0),
      taxAmount: new Prisma.Decimal(0.0),
      discountAmount: new Prisma.Decimal(0.0),
      total: new Prisma.Decimal(3000.0),
      amountPaid: new Prisma.Decimal(0.0),
      status: InvoiceStatus.CONFIRMED,
      lines: {
        create: [
          {
            productId: supportProduct.id,
            description: 'Priority Support Retainer (Overdue)',
            quantity: 2,
            unitPrice: new Prisma.Decimal(1500.0),
            total: new Prisma.Decimal(3000.0),
          },
        ],
      },
    },
  });
  console.log('✅ Invoices seeded (1 Paid, 1 Sent, 1 Overdue)');

  // 11. Payments
  await prisma.payment.upsert({
    where: { paymentNumber: 'PAY-202610-0001' },
    update: {
      amount: new Prisma.Decimal(5560.0),
      status: PaymentStatus.SUCCESS,
    },
    create: {
      paymentNumber: 'PAY-202610-0001',
      invoiceId: inv1.id,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      amount: new Prisma.Decimal(5560.0),
      paymentDate: new Date(),
      status: PaymentStatus.SUCCESS,
      transactionReference: 'TXN-STRIPE-982141',
      note: 'Corporate Card auto-debit',
    },
  });
  console.log('✅ Payment records seeded');

  console.log('\n🎉 Database seeding complete! Test credentials:');
  console.log('   Admin:    admin@billora.com / Admin@12345');
  console.log('   Staff:    staff@billora.com / Staff@12345');
  console.log('   Customer: customer@billora.com / Customer@12345\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeder error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
