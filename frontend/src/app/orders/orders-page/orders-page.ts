import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { OrderFilter } from '../../core/models/order.model';
import { ErrorMessage } from '../../shared/components/error-message/error-message';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { Pagination } from '../../shared/components/pagination/pagination';
import { OrderDetailModal } from '../order-detail-modal/order-detail-modal';
import { OrderFilters } from '../order-filters/order-filters';
import { OrderList } from '../order-list/order-list';
import { OrdersService } from '../orders.service';

@Component({
  selector: 'app-orders-page',
  imports: [
    AsyncPipe,
    OrderFilters,
    OrderList,
    OrderDetailModal,
    LoadingSpinner,
    ErrorMessage,
    Pagination,
  ],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPage {
  protected readonly ordersService = inject(OrdersService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  onFilterChange(filter: OrderFilter): void {
    this.ordersService.updateFilter(filter);
  }

  onRetryOrders(): void {
    this.ordersService.retryOrders();
  }

  onSelectOrder(id: number): void {
    this.ordersService.selectOrder(id);
  }

  onPageChange(page: number): void {
    this.ordersService.goToPage(page);
  }

  onCloseModal(): void {
    this.ordersService.clearSelectedOrder();
  }

  onRetryDetail(): void {
    this.ordersService.retryDetail();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
