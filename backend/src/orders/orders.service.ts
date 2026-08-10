import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrdersGateway } from '../gateway/orders.gateway';
import { StockService } from 'src/stock/stock.service';
import { PrintersService } from '../printers/printers.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private stockService: StockService,
    private printersService: PrintersService,
  ) {}

  async create(dto: CreateOrderDto) {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: dto.sessionId },
      include: { restaurant: true, guests: true, table: true },
    });
    if (!session) throw new NotFoundException('Sessão de mesa não encontrada.');
    if (session.status === 'CLOSED')
      throw new BadRequestException('Esta mesa já foi encerrada.');

    let guestId = dto.guestId;
    if (!guestId) {
      const existing = session.guests?.[0];
      if (existing) {
        guestId = existing.id;
      } else {
        const guest = await this.prisma.guest.create({
          data: {
            name: session.guestLabel || `Mesa ${session.id.slice(-4)}`,
            email: `mesa-${Date.now()}@local`,
            passwordHash: '',
          },
        });
        await this.prisma.tableSession.update({
          where: { id: session.id },
          data: { guests: { connect: { id: guest.id } } },
        });
        guestId = guest.id;
      }
    }

    const isMember = session.guests?.some((g) => g.id === guestId);
    if (!isMember && dto.guestId)
      throw new BadRequestException('Você não faz parte desta mesa.');

    const uniqueItemIds = [...new Set(dto.items.map((i) => i.menuItemId))];

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: uniqueItemIds },
        available: true,
      },
    });

    if (menuItems.length !== uniqueItemIds.length)
      throw new BadRequestException(
        'Um ou mais itens estão indisponíveis ou não existem.',
      );

    const order = await this.prisma.order.create({
      data: {
        sessionId: dto.sessionId,
        guestId,
        items: {
          create: dto.items.map((item) => {
            const menuItem = menuItems.find((m) => m.id === item.menuItemId);
            if (!menuItem) {
              throw new BadRequestException(
                'Item indisponível ou inexistente.',
              );
            }
            return {
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              notes: item.notes,
              price: menuItem.price,
            };
          }),
        },
        statusHistory: {
          create: { status: OrderStatus.WAITING },
        },
      },
      include: {
        items: { include: { menuItem: { include: { category: true } } } },
        statusHistory: true,
        session: { include: { table: true } },
      },
    });

    // Notifica cozinha, bar e gestor em tempo real
    this.gateway.notifyNewOrder(session.restaurantId, order, dto.sessionId);

    // Envia comanda para impressoras vinculadas
    await this.sendToPrinters(
      session.restaurantId,
      session.table?.number ?? 0,
      order,
    );

    return order;
  }

  async findBySession(sessionId: string) {
    return this.prisma.order.findMany({
      where: { sessionId },
      include: {
        items: { include: { menuItem: { include: { category: true } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByRestaurant(restaurantId: string, date?: string) {
    const where: any = { session: { restaurantId } };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: { include: { menuItem: { include: { category: true } } } },
        session: { include: { table: true, waiter: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: { include: { category: true } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        session: { include: { table: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const existing = await this.findOne(id);

    await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        statusHistory: {
          create: { status: dto.status },
        },
      },
    });

    if (dto.status === OrderStatus.DELIVERED) {
      await this.stockService.deductByOrder(id);

      // Itens que já têm statusChangedAt (já passaram por READY) — mantém o timestamp original
      await this.prisma.orderItem.updateMany({
        where: {
          orderId: id,
          status: { not: OrderStatus.CANCELLED },
          statusChangedAt: { not: null },
        },
        data: { status: OrderStatus.DELIVERED },
      });

      // Itens sem statusChangedAt (pularam READY) — marca com timestamp atual
      await this.prisma.orderItem.updateMany({
        where: {
          orderId: id,
          status: { not: OrderStatus.CANCELLED },
          statusChangedAt: null,
        },
        data: { status: OrderStatus.DELIVERED, statusChangedAt: new Date() },
      });
    }

    // Recarrega para pegar status atualizados dos itens
    const finalOrder = await this.findOne(id);

    // Notifica cliente e gestor em tempo real
    this.gateway.notifyOrderStatusUpdate(
      existing.session.restaurantId,
      existing.sessionId,
      finalOrder,
    );

    return finalOrder;
  }

  async cancel(id: string) {
    return this.updateStatus(id, { status: OrderStatus.CANCELLED });
  }

  async updateItemStatus(
    orderId: string,
    itemId: string,
    dto: UpdateItemStatusDto,
  ) {
    const order = await this.findOne(orderId);

    const orderItem = order.items.find((i) => i.id === itemId);
    if (!orderItem)
      throw new NotFoundException('Item do pedido não encontrado.');

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        statusChangedAt:
          dto.status === OrderStatus.READY ? new Date() : undefined,
      },
    });

    // Recarrega o pedido com os itens atualizados
    const updatedOrder = await this.findOne(orderId);

    // Recalcula o status agregado do pedido com base nos itens
    const itemStatuses = updatedOrder.items.map((i) => i.status);
    const aggregateStatus = this.computeAggregateStatus(itemStatuses);

    // Atualiza o status do pedido se mudou
    if (aggregateStatus !== order.status) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: aggregateStatus },
      });

      await this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: aggregateStatus,
        },
      });
    }

    const finalOrder = await this.findOne(orderId);

    // Notifica mudança no item individual
    this.gateway.notifyOrderItemStatusUpdate(
      order.session.restaurantId,
      order.sessionId,
      {
        orderId,
        itemId,
        status: dto.status,
        order: finalOrder,
      },
    );

    // Notifica mudança no pedido como um todo (se o status agregado mudou)
    if (aggregateStatus !== order.status) {
      this.gateway.notifyOrderStatusUpdate(
        order.session.restaurantId,
        order.sessionId,
        finalOrder,
      );
    }

    return finalOrder;
  }

  async deliverPendingOrders(sessionId: string, restaurantId: string) {
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        sessionId,
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
      include: {
        items: { include: { menuItem: { include: { category: true } } } },
        session: { include: { table: true } },
      },
    });

    for (const order of pendingOrders) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DELIVERED,
          statusHistory: { create: { status: OrderStatus.DELIVERED } },
        },
      });
      await this.prisma.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: { notIn: [OrderStatus.CANCELLED] },
        },
        data: { status: OrderStatus.DELIVERED },
      });

      const finalOrder = await this.findOne(order.id);
      this.gateway.notifyOrderStatusUpdate(restaurantId, sessionId, finalOrder);
    }

    return pendingOrders.length;
  }

  private computeAggregateStatus(statuses: OrderStatus[]): OrderStatus {
    if (
      statuses.every(
        (s) => s === OrderStatus.DELIVERED || s === OrderStatus.CANCELLED,
      )
    )
      return OrderStatus.DELIVERED;
    if (statuses.some((s) => s === OrderStatus.ON_THE_WAY))
      return OrderStatus.ON_THE_WAY;
    if (statuses.some((s) => s === OrderStatus.READY)) return OrderStatus.READY;
    if (statuses.some((s) => s === OrderStatus.PREPARING))
      return OrderStatus.PREPARING;
    return OrderStatus.WAITING;
  }

  private async sendToPrinters(
    restaurantId: string,
    tableNumber: number,
    order: Prisma.OrderGetPayload<{
      include: {
        items: { include: { menuItem: { include: { category: true } } } };
        session: true;
      };
    }>,
  ) {
    try {
      const printers = await this.printersService.findAll(restaurantId);
      if (printers.length === 0) return;

      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { name: true },
      });

      for (const printer of printers) {
        const matchingCategories = printer.rules.map((r) => r.categoryType);
        const itemsToPrint = order.items.filter((item) =>
          matchingCategories.includes(item.menuItem?.category?.type),
        );
        if (itemsToPrint.length === 0) continue;

        const location = printer.location.toLowerCase();
        this.gateway.notifyPrintComanda(restaurantId, location, {
          printer: {
            id: printer.id,
            name: printer.name,
            ip: printer.ip,
            port: printer.port,
          },
          restaurantName: restaurant?.name ?? 'OSDEX',
          tableNumber,
          orderId: order.id,
          items: itemsToPrint.map((item) => ({
            name: item.menuItem.name,
            quantity: item.quantity,
            notes: item.notes,
            category: item.menuItem.category?.name,
          })),
          createdAt: order.createdAt,
        });
      }
    } catch (error) {
      this.logger.error(`Falha ao enviar comanda para impressoras: ${error}`);
    }
  }
}
