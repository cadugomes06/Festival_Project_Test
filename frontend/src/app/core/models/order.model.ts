/** Filtros de listagem — espelha os query params aceitos pelo backend. */
export interface OrderFilter {
  dataInicio?: string;
  dataFim?: string;
  valorMin?: number;
  valorMax?: number;
  nomeCliente?: string;
}

/** Filtro + paginação: o que de fato vai pra API em `GET /orders`. */
export interface OrdersQuery extends OrderFilter {
  page: number;
  limit: number;
}

/** Item da lista de pedidos (tabela principal). */
export interface OrderSummary {
  id: number;
  data: string;
  nomeCliente: string;
  valorTotal: number;
}

/** Envelope de paginação devolvido por `GET /orders`. */
export interface PaginatedOrders {
  data: OrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderDetailCliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
}

export interface OrderDetailItem {
  itemId: number;
  nome: string;
  quantidade: number;
  valorUnitarioPraticado: number;
  subtotal: number;
}

/** Pedido completo, exibido no modal de detalhes. */
export interface OrderDetail {
  id: number;
  data: string;
  valorTotal: number;
  cliente: OrderDetailCliente;
  itens: OrderDetailItem[];
}
