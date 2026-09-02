import { Module } from '@nestjs/common';
import { OrdersService } from './application/services/orders.service';
import { ORDERS_REPOSITORY } from './application/interfaces/orders.repository';
import { PrismaOrdersRepository } from './infrastructure/repositories/prisma-orders.repository';
import { OrdersController } from './presentation/controllers/orders.controller';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    // Ponto único de "wiring" da inversão de dependência: o service pede a
    // interface OrdersRepository, o Nest entrega esta implementação Prisma.
    { provide: ORDERS_REPOSITORY, useClass: PrismaOrdersRepository },
  ],
})
export class OrdersModule {}
