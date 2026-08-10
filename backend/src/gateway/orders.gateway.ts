import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

type SocketUser = {
  sub?: string;
  role?: string;
  restaurantId?: string;
};

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL].filter(Boolean)
        : true,
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (typeof token === 'string') {
      try {
        const user = this.jwt.verify<SocketUser>(token);
        client.data.user = user;
        if (user.sub) {
          void client.join(`guest_${user.sub}`);
        }
      } catch {
        // token inválido — ignora, pode ser device anônimo
      }
    }
    // sem token também permite conexão (device page)
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as SocketUser | undefined;
    if (user?.role === 'WAITER' && user.restaurantId && user.sub) {
      const waiters = OrdersGateway.activeWaiters.get(user.restaurantId);
      if (waiters) {
        const entry = waiters.get(user.sub);
        if (entry === client.id) {
          waiters.delete(user.sub);
        }
        if (waiters.size === 0) {
          OrdersGateway.activeWaiters.delete(user.restaurantId);
        }
        this.updateActiveWaiters(user.restaurantId);
      }
    }
  }

  // Cliente entra na sala da sessão da mesa
  @SubscribeMessage('join_session')
  async handleJoinSession(
    @MessageBody() sessionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.sub) return;

    const session = await this.prisma.tableSession.findUnique({
      where: { id: sessionId },
      select: {
        guests: { select: { id: true } },
        restaurantId: true,
      },
    });
    if (!session) return;

    if (user.role === 'GUEST') {
      const isMember = session.guests.some((g) => g.id === user.sub);
      if (!isMember) return;
    } else if (
      user.restaurantId &&
      user.restaurantId !== session.restaurantId
    ) {
      return;
    }

    void client.join(`session_${sessionId}`);
  }

  // Cliente entra na sala do restaurante (gestor, cozinha, bar)
  @SubscribeMessage('join_restaurant')
  handleJoinRestaurant(
    @MessageBody() restaurantId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as SocketUser | undefined;
    const role = user?.role?.toUpperCase();
    if (
      !user ||
      role === 'GUEST' ||
      (user.restaurantId && user.restaurantId !== restaurantId)
    ) {
      return;
    }

    void client.join(`restaurant_${restaurantId}`);

    if (user.role === 'WAITER' && user.sub) {
      const waiters =
        OrdersGateway.activeWaiters.get(restaurantId) ?? new Map();
      waiters.set(user.sub, client.id);
      OrdersGateway.activeWaiters.set(restaurantId, waiters);
      this.updateActiveWaiters(restaurantId);
    }

    // Envia contagem atual para quem acabou de entrar (gestor ao dar refresh, etc.)
    const count = OrdersGateway.activeWaiters.get(restaurantId)?.size ?? 0;
    client.emit('active_waiters_updated', count);
  }

  // Notifica novo pedido para o restaurante
  notifyNewOrder(restaurantId: string, order: any, sessionId?: string) {
    this.server.to(`restaurant_${restaurantId}`).emit('new_order', order);
    if (sessionId) {
      this.server.to(`session_${sessionId}`).emit('new_order', order);
    }
  }

  // Notifica atualização de status para a sessão e o restaurante
  notifyOrderStatusUpdate(restaurantId: string, sessionId: string, order: any) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .to(`session_${sessionId}`)
      .emit('order_status_updated', order);
  }

  // Notifica atualização de status de um item individual
  notifyOrderItemStatusUpdate(
    restaurantId: string,
    sessionId: string,
    payload: { orderId: string; itemId: string; status: string; order: any },
  ) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .to(`session_${sessionId}`)
      .emit('order_item_status_updated', payload);
  }

  // Notifica chamada de garçom
  notifyWaiterCall(restaurantId: string, data: any) {
    this.server.to(`restaurant_${restaurantId}`).emit('waiter_called', data);
  }

  // Notifica pedido de conta
  notifyBillRequest(restaurantId: string, sessionId: string, data: any) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .to(`session_${sessionId}`)
      .emit('bill_requested', data);
  }

  // Notifica mudanca na ocupacao/status de mesas
  notifyTableSessionUpdate(restaurantId: string, data: any) {
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('table_session_updated', data);
  }

  // Notifica clientes que a mesa foi encerrada pelo gestor
  notifySessionClosedByManager(
    sessionId: string,
    data: { guestIds: string[]; tableNumber: number },
  ) {
    for (const guestId of data.guestIds) {
      this.server.to(`guest_${guestId}`).emit('session_closed_by_manager', {
        tableNumber: data.tableNumber,
      });
    }
    this.server
      .to(`session_${sessionId}`)
      .emit('session_closed_by_manager', { tableNumber: data.tableNumber });
  }

  // Dispositivo de impressão entra na sala
  @SubscribeMessage('join_device')
  handleJoinDevice(
    @MessageBody() data: { restaurantId: string; location: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as SocketUser | undefined;
    const allowedLocations = ['cozinha', 'bar', 'caixa'];

    if (!data?.restaurantId || !data?.location) {
      client.emit('join_device_error', {
        message: 'restaurantId e location são obrigatórios.',
      });
      return;
    }

    const location = data.location.toLowerCase();
    if (!allowedLocations.includes(location)) {
      client.emit('join_device_error', { message: 'Localização inválida.' });
      return;
    }

    if (user?.restaurantId && user.restaurantId !== data.restaurantId) {
      client.emit('join_device_error', {
        message: 'Acesso negado a este restaurante.',
      });
      return;
    }

    void client.join(`device_${data.restaurantId}_${location}`);
    client.emit('join_device_success', {
      room: `device_${data.restaurantId}_${location}`,
    });
  }

  // Notifica dispositivos de impressão
  notifyPrintComanda(restaurantId: string, location: string, data: unknown) {
    this.server
      .to(`device_${restaurantId}_${location}`)
      .emit('print_comanda', data);
  }

  // ── Garçons ativos (online) ───────────────────────────────────────────────

  private static activeWaiters = new Map<string, Map<string, string>>();
  // restaurantId -> Map<userId, socketId>

  private updateActiveWaiters(restaurantId: string) {
    const count = OrdersGateway.activeWaiters.get(restaurantId)?.size ?? 0;
    this.server
      .to(`restaurant_${restaurantId}`)
      .emit('active_waiters_updated', count);
  }

  // ── Autorização de acesso à mesa ──────────────────────────────────────────

  // Notifica o responsável que alguém quer entrar na mesa
  // Se o ownerId for de um guest, notifica o guest
  // Se for de um funcionário, notifica o restaurante inteiro
  // O frontend ouve 'table_access_requested'
  notifyAccessRequest(
    sessionId: string,
    data: {
      requestId: string;
      guestId: string;
      guestName: string;
      tableNumber: number;
      ownerId: string;
    },
    restaurantId?: string,
  ) {
    this.server
      .to(`session_${sessionId}`)
      .to(`guest_${data.ownerId}`)
      .emit('table_access_requested', data);

    // Notifica também o restaurante para alcançar funcionários
    if (restaurantId) {
      this.server
        .to(`restaurant_${restaurantId}`)
        .emit('table_access_requested', data);
    }
  }

  // Notifica o solicitante sobre a decisão do dono
  // O frontend do solicitante ouve 'table_access_response'
  notifyAccessResponse(
    sessionId: string,
    data: {
      requestId: string;
      approved: boolean;
      guestId: string;
    },
  ) {
    this.server
      .to(`session_${sessionId}`)
      .to(`guest_${data.guestId}`)
      .emit('table_access_response', data);
  }
}
