import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, Prisma } from '@prisma/client';
import { OrdersGateway } from '../gateway/orders.gateway';
import { PrintersService } from '../printers/printers.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private printersService: PrintersService,
    private ordersService: OrdersService,
  ) {}

  async createPayment(data: {
    sessionId: string;
    restaurantId: string;
    cashierId: string;
    method: PaymentMethod;
    discount?: number;
    cashReceived?: number;
    notes?: string;
    authorizedBy?: string;
    paymentItems?: { method: PaymentMethod; amount: number }[];
  }) {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: data.sessionId },
      include: {
        orders: {
          where: { status: { not: 'CANCELLED' } },
          include: { items: { include: { menuItem: true } } },
        },
        bill: true,
        guests: true,
        table: true,
      },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (session.status === 'CLOSED')
      throw new BadRequestException('Mesa já encerrada.');

    // Calcula o total da sessão
    const subtotal = session.orders.reduce(
      (acc, o) => acc + o.items.reduce((s, i) => s + i.price * i.quantity, 0),
      0,
    );

    const bill = session.bill;
    const serviceCharge = bill?.serviceCharge ?? 0;
    const discount = data.discount ?? 0;
    const finalAmount = subtotal + serviceCharge - discount;
    const change =
      data.method === 'CASH' && data.cashReceived
        ? Math.max(0, data.cashReceived - finalAmount)
        : null;

    // Se for STORE_CREDIT, cria ou atualiza a dívida do cliente
    if (data.method === 'STORE_CREDIT') {
      if (!data.authorizedBy) {
        throw new BadRequestException('Crédito do cliente requer autorização.');
      }

      const guestId = session.orders[0]?.guestId;
      if (!guestId) throw new BadRequestException('Cliente não identificado.');

      const existingDebt = await this.prisma.customerDebt.findFirst({
        where: { guestId, restaurantId: data.restaurantId, active: true },
      });

      if (existingDebt) {
        await this.prisma.customerDebt.update({
          where: { id: existingDebt.id },
          data: {
            totalDebt: { increment: finalAmount },
            balance: { increment: finalAmount },
            transactions: {
              create: {
                amount: finalAmount,
                type: 'DEBIT',
                description: `Sessão #${data.sessionId.slice(0, 8)}`,
                authorizedBy: data.authorizedBy,
              },
            },
          },
        });
      } else {
        await this.prisma.customerDebt.create({
          data: {
            guestId,
            restaurantId: data.restaurantId,
            totalDebt: finalAmount,
            balance: finalAmount,
            transactions: {
              create: {
                amount: finalAmount,
                type: 'DEBIT',
                description: `Sessão #${data.sessionId.slice(0, 8)}`,
                authorizedBy: data.authorizedBy,
              },
            },
          },
        });
      }
    }

    // Cria o pagamento
    const payment = await this.prisma.payment.create({
      data: {
        sessionId: data.sessionId,
        restaurantId: data.restaurantId,
        cashierId: data.cashierId,
        totalAmount: subtotal,
        serviceCharge,
        discount,
        finalAmount,
        method: data.method,
        cashReceived: data.cashReceived,
        change,
        notes: data.notes,
        authorizedBy: data.authorizedBy,
        paymentItems: data.paymentItems
          ? { create: data.paymentItems }
          : undefined,
      },
      include: {
        paymentItems: true,
        cashier: true,
        session: { include: { table: true } },
      },
    });

    // Fecha a sessão
    const closedSession = await this.prisma.tableSession.update({
      where: { id: data.sessionId },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { table: true },
    });

    // Marca todos os pedidos pendentes como DELIVERED
    await this.ordersService.deliverPendingOrders(data.sessionId, data.restaurantId);

    this.gateway.notifyTableSessionUpdate(session.restaurantId, {
      ...closedSession,
      closeReason: 'PAYMENT_CLOSED',
      closedByRole: 'CASHIER',
    });

    this.gateway.notifySessionClosedByManager(data.sessionId, {
      guestIds: session.guests.map((g) => g.id),
      tableNumber: closedSession.table.number,
    });

    // Cria ou atualiza o Bill
    await this.prisma.bill.upsert({
      where: { sessionId: data.sessionId },
      create: {
        sessionId: data.sessionId,
        subtotal,
        serviceCharge,
        total: finalAmount,
        status: 'PAID',
        paidAt: new Date(),
      },
      update: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Envia comprovante para impressora do caixa
    await this.sendReceiptToPrint(
      data.restaurantId,
      session.table?.number ?? 0,
      session.orders,
      payment,
    );

    return payment;
  }

  private async sendReceiptToPrint(
    restaurantId: string,
    tableNumber: number,
    orders: Prisma.OrderGetPayload<{ include: { items: { include: { menuItem: true } } } }>[],
    payment: Prisma.PaymentGetPayload<{ include: { paymentItems: true; cashier: true; session: { include: { table: true } } } }>,
  ) {
    try {
      const [printers, restaurant] = await Promise.all([
        this.printersService.findAll(restaurantId),
        this.prisma.restaurant.findUnique({ where: { id: restaurantId } }),
      ]);
      const caixaPrinter = printers.find((p) => p.location === 'CAIXA');
      if (!caixaPrinter) return;

      const items = orders.flatMap((order) =>
        order.items.map((item) => ({
          name: item.menuItem?.name ?? 'Item',
          quantity: item.quantity,
          price: item.price,
        })),
      );

      this.gateway.notifyPrintComanda(restaurantId, 'caixa', {
        printer: {
          id: caixaPrinter.id,
          name: caixaPrinter.name,
          ip: caixaPrinter.ip,
          port: caixaPrinter.port,
        },
        restaurantName: restaurant?.name ?? 'OSDEX',
        restaurantCnpj: restaurant?.cnpj ?? null,
        restaurantAddress: this.composeAddress(restaurant),
        restaurantPhone: restaurant?.phone ?? null,
        tableNumber,
        orderId: payment.id,
        type: 'RECEIPT',
        items,
        subtotal: payment.totalAmount,
        serviceCharge: payment.serviceCharge,
        discount: payment.discount,
        finalAmount: payment.finalAmount,
        method: payment.method,
        cashReceived: payment.cashReceived,
        change: payment.change,
        createdAt: payment.createdAt,
      });
    } catch (error) {
      this.logger.error(`Falha ao enviar comprovante para impressão: ${error}`);
    }
  }

  private composeAddress(restaurant: { street?: string | null; number?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; address?: string | null } | null): string | null {
    if (!restaurant) return null;
    const streetLine = [restaurant.street, restaurant.number].filter(Boolean).join(', ');
    const cityLine = [restaurant.neighborhood, restaurant.city && restaurant.state
      ? `${restaurant.city}/${restaurant.state}`
      : restaurant.city || restaurant.state,
    ].filter(Boolean).join(' - ');

    if (!streetLine && !cityLine) {
      return restaurant.address ?? null;
    }

    return [streetLine, cityLine].filter(Boolean).join(' - ');
  }

  async getSessionBill(sessionId: string) {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        waiter: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          include: { items: { include: { menuItem: true } } },
        },
        bill: true,
        payments: { include: { cashier: true } },
      },
    });

    if (!session) throw new NotFoundException('Sessão não encontrada.');

    const subtotal = session.orders.reduce(
      (acc, o) => acc + o.items.reduce((s, i) => s + i.price * i.quantity, 0),
      0,
    );

    const bill = session.bill;
    const serviceCharge = bill?.serviceCharge ?? 0;
    const finalAmount = bill?.total ?? subtotal + serviceCharge;

    return {
      session,
      subtotal,
      serviceCharge,
      serviceChargeType: bill?.serviceChargeType ?? 'PERCENTAGE',
      serviceChargeAccepted: bill?.serviceChargeAccepted ?? true,
      customServiceChargeAmount: bill?.customServiceChargeAmount ?? null,
      finalAmount,
    };
  }

  async getPendingSessions(restaurantId: string) {
    return this.prisma.tableSession.findMany({
      where: {
        restaurantId,
        status: { in: ['REQUESTING_BILL', 'OPEN'] },
      },
      include: {
        table: true,
        waiter: true,
        guests: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          include: { items: { include: { menuItem: true } } },
        },
        bill: true,
        payments: true,
      },
      orderBy: { openedAt: 'asc' },
    });
  }

  async getCashierReport(restaurantId: string, date?: string) {
    const where: any = { restaurantId, status: 'PAID' };

    const startDate = new Date(date ?? new Date());
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startDate, lte: endDate };

    const payments = await this.prisma.payment.findMany({
      where,
      include: { cashier: true, session: { include: { table: true } } },
    });

    const byMethod = {
      CASH: 0,
      PIX: 0,
      DEBIT: 0,
      CREDIT: 0,
      VOUCHER: 0,
      CHECK: 0,
      STORE_CREDIT: 0,
      MIXED: 0,
    };

    payments.forEach((p) => {
      byMethod[p.method] = (byMethod[p.method] || 0) + p.finalAmount;
    });

    const totalCash = byMethod.CASH;
    const totalDigital = payments
      .filter((p) => p.method !== 'CASH' && p.method !== 'STORE_CREDIT')
      .reduce((acc, p) => acc + p.finalAmount, 0);

    return {
      payments,
      byMethod,
      totalRevenue: payments.reduce((acc, p) => acc + p.finalAmount, 0),
      totalCash,
      totalDigital,
      totalCredit: byMethod.STORE_CREDIT,
      totalServiceCharges: payments.reduce(
        (acc, p) => acc + p.serviceCharge,
        0,
      ),
      count: payments.length,
    };
  }

  async getDebts(restaurantId: string) {
    return this.prisma.customerDebt.findMany({
      where: { restaurantId, active: true, balance: { gt: 0 } },
      include: {
        guest: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { balance: 'desc' },
    });
  }

  async payDebt(debtId: string, amount: number, authorizedBy: string) {
    const debt = await this.prisma.customerDebt.findUnique({
      where: { id: debtId },
    });
    if (!debt) throw new NotFoundException('Dívida não encontrada.');
    if (amount > debt.balance)
      throw new BadRequestException('Valor maior que o saldo devedor.');

    return this.prisma.customerDebt.update({
      where: { id: debtId },
      data: {
        paidAmount: { increment: amount },
        balance: { decrement: amount },
        transactions: {
          create: {
            amount,
            type: 'CREDIT',
            description: 'Pagamento de dívida',
            authorizedBy,
          },
        },
      },
      include: {
        guest: true,
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });
  }
}
