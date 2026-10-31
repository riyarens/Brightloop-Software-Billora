import { Prisma, Role } from '@prisma/client';
import prisma from '../../config/prisma';
import { GetCustomersQuery, UpdateCustomerInput } from './customer.validation';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuthUser } from '../../types/express';

export class CustomerService {
  /**
   * Get paginated customer list (ADMIN and STAFF only)
   */
  async getCustomers(query: GetCustomersQuery, user: AuthUser) {
    if (user.role === Role.CUSTOMER) {
      throw new ForbiddenError('Forbidden: Customers cannot access customer directory');
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { company: { contains: searchTerm, mode: 'insensitive' } },
        { city: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              subscriptions: true,
              invoices: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single customer details with strict ownership verification
   * A customer requesting another customer's information must receive HTTP 403
   */
  async getCustomerById(id: string, user: AuthUser) {
    // If the caller is a customer, verify ownership at the query level
    if (user.role === Role.CUSTOMER) {
      // First check if the requested customer exists
      const targetCustomer = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!targetCustomer) {
        throw new NotFoundError('Customer not found');
      }

      // Check ownership: does this customer belong to the authenticated user?
      if (targetCustomer.userId !== user.id) {
        throw new ForbiddenError('Forbidden: You can only access your own customer records');
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            subscriptions: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  /**
   * Update customer record with strict ownership verification
   */
  async updateCustomer(id: string, data: UpdateCustomerInput, user: AuthUser) {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Customer can only update their own record
    if (user.role === Role.CUSTOMER && customer.userId !== user.id) {
      throw new ForbiddenError('Forbidden: You can only update your own customer records');
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        company: data.company,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        taxId: data.taxId,
        notes: data.notes,
      },
    });

    return updated;
  }
}

export const customerService = new CustomerService();
export default customerService;

