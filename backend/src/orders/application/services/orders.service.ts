import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { OrderEntity } from '../../domain/entities/order.entity';
import { OrderItemEntity } from '../../domain/entities/order-item.entity';
import { FilterOrdersDto } from '../dto/filter-orders.dto';
import { OrderDetailDto } from '../dto/order-detail.dto';
import { OrderSummaryDto } from '../dto/order-summary.dto';
import {
  ORDERS_REPOSITORY,
  OrdersRepository,
  PedidoComRelacoes,
} from '../interfaces/orders.repository';

/**
 * Caso de uso de consulta de pedidos. Depende só da interface do
 * repositório (injetada pelo token ORDERS_REPOSITORY), nunca do Prisma
 * diretamente — a implementação concreta é resolvida em OrdersModule.
 */
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async filterOrders(filter: FilterOrdersDto): Promise<OrderSummaryDto[]> {
    const registros = await this.ordersRepository.findMany({
      dataInicio: filter.dataInicio ? new Date(filter.dataInicio) : undefined,
      dataFim: filter.dataFim ? this.fimDoDia(filter.dataFim) : undefined,
      nomeCliente: filter.nomeCliente,
    });

    return registros
      .map((registro) => ({
        order: this.toDomain(registro),
        nomeCliente: registro.cliente.nome,
      }))
      .filter(({ order }) =>
        this.dentroDaFaixaDeValor(order.valorTotal, filter),
      )
      .map(({ order, nomeCliente }) =>
        OrderSummaryDto.fromDomain(order, nomeCliente),
      );
  }

  async getOrderById(id: number): Promise<OrderDetailDto> {
    const registro = await this.ordersRepository.findById(id);

    if (!registro) {
      throw new NotFoundException(`Pedido ${id} não encontrado`);
    }

    const order = this.toDomain(registro);
    return OrderDetailDto.fromDomain(order, {
      id: registro.cliente.id,
      nome: registro.cliente.nome,
      email: registro.cliente.email,
      telefone: registro.cliente.telefone,
    });
  }

  /**
   * Filtro por valor total é aplicado em memória, após o cálculo do total
   * via entidade de domínio: o total é uma soma agregada sobre a tabela de
   * associação (order_item), e não uma coluna própria do pedido. Para o
   * volume de dados de um teste técnico isso é suficiente; em um cenário de
   * produção com grande volume, o próximo passo seria mover esse filtro
   * para um HAVING SQL agregado direto no repositório (ver README).
   *
   * Comparação feita via `Decimal` (não `<`/`>` com `number`), pelo mesmo
   * motivo da soma em `OrderEntity.valorTotal`: evitar que um valor como
   * 28.999999999999996 (erro de ponto flutuante) exclua incorretamente um
   * pedido de um filtro `valorMin: 29`.
   */
  private dentroDaFaixaDeValor(
    valorTotal: Decimal,
    filter: FilterOrdersDto,
  ): boolean {
    if (filter.valorMin !== undefined && valorTotal.lessThan(filter.valorMin)) {
      return false;
    }
    if (
      filter.valorMax !== undefined &&
      valorTotal.greaterThan(filter.valorMax)
    ) {
      return false;
    }
    return true;
  }

  /**
   * `dataFim` chega como data pura (ex: "2026-08-12", do `<input type="date">`
   * do front-end). `new Date('2026-08-12')` vira meia-noite UTC daquele dia —
   * usado direto como limite superior (`lte`), excluiria praticamente o dia
   * inteiro. Avançamos para o último milissegundo do dia para incluir o dia
   * inteiro no filtro, do jeito que o usuário espera ao escolher "data fim".
   */
  private fimDoDia(data: string): Date {
    const inicioDoDia = new Date(data);
    return new Date(inicioDoDia.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  /**
   * Fronteira entre Infrastructure e Domain: `itemPedido.valorUnitarioPraticado`
   * é um `Prisma.Decimal` (tipo específico do Prisma). Convertemos aqui —
   * via string, nunca via `number` — para o `Decimal` genérico (`decimal.js`)
   * que o domínio usa, para o domínio não precisar conhecer o Prisma.
   */
  private toDomain(registro: PedidoComRelacoes): OrderEntity {
    const itens = registro.itens.map(
      (itemPedido) =>
        new OrderItemEntity(
          itemPedido.itemId,
          itemPedido.item.nome,
          itemPedido.quantidade,
          new Decimal(itemPedido.valorUnitarioPraticado.toString()),
        ),
    );

    return new OrderEntity(
      registro.id,
      registro.data,
      registro.clienteId,
      itens,
    );
  }
}
