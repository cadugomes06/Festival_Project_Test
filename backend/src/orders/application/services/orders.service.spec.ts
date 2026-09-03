import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FilterOrdersDto } from '../dto/filter-orders.dto';
import {
  OrdersFilter,
  OrdersRepository,
  PedidoComRelacoes,
} from '../interfaces/orders.repository';
import { OrdersService } from './orders.service';

/** Preenche page/limit com os padrões quando o teste não precisa deles. */
function criarFiltro(overrides: Partial<FilterOrdersDto> = {}): FilterOrdersDto {
  return { page: 1, limit: 10, ...overrides };
}

function criarPedido(overrides: {
  id: number;
  data?: Date;
  nomeCliente?: string;
  itens: {
    itemId: number;
    nome: string;
    quantidade: number;
    valorUnitarioPraticado: number;
  }[];
}): PedidoComRelacoes {
  return {
    id: overrides.id,
    data: overrides.data ?? new Date('2026-08-10'),
    clienteId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    cliente: {
      id: 1,
      nome: overrides.nomeCliente ?? 'Ana Souza',
      email: 'ana.souza@example.com',
      telefone: '11988887777',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    itens: overrides.itens.map((item, index) => ({
      id: index + 1,
      pedidoId: overrides.id,
      itemId: item.itemId,
      quantidade: item.quantidade,
      valorUnitarioPraticado: new Prisma.Decimal(item.valorUnitarioPraticado),
      item: { nome: item.nome },
    })),
  };
}

/**
 * Repositório em memória usado só nos testes: como o OrdersService depende
 * da interface OrdersRepository (e não do Prisma), dá para verificar a regra
 * de negócio sem precisar de um banco de dados real.
 */
class FakeOrdersRepository implements OrdersRepository {
  constructor(private readonly pedidos: PedidoComRelacoes[]) {}

  lastFilter?: OrdersFilter;

  async findMany(filter: OrdersFilter): Promise<PedidoComRelacoes[]> {
    this.lastFilter = filter;
    return this.pedidos;
  }

  async findById(id: number): Promise<PedidoComRelacoes | null> {
    return this.pedidos.find((pedido) => pedido.id === id) ?? null;
  }
}

describe('OrdersService', () => {
  const pedidoBarato = criarPedido({
    id: 1,
    nomeCliente: 'Ana Souza',
    itens: [
      {
        itemId: 1,
        nome: 'Água Mineral',
        quantidade: 2,
        valorUnitarioPraticado: 5,
      },
    ],
  });
  const pedidoCaro = criarPedido({
    id: 2,
    nomeCliente: 'Bruno Lima',
    itens: [
      {
        itemId: 2,
        nome: 'Camiseta do Festival',
        quantidade: 1,
        valorUnitarioPraticado: 60,
      },
    ],
  });

  it('converte dataInicio para meia-noite no fuso do Brasil (-03:00), não UTC', async () => {
    const repository = new FakeOrdersRepository([pedidoBarato]);
    const service = new OrdersService(repository);

    await service.filterOrders(criarFiltro({
      dataInicio: '2026-08-01',
      nomeCliente: 'Ana',
    }));

    expect(repository.lastFilter?.dataInicio).toEqual(
      new Date('2026-08-01T00:00:00-03:00'),
    );
    expect(repository.lastFilter?.nomeCliente).toBe('Ana');
  });

  it('estende dataFim até o último milissegundo do dia no fuso do Brasil, para incluir o dia inteiro', async () => {
    const repository = new FakeOrdersRepository([pedidoBarato]);
    const service = new OrdersService(repository);

    await service.filterOrders(criarFiltro({ dataFim: '2026-08-31' }));

    // Sem fixar o fuso -03:00, um pedido feito às 22h (local) de
    // "2026-08-31" (= 2026-09-01T01:00:00Z) ficaria de fora do filtro,
    // porque new Date('2026-08-31') é meia-noite em UTC, não no Brasil.
    expect(repository.lastFilter?.dataFim).toEqual(
      new Date('2026-08-31T23:59:59.999-03:00'),
    );
  });

  it('filtra por faixa de valor total calculada a partir dos itens', async () => {
    const repository = new FakeOrdersRepository([pedidoBarato, pedidoCaro]);
    const service = new OrdersService(repository);

    const resultado = await service.filterOrders(criarFiltro({ valorMin: 20 }));

    expect(resultado.total).toBe(1);
    expect(resultado.data).toHaveLength(1);
    expect(resultado.data[0].id).toBe(pedidoCaro.id);
    expect(resultado.data[0].valorTotal).toBe(60);
  });

  it('pagina o resultado já filtrado, sem contar itens fora da faixa de valor no total', async () => {
    const pedidos = [pedidoBarato, pedidoCaro, criarPedido({
      id: 3,
      nomeCliente: 'Carla Nunes',
      itens: [{ itemId: 3, nome: 'Hambúrguer Artesanal', quantidade: 1, valorUnitarioPraticado: 28 }],
    })];
    const repository = new FakeOrdersRepository(pedidos);
    const service = new OrdersService(repository);

    // 3 pedidos no total, mas só 2 (o "caro" de 60 e o de 28) passam no
    // filtro de valor; com limit=1, a página 2 deve trazer o segundo deles.
    const resultado = await service.filterOrders(
      criarFiltro({ valorMin: 20, page: 2, limit: 1 }),
    );

    expect(resultado.total).toBe(2);
    expect(resultado.totalPages).toBe(2);
    expect(resultado.page).toBe(2);
    expect(resultado.data).toHaveLength(1);
    expect(resultado.data[0].id).toBe(3);
  });

  it('lança NotFoundException quando o pedido não existe', async () => {
    const repository = new FakeOrdersRepository([]);
    const service = new OrdersService(repository);

    await expect(service.getOrderById(999)).rejects.toThrow(NotFoundException);
  });

  it('retorna o detalhe do pedido com itens e dados do comprador', async () => {
    const repository = new FakeOrdersRepository([pedidoBarato]);
    const service = new OrdersService(repository);

    const detalhe = await service.getOrderById(1);

    expect(detalhe.cliente.nome).toBe('Ana Souza');
    expect(detalhe.itens).toHaveLength(1);
    expect(detalhe.itens[0].subtotal).toBe(10);
  });
});
