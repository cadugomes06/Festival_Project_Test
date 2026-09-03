import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { FilterOrdersDto } from '../../application/dto/filter-orders.dto';
import { OrderDetailDto } from '../../application/dto/order-detail.dto';
import { PaginatedOrdersDto } from '../../application/dto/paginated-orders.dto';
import { OrdersService } from '../../application/services/orders.service';

/**
 * Controller enxuto por design: só traduz HTTP <-> caso de uso. Nenhuma
 * regra de negócio (cálculo de total, filtro de faixa de valor) aparece aqui.
 *
 * `JwtAuthGuard` no nível do controller: todos os endpoints de pedidos
 * exigem um Bearer token válido (login via POST /auth/login).
 */
@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado' })
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista pedidos filtrados por data, faixa de valor e nome do cliente, paginado',
  })
  @ApiOkResponse({ type: PaginatedOrdersDto })
  findAll(@Query() filter: FilterOrdersDto): Promise<PaginatedOrdersDto> {
    return this.ordersService.filterOrders(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um pedido: itens e dados do comprador' })
  @ApiOkResponse({ type: OrderDetailDto })
  @ApiNotFoundResponse({ description: 'Pedido não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OrderDetailDto> {
    return this.ordersService.getOrderById(id);
  }
}
