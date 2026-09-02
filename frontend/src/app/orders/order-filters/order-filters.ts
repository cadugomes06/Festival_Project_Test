import { Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrderFilter } from '../../core/models/order.model';

/**
 * Formulário de filtros. Componente "burro": só monta o form e emite o
 * filtro já no formato aceito pela API — quem decide o que fazer com ele
 * (buscar pedidos) é o componente pai (OrdersPage).
 *
 * Não emite nada na inicialização: `OrdersService` já nasce com o filtro
 * vazio (`{}`) por padrão, que é exatamente o estado inicial deste form —
 * emitir de novo aqui só duplicaria a primeira requisição de pedidos.
 */
@Component({
  selector: 'app-order-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './order-filters.html',
  styleUrl: './order-filters.scss',
})
export class OrderFilters {
  private readonly fb = inject(FormBuilder);

  readonly filterChange = output<OrderFilter>();

  readonly form = this.fb.nonNullable.group({
    dataInicio: [''],
    dataFim: [''],
    valorMin: [null as number | null, [Validators.min(0)]],
    valorMax: [null as number | null, [Validators.min(0)]],
    nomeCliente: [''],
  });

  get intervaloDeDataInvalido(): boolean {
    const { dataInicio, dataFim } = this.form.getRawValue();
    return !!dataInicio && !!dataFim && dataInicio > dataFim;
  }

  aplicarFiltro(): void {
    if (this.form.invalid || this.intervaloDeDataInvalido) {
      this.form.markAllAsTouched();
      return;
    }
    this.emitFilter();
  }

  limparFiltro(): void {
    this.form.reset({
      dataInicio: '',
      dataFim: '',
      valorMin: null,
      valorMax: null,
      nomeCliente: '',
    });
    this.emitFilter();
  }

  private emitFilter(): void {
    const raw = this.form.getRawValue();
    const filter: OrderFilter = {
      dataInicio: raw.dataInicio || undefined,
      dataFim: raw.dataFim || undefined,
      valorMin: raw.valorMin ?? undefined,
      valorMax: raw.valorMax ?? undefined,
      nomeCliente: raw.nomeCliente || undefined,
    };
    this.filterChange.emit(filter);
  }
}
