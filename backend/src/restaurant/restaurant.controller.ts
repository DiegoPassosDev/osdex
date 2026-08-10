import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Post('onboarding')
  @Roles('MANAGER')
  onboarding(@Body() dto: OnboardingDto) {
    return this.restaurantService.onboarding(dto);
  }

  @Post()
  @Roles('MANAGER')
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurantService.create(dto);
  }

  @Get()
  @Roles('MANAGER')
  findAll() {
    return this.restaurantService.findAll();
  }

  @Get(':id')
  @Roles('MANAGER', 'WAITER', 'KITCHEN', 'BAR', 'CASHIER', 'GUEST')
  findOne(@Param('id') id: string) {
    return this.restaurantService.findOne(id);
  }

  @Patch(':id')
  @Roles('MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantService.update(id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  remove(@Param('id') id: string) {
    return this.restaurantService.remove(id);
  }
}
