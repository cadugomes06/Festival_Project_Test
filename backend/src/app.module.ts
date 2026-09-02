import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limit padrão para toda a API: 100 requisições/minuto por IP.
    // Mitiga força bruta contra POST /auth/login (a credencial é fixa,
    // então tentativas de senha ilimitadas seriam o principal risco) e
    // uso abusivo dos demais endpoints — sem exigir configuração por rota.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Padrão documentado do @nestjs/throttler: aplicar o guard globalmente
    // via APP_GUARD, em vez de decorar cada controller manualmente.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
