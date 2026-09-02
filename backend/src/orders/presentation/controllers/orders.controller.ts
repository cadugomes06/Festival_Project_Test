import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { FilterOrdersDto } from '../../application/dto/filter-orders.dto';
import { OrderDetailDto } from '../../application/dto/order-detail.dto';
import { OrderSummaryDto } from '../../application/dto/order-summary.dto';
import { OrdersService } from '../../application/services/orders.service';

/**
 * Controller enxuto por design: só traduz HTTP <-> caso de uso. Nenhuma
 * regra de negócio (cálculo de total, filtro de faixa de valor) aparece aqui.
 *
 * `JwtAuthGuard` no nível do controller: todos os endpoints de pedidos
 * exigem um Bearer token válido (login via POST /auth/login).
 */
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() filter: FilterOrdersDto): Promise<OrderSummaryDto[]> {
    return this.ordersService.filterOrders(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OrderDetailDto> {
    return this.ordersService.getOrderById(id);
  }
}
