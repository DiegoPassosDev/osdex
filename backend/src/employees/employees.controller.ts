import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantAccessGuard } from '../common/guards/restaurant-access.guard';
import { OnboardingOwnerGuard } from '../auth/guards/onboarding-owner.guard';

@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Post('login')
  login(@Body() dto: EmployeeLoginDto) {
    return this.employeesService.login(dto);
  }

  @Get('admin/restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard, OnboardingOwnerGuard)
  @Roles('MANAGER')
  findAdminByRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.employeesService.findAllByRestaurant(restaurantId);
  }

  @Get('restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard, RestaurantAccessGuard)
  @Roles('MANAGER')
  findAll(@Param('restaurantId') restaurantId: string) {
    return this.employeesService.findAllByRestaurant(restaurantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }
}
