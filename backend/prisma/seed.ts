import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const hashedPassword = await bcrypt.hash('Admin@123456', 10);

  // Seed default Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.com' },
    update: {},
    create: {
      email: 'admin@brightloop.com',
      password: hashedPassword,
      firstName: 'Riya',
      lastName: 'Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Default admin created/verified: ${admin.email}`);
  console.log('🌱 Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

