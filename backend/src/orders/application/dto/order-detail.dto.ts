import { OrderEntity } from '../../domain/entities/order.entity';

class OrderDetailItemDto {
  itemId: number;
  nome: string;
  quantidade: number;
  valorUnitarioPraticado: number;
  subtotal: number;
}

class OrderDetailClienteDto {
  id: number;
  nome: string;
  email: string;
  telefone: string;
}

/**
 * Formato completo de um pedido: usado pelo modal de detalhes, com os
 * itens selecionados e os dados do comprador.
 */
export class OrderDetailDto {
  id: number;
  data: Date;
  valorTotal: number;
  cliente: OrderDetailClienteDto;
  itens: OrderDetailItemDto[];

  static fromDomain(
    order: OrderEntity,
    cliente: OrderDetailClienteDto,
  ): OrderDetailDto {
    const dto = new OrderDetailDto();
    dto.id = order.id;
    dto.data = order.data;
    // Convertido para number só aqui, na resposta HTTP — o cálculo em si
    // (soma dos itens) já aconteceu com precisão exata no domínio.
    dto.valorTotal = order.valorTotal.toNumber();
    dto.cliente = cliente;
    dto.itens = order.itens.map((item) => ({
      itemId: item.itemId,
      nome: item.nome,
      quantidade: item.quantidade,
      valorUnitarioPraticado: item.valorUnitarioPraticado.toNumber(),
      subtotal: item.subtotal.toNumber(),
    }));
    return dto;
  }
}
