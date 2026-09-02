import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderFilters } from './order-filters';

describe('OrderFilters', () => {
  let component: OrderFilters;
  let fixture: ComponentFixture<OrderFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
