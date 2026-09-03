import { ApiProperty } from '@nestjs/swagger';
import { OrderSummaryDto } from './order-summary.dto';

/**
 * Envelope de paginação da listagem. A paginação acontece em memória, no
 * mesmo ponto em que o filtro de valor já é aplicado (ver
 * `OrdersService.filterOrders`) — não há uma segunda ida ao banco só pra
 * contar o total.
 */
export class PaginatedOrdersDto {
  @ApiProperty({ type: [OrderSummaryDto] })
  data: OrderSummaryDto[];

  @ApiProperty({ example: 24, description: 'Total de pedidos após os filtros (antes da paginação)' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
