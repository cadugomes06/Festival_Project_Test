import Decimal from 'decimal.js';

/**
 * Item que compõe um pedido, com o valor unitário efetivamente praticado
 * na venda (histórico) — pode ser diferente do valor atual cadastrado
 * para o item, caso ele tenha sido reajustado depois.
 *
 * Classe de domínio pura: sem decorators de framework nem dependência do
 * Prisma, para ficar testável isoladamente e reutilizável fora do contexto HTTP.
 * `decimal.js` é uma lib de matemática genérica (não é um pacote do Prisma
 * nem do Nest) — usar `number` aqui reintroduziria erro de ponto flutuante
 * ao somar vários itens (ver `OrderEntity.valorTotal`).
 */
export class OrderItemEntity {
  constructor(
    public readonly itemId: number,
    public readonly nome: string,
    public readonly quantidade: number,
    public readonly valorUnitarioPraticado: Decimal,
  ) {}

  get subtotal(): Decimal {
    return this.valorUnitarioPraticado.times(this.quantidade);
  }
}
