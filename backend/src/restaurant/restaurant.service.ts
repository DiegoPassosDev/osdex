import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRole, TableSessionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class RestaurantService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async create(dto: CreateRestaurantDto) {
    return this.prisma.restaurant.create({ data: dto });
  }

  async onboarding(dto: OnboardingDto) {
    const ownerEmails = (
      this.config.get<string>('ONBOARDING_ADMIN_EMAILS') || 'fluixit@gmail.com'
    )
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (ownerEmails.includes(dto.managerEmail.trim().toLowerCase())) {
      throw new ConflictException(
        'Não é possível usar o e-mail do administrador do sistema.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.employee.findUnique({
        where: { email: dto.managerEmail },
      });
      if (existing) throw new ConflictException('E-mail já cadastrado.');

      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.name,
          logoUrl: dto.logoUrl,
          cnpj: dto.cnpj,
          phone: dto.phone,
          address:
            dto.address ??
            [dto.street, dto.number, dto.neighborhood]
              .filter(Boolean)
              .join(', '),
          zipCode: dto.zipCode,
          street: dto.street,
          number: dto.number,
          neighborhood: dto.neighborhood,
          city: dto.city,
          state: dto.state,
          serviceCharge: dto.serviceCharge,
          cancelWindowMin: dto.cancelWindowMin,
          acceptWindowMin: dto.acceptWindowMin,
        },
      });

      const passwordHash = await bcrypt.hash(dto.managerPassword, 12);
      const pinHash = await bcrypt.hash(dto.managerPin, 12);

      const manager = await tx.employee.create({
        data: {
          name: dto.managerName,
          email: dto.managerEmail,
          passwordHash,
          pin: pinHash,
          role: EmployeeRole.MANAGER,
          restaurantId: restaurant.id,
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          restaurantId: true,
        },
      });

      return { restaurant, manager };
    });
  }

  async findAll() {
    const restaurants = await this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        cnpj: true,
        phone: true,
        address: true,
        zipCode: true,
        street: true,
        number: true,
        neighborhood: true,
        city: true,
        state: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tables: true,
            categories: true,
            employees: true,
          },
        },
        employees: {
          where: { role: EmployeeRole.MANAGER },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    });

    const [menuItemsByCategory, activeSessionsByRestaurant, categories] =
      await Promise.all([
        this.prisma.menuItem.groupBy({
          by: ['categoryId'],
          _count: { _all: true },
        }),
        this.prisma.tableSession.groupBy({
          by: ['restaurantId'],
          where: { status: { not: TableSessionStatus.CLOSED } },
          _count: { _all: true },
        }),
        this.prisma.category.findMany({
          select: { id: true, restaurantId: true },
        }),
      ]);

    const categoryRestaurant = new Map(
      categories.map((category) => [category.id, category.restaurantId]),
    );

    const menuItemsByRestaurant = new Map<string, number>();
    for (const group of menuItemsByCategory) {
      const restaurantId = categoryRestaurant.get(group.categoryId);
      if (!restaurantId) continue;
      menuItemsByRestaurant.set(
        restaurantId,
        (menuItemsByRestaurant.get(restaurantId) || 0) + group._count._all,
      );
    }

    const activeSessions = new Map(
      activeSessionsByRestaurant.map((group) => [
        group.restaurantId,
        group._count._all,
      ]),
    );

    return restaurants.map((restaurant) => ({
      ...restaurant,
      stats: {
        tables: restaurant._count.tables,
        menuItems: menuItemsByRestaurant.get(restaurant.id) || 0,
        employees: restaurant._count.employees,
        activeSessions: activeSessions.get(restaurant.id) || 0,
      },
      _count: undefined,
    }));
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado.');
    return restaurant;
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    await this.findOne(id);
    return this.prisma.restaurant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.restaurant.delete({ where: { id } });
  }
}
