import Decimal from 'decimal.js';
import { OrderItemEntity } from './order-item.entity';

/**
 * Entidade de domínio do Pedido. Concentra a única regra de negócio do
 * escopo deste teste: o valor total do pedido é derivado da soma dos itens,
 * não um campo armazenado — evita inconsistência entre o total exibido e os
 * itens que de fato compõem o pedido.
 */
export class OrderEntity {
  constructor(
    public readonly id: number,
    public readonly data: Date,
    public readonly clienteId: number,
    public readonly itens: OrderItemEntity[],
  ) {}

  get valorTotal(): Decimal {
    return this.itens.reduce(
      (total, item) => total.plus(item.subtotal),
      new Decimal(0),
    );
  }
}
