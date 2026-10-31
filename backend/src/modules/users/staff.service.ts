import bcrypt from 'bcrypt';
import { Role, Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { CreateStaffInput, GetStaffQuery } from './staff.validation';
import { ConflictError, NotFoundError } from '../../utils/errors';

export class StaffService {
  /**
   * Create a new Staff account (ADMIN only)
   */
  async createStaff(input: CreateStaffInput) {
    const email = input.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.STAFF,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get paginated staff members list with search (ADMIN only)
   */
  async getStaffList(query: GetStaffQuery) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: Role.STAFF,
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      where.OR = [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [staffMembers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: staffMembers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single staff member by ID (ADMIN only)
   */
  async getStaffById(id: string) {
    const staff = await prisma.user.findFirst({
      where: {
        id,
        role: Role.STAFF,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }

    return staff;
  }
}

export const staffService = new StaffService();
export default staffService;

