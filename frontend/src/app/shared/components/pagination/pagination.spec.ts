import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pagination } from './pagination';

describe('Pagination', () => {
  let component: Pagination;
  let fixture: ComponentFixture<Pagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagination],
    }).compileComponents();

    fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('totalPages', 3);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emite a página anterior/próxima quando não está nos limites', () => {
    const emitidas: number[] = [];
    component.pageChange.subscribe((page) => emitidas.push(page));

    component.previous();
    component.next();

    expect(emitidas).toEqual([1, 3]);
  });

  it('não emite ao tentar avançar além da última página', () => {
    fixture.componentRef.setInput('page', 3);
    const emitidas: number[] = [];
    component.pageChange.subscribe((page) => emitidas.push(page));

    component.next();

    expect(emitidas).toEqual([]);
  });
});
