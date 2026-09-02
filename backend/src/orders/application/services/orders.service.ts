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
      dataInicio: filter.dataInicio ? this.inicioDoDia(filter.dataInicio) : undefined,
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
   * `dataInicio`/`dataFim` chegam como data pura (ex: "2026-08-12", do
   * `<input type="date">` do front-end) e representam um dia no fuso do
   * festival — Brasil, fixo em `-03:00` (o país não usa mais horário de
   * verão desde 2019; o app já assume um único fuso, o mesmo motivo do
   * `LOCALE_ID` pt-BR fixo no frontend). Sem fixar esse offset,
   * `new Date('2026-08-12')` vira meia-noite em UTC, que já é "12/08 às
   * 21h" no horário do Brasil: um pedido feito de fato às 22h (local) do
   * dia 12/08 ficaria fora do filtro `dataFim=2026-08-12`, mesmo a tela
   * mostrando esse pedido como sendo do dia 12/08 (o `DatePipe` do Angular
   * converte o mesmo timestamp UTC para o fuso local do navegador).
   */
  private inicioDoDia(data: string): Date {
    return new Date(`${data}T00:00:00-03:00`);
  }

  private fimDoDia(data: string): Date {
    return new Date(`${data}T23:59:59.999-03:00`);
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
