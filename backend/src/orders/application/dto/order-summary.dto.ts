import { OrderEntity } from '../../domain/entities/order.entity';

/**
 * Formato de cada item da lista de pedidos. Propositalmente enxuto — a lista
 * não precisa do detalhe de cada item do pedido, só o suficiente para exibir
 * a tabela e permitir abrir o modal de detalhes a partir do `id`.
 */
export class OrderSummaryDto {
  id: number;
  data: Date;
  nomeCliente: string;
  valorTotal: number;

  static fromDomain(order: OrderEntity, nomeCliente: string): OrderSummaryDto {
    const dto = new OrderSummaryDto();
    dto.id = order.id;
    dto.data = order.data;
    dto.nomeCliente = nomeCliente;
    // Convertido para number só aqui, na resposta HTTP — o cálculo em si
    // (soma dos itens) já aconteceu com precisão exata no domínio.
    dto.valorTotal = order.valorTotal.toNumber();
    return dto;
  }
}
