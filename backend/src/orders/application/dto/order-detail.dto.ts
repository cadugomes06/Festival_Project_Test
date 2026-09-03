import { ApiProperty } from '@nestjs/swagger';
import { OrderEntity } from '../../domain/entities/order.entity';

class OrderDetailItemDto {
  @ApiProperty({ example: 1 })
  itemId: number;

  @ApiProperty({ example: 'Hambúrguer Artesanal' })
  nome: string;

  @ApiProperty({ example: 2 })
  quantidade: number;

  @ApiProperty({ example: 28 })
  valorUnitarioPraticado: number;

  @ApiProperty({ example: 56 })
  subtotal: number;
}

class OrderDetailClienteDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Ana Souza' })
  nome: string;

  @ApiProperty({ example: 'ana.souza@example.com' })
  email: string;

  @ApiProperty({ example: '11988887777' })
  telefone: string;
}

/**
 * Formato completo de um pedido: usado pelo modal de detalhes, com os
 * itens selecionados e os dados do comprador.
 */
export class OrderDetailDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2026-08-10T14:30:00.000Z' })
  data: Date;

  @ApiProperty({ example: 52 })
  valorTotal: number;

  @ApiProperty({ type: OrderDetailClienteDto })
  cliente: OrderDetailClienteDto;

  @ApiProperty({ type: [OrderDetailItemDto] })
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
