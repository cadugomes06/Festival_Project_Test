import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global: PrismaService é usado por qualquer módulo de feature que
 * precise de acesso a dados, sem precisar reimportar este módulo toda vez.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
