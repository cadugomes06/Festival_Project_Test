import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, HostListener, input, output } from '@angular/core';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ErrorMessage } from '../../shared/components/error-message/error-message';
import { OrderDetail } from '../../core/models/order.model';

@Component({
  selector: 'app-order-detail-modal',
  imports: [CurrencyPipe, DatePipe, LoadingSpinner, ErrorMessage],
  templateUrl: './order-detail-modal.html',
  styleUrl: './order-detail-modal.scss',
})
export class OrderDetailModal {
  readonly order = input<OrderDetail | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly close = output<void>();
  readonly retry = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
