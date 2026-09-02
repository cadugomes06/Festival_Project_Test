import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  OrdersFilter,
  OrdersRepository,
  PedidoComRelacoes,
} from '../../application/interfaces/orders.repository';

const INCLUDE_RELACOES = {
  cliente: true,
  // Só `nome` do Item: é o único campo que a aplicação usa (ver
  // PedidoComRelacoes) — evita trazer descricao/valorUnitario/timestamps
  // do Item em toda listagem e detalhe de pedido.
  itens: { include: { item: { select: { nome: true } } } },
} satisfies Prisma.PedidoInclude;

/**
 * Implementação concreta do repositório de pedidos usando Prisma. É a única
 * classe do módulo que conhece o `PrismaService` — o restante da feature
 * (service, controller, domínio) trabalha só com a interface `OrdersRepository`.
 */
@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(filter: OrdersFilter): Promise<PedidoComRelacoes[]> {
    const where: Prisma.PedidoWhereInput = {
      data: {
        gte: filter.dataInicio,
        lte: filter.dataFim,
      },
      cliente: filter.nomeCliente
        ? { nome: { contains: filter.nomeCliente, mode: 'insensitive' } }
        : undefined,
    };

    return this.prisma.pedido.findMany({
      where,
      include: INCLUDE_RELACOES,
      orderBy: { data: 'desc' },
    });
  }

  findById(id: number): Promise<PedidoComRelacoes | null> {
    return this.prisma.pedido.findUnique({
      where: { id },
      include: INCLUDE_RELACOES,
    });
  }
}
