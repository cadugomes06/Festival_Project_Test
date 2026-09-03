import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, shareReplay, startWith, switchMap } from 'rxjs';
import { OrderDetail, OrderFilter, OrderSummary, OrdersQuery } from '../core/models/order.model';
import { OrdersApiService } from './orders-api.service';

const PAGE_SIZE = 10;

export interface OrdersViewModel {
  orders: OrderSummary[];
  loadingOrders: boolean;
  ordersError: string | null;
  page: number;
  totalPages: number;
  total: number;
  selectedOrderId: number | null;
  selectedOrder: OrderDetail | null;
  loadingDetail: boolean;
  detailError: string | null;
}

interface OrdersRequestState {
  orders: OrderSummary[];
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  error: string | null;
}

interface OrderDetailState {
  selectedOrder: OrderDetail | null;
  loading: boolean;
  error: string | null;
}

/**
 * Estado da tela de pedidos, gerenciado com RxJS puro — suficiente para o
 * escopo deste teste, sem necessidade de uma lib de state management como
 * NgRx. Cada requisição assíncrona (lista e detalhe) é modelada como um
 * único stream de estado (`startWith` para o loading, `catchError` para o
 * erro), em vez de vários BehaviorSubjects se atualizando uns aos outros —
 * isso evita ciclos de emissão síncrona dentro do `combineLatest` do `vm$`.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(OrdersApiService);

  private readonly query$$ = new BehaviorSubject<OrdersQuery>({ page: 1, limit: PAGE_SIZE });
  private readonly selectedOrderId$$ = new BehaviorSubject<number | null>(null);

  private readonly ordersState$: Observable<OrdersRequestState> = this.query$$.pipe(
    switchMap((query) =>
      this.api.getOrders(query).pipe(
        map(
          (response): OrdersRequestState => ({
            orders: response.data,
            page: response.page,
            totalPages: response.totalPages,
            total: response.total,
            loading: false,
            error: null,
          }),
        ),
        startWith<OrdersRequestState>({
          orders: [],
          page: query.page,
          totalPages: 0,
          total: 0,
          loading: true,
          error: null,
        }),
        catchError(() =>
          of<OrdersRequestState>({
            orders: [],
            page: query.page,
            totalPages: 0,
            total: 0,
            loading: false,
            error: 'Não foi possível carregar os pedidos. Tente novamente.',
          }),
        ),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly detailState$: Observable<OrderDetailState> = this.selectedOrderId$$.pipe(
    switchMap((id) => {
      if (id === null) {
        return of<OrderDetailState>({ selectedOrder: null, loading: false, error: null });
      }
      return this.api.getOrderById(id).pipe(
        map((selectedOrder): OrderDetailState => ({ selectedOrder, loading: false, error: null })),
        startWith<OrderDetailState>({ selectedOrder: null, loading: true, error: null }),
        catchError(() =>
          of<OrderDetailState>({
            selectedOrder: null,
            loading: false,
            error: 'Não foi possível carregar os detalhes do pedido.',
          }),
        ),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** View model único, combinando listagem e detalhe — consumido via `async` pipe. */
  readonly vm$: Observable<OrdersViewModel> = combineLatest({
    ordersState: this.ordersState$,
    selectedOrderId: this.selectedOrderId$$,
    detailState: this.detailState$,
  }).pipe(
    map(({ ordersState, selectedOrderId, detailState }) => ({
      orders: ordersState.orders,
      loadingOrders: ordersState.loading,
      ordersError: ordersState.error,
      page: ordersState.page,
      totalPages: ordersState.totalPages,
      total: ordersState.total,
      selectedOrderId,
      selectedOrder: detailState.selectedOrder,
      loadingDetail: detailState.loading,
      detailError: detailState.error,
    })),
  );

  /** Novo filtro aplicado (via "Filtrar"/"Limpar"): sempre volta pra página 1. */
  updateFilter(filter: OrderFilter): void {
    this.query$$.next({ ...filter, page: 1, limit: PAGE_SIZE });
  }

  /** Troca de página, mantendo os critérios de filtro atuais. */
  goToPage(page: number): void {
    this.query$$.next({ ...this.query$$.value, page });
  }

  /** Refaz a última busca de pedidos (botão "Tentar novamente" do erro). */
  retryOrders(): void {
    this.query$$.next(this.query$$.value);
  }

  selectOrder(id: number): void {
    this.selectedOrderId$$.next(id);
  }

  /** Refaz a busca do detalhe selecionado (botão "Tentar novamente" do erro). */
  retryDetail(): void {
    const id = this.selectedOrderId$$.value;
    if (id !== null) {
      this.selectedOrderId$$.next(id);
    }
  }

  clearSelectedOrder(): void {
    this.selectedOrderId$$.next(null);
  }
}
