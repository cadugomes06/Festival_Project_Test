import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard fino que só aponta para a estratégia 'jwt' registrada pelo
 * JwtStrategy — é o padrão documentado do @nestjs/passport, sem lógica
 * própria além dessa ligação.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
