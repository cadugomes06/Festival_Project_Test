import Decimal from 'decimal.js';
import { OrderItemEntity } from './order-item.entity';
import { OrderEntity } from './order.entity';

describe('OrderEntity', () => {
  it('calcula o valor total como a soma dos subtotais dos itens', () => {
    const itens = [
      new OrderItemEntity(1, 'Cerveja Long Neck', 2, new Decimal(12)),
      new OrderItemEntity(2, 'Hambúrguer Artesanal', 1, new Decimal(28)),
    ];
    const pedido = new OrderEntity(1, new Date('2026-08-10'), 1, itens);

    expect(pedido.valorTotal.toNumber()).toBe(52);
  });

  it('retorna zero quando o pedido não tem itens', () => {
    const pedido = new OrderEntity(1, new Date('2026-08-10'), 1, []);

    expect(pedido.valorTotal.toNumber()).toBe(0);
  });

  it('usa o valor unitário praticado no pedido, não um valor atual externo', () => {
    // Cerveja custava 12 no cadastro, mas foi vendida por 10 nesse pedido.
    const itens = [
      new OrderItemEntity(1, 'Cerveja Long Neck', 4, new Decimal(10)),
    ];
    const pedido = new OrderEntity(1, new Date('2026-08-11'), 1, itens);

    expect(pedido.valorTotal.toNumber()).toBe(40);
  });

  it('soma valores decimais sem o erro de arredondamento do ponto flutuante nativo', () => {
    // Em number puro do JS, 0.1 + 0.2 === 0.30000000000000004.
    const itens = [
      new OrderItemEntity(1, 'Item A', 1, new Decimal('0.1')),
      new OrderItemEntity(2, 'Item B', 1, new Decimal('0.2')),
    ];
    const pedido = new OrderEntity(1, new Date('2026-08-10'), 1, itens);

    expect(pedido.valorTotal.toString()).toBe('0.3');
  });
});
