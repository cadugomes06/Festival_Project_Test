import { Prisma } from '@prisma/client';

/**
 * Formato bruto retornado pela camada de persistência: um Pedido com as
 * relações necessárias já carregadas (cliente e itens do pedido, cada um
 * com o Item associado). Usamos o tipo gerado pelo Prisma (via
 * `Prisma.PedidoGetPayload`) só aqui, na borda entre Infrastructure e
 * Application — o restante da camada de aplicação e o domínio não conhecem o Prisma.
 */
export type PedidoComRelacoes = Prisma.PedidoGetPayload<{
  include: {
    cliente: true;
    itens: { include: { item: true } };
  };
}>;

export interface OrdersFilter {
  dataInicio?: Date;
  dataFim?: Date;
  nomeCliente?: string;
}

/**
 * Interface do repositório de pedidos. O caso de uso (OrdersService)
 * depende apenas desta abstração — quem implementa com Prisma fica em
 * Infrastructure. Isso é o que permite trocar a fonte de dados ou mockar o
 * repositório em teste unitário sem tocar na regra de negócio (DIP).
 */
export interface OrdersRepository {
  findMany(filter: OrdersFilter): Promise<PedidoComRelacoes[]>;
  findById(id: number): Promise<PedidoComRelacoes | null>;
}

/**
 * Token de injeção. Interfaces TypeScript não existem em tempo de execução,
 * então o Nest precisa de um token concreto (Symbol) para resolver a
 * dependência — padrão documentado no guia de "Custom providers" do Nest.
 */
export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
