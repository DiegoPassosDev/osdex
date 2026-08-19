import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantAccessGuard } from '../common/guards/restaurant-access.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post()
  @Roles('CASHIER', 'MANAGER')
  create(@Body() body: CreatePaymentDto) {
    return this.service.createPayment(body);
  }

  @Get('session/:sessionId/bill')
  @Roles('GUEST', 'CASHIER', 'MANAGER', 'WAITER')
  getSessionBill(@Param('sessionId') sessionId: string) {
    return this.service.getSessionBill(sessionId);
  }

  @Get('restaurant/:restaurantId/pending')
  @Roles('CASHIER', 'MANAGER')
  @UseGuards(RestaurantAccessGuard)
  getPending(@Param('restaurantId') restaurantId: string) {
    return this.service.getPendingSessions(restaurantId);
  }

  @Get('restaurant/:restaurantId/report')
  @Roles('CASHIER', 'MANAGER')
  @UseGuards(RestaurantAccessGuard)
  getReport(
    @Param('restaurantId') restaurantId: string,
    @Query('date') date?: string,
  ) {
    return this.service.getCashierReport(restaurantId, date);
  }

  @Get('restaurant/:restaurantId/debts')
  @Roles('CASHIER', 'MANAGER')
  @UseGuards(RestaurantAccessGuard)
  getDebts(@Param('restaurantId') restaurantId: string) {
    return this.service.getDebts(restaurantId);
  }

  @Post('debts/:debtId/pay')
  @Roles('CASHIER', 'MANAGER')
  payDebt(
    @Param('debtId') debtId: string,
    @Body() body: { amount: number; authorizedBy: string },
  ) {
    return this.service.payDebt(debtId, body.amount, body.authorizedBy);
  }

  @Post(':paymentId/print')
  @Roles('CASHIER', 'MANAGER')
  printReceipt(@Param('paymentId') paymentId: string) {
    return this.service.printReceipt(paymentId);
  }
}
