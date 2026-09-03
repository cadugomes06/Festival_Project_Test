import { Component, computed, input, output } from '@angular/core';

/**
 * Componente "burro": só mostra "Página X de Y" e os botões
 * anterior/próxima, emitindo o número da página pra quem for buscar os
 * dados (o mesmo padrão dos outros componentes de `shared/`).
 */
@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  readonly isFirstPage = computed(() => this.page() <= 1);
  readonly isLastPage = computed(() => this.page() >= this.totalPages());

  previous(): void {
    if (!this.isFirstPage()) {
      this.pageChange.emit(this.page() - 1);
    }
  }

  next(): void {
    if (!this.isLastPage()) {
      this.pageChange.emit(this.page() + 1);
    }
  }
}
