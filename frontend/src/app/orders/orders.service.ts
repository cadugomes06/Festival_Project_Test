import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, shareReplay, startWith, switchMap } from 'rxjs';
import { OrderDetail, OrderFilter, OrderSummary } from '../core/models/order.model';
import { OrdersApiService } from './orders-api.service';

export interface OrdersViewModel {
  orders: OrderSummary[];
  loadingOrders: boolean;
  ordersError: string | null;
  selectedOrderId: number | null;
  selectedOrder: OrderDetail | null;
  loadingDetail: boolean;
  detailError: string | null;
}

interface OrdersRequestState {
  orders: OrderSummary[];
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

  private readonly filter$$ = new BehaviorSubject<OrderFilter>({});
  private readonly selectedOrderId$$ = new BehaviorSubject<number | null>(null);

  private readonly ordersState$: Observable<OrdersRequestState> = this.filter$$.pipe(
    switchMap((filter) =>
      this.api.getOrders(filter).pipe(
        map((orders): OrdersRequestState => ({ orders, loading: false, error: null })),
        startWith<OrdersRequestState>({ orders: [], loading: true, error: null }),
        catchError(() =>
          of<OrdersRequestState>({
            orders: [],
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
      selectedOrderId,
      selectedOrder: detailState.selectedOrder,
      loadingDetail: detailState.loading,
      detailError: detailState.error,
    })),
  );

  updateFilter(filter: OrderFilter): void {
    this.filter$$.next(filter);
  }

  selectOrder(id: number): void {
    this.selectedOrderId$$.next(id);
  }

  clearSelectedOrder(): void {
    this.selectedOrderId$$.next(null);
  }
}
