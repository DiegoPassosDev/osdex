import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRole } from '@prisma/client';
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
          address: dto.address,
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
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
