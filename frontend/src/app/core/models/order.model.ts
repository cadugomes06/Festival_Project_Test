/** Filtros de listagem — espelha os query params aceitos pelo backend. */
export interface OrderFilter {
  dataInicio?: string;
  dataFim?: string;
  valorMin?: number;
  valorMax?: number;
  nomeCliente?: string;
}

/** Item da lista de pedidos (tabela principal). */
export interface OrderSummary {
  id: number;
  data: string;
  nomeCliente: string;
  valorTotal: number;
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
