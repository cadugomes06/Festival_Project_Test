import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/config/api.config';
import { OrderDetail, OrdersQuery, PaginatedOrders } from '../core/models/order.model';

/**
 * Acesso HTTP puro à API de pedidos — sem estado, sem lógica de UI.
 * Quem orquestra estado (loading/erro/seleção) é o OrdersService.
 */
@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/orders`;

  getOrders(query: OrdersQuery): Observable<PaginatedOrders> {
    return this.http.get<PaginatedOrders>(this.baseUrl, { params: this.toHttpParams(query) });
  }

  getOrderById(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.baseUrl}/${id}`);
  }

  private toHttpParams(filter: OrdersQuery): HttpParams {
    let params = new HttpParams();

    if (filter.dataInicio) {
      params = params.set('dataInicio', filter.dataInicio);
    }
    if (filter.dataFim) {
      params = params.set('dataFim', filter.dataFim);
    }
    if (filter.valorMin != null) {
      params = params.set('valorMin', filter.valorMin);
    }
    if (filter.valorMax != null) {
      params = params.set('valorMax', filter.valorMax);
    }
    if (filter.nomeCliente) {
      params = params.set('nomeCliente', filter.nomeCliente);
    }
    params = params.set('page', filter.page).set('limit', filter.limit);

    return params;
  }
}
