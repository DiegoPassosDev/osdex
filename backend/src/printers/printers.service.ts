import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { CategoryType } from '@prisma/client';

@Injectable()
export class PrintersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePrinterDto) {
    return this.prisma.printer.create({
      data: {
        name: dto.name,
        ip: dto.ip,
        port: dto.port ?? 9100,
        location: dto.location,
        restaurantId: dto.restaurantId,
        rules: dto.rules
          ? {
              create: dto.rules.map((r) => ({
                categoryType: r.categoryType,
              })),
            }
          : undefined,
      },
      include: { rules: true },
    });
  }

  async findAll(restaurantId: string) {
    return this.prisma.printer.findMany({
      where: { restaurantId, active: true },
      include: { rules: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllIncludingInactive(restaurantId: string) {
    return this.prisma.printer.findMany({
      where: { restaurantId },
      include: { rules: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const printer = await this.prisma.printer.findUnique({
      where: { id },
      include: { rules: true },
    });
    if (!printer) throw new NotFoundException('Impressora não encontrada.');
    return printer;
  }

  async findByRestaurantAndLocation(restaurantId: string, location: string) {
    return this.prisma.printer.findMany({
      where: { restaurantId, location, active: true },
      include: { rules: true },
    });
  }

  async update(id: string, dto: UpdatePrinterDto) {
    await this.findOne(id);
    return this.prisma.printer.update({
      where: { id },
      data: dto,
      include: { rules: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.printer.update({
      where: { id },
      data: { active: false },
      include: { rules: true },
    });
  }

  async addRule(printerId: string, categoryType: CategoryType) {
    await this.findOne(printerId);
    return this.prisma.printerRule.create({
      data: {
        printerId,
        categoryType,
      },
    });
  }

  async removeRule(ruleId: string) {
    const rule = await this.prisma.printerRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) throw new NotFoundException('Regra não encontrada.');
    return this.prisma.printerRule.delete({ where: { id: ruleId } });
  }
}
