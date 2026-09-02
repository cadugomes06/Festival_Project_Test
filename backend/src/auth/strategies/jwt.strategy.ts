import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
}

export interface AuthenticatedUser {
  email: string;
}

/**
 * Estratégia Passport padrão do Nest para JWT via Bearer token. O Passport
 * chama `validate()` só depois de já verificar assinatura e expiração do
 * token — aqui só traduzimos o payload (`sub`) para o formato exposto em
 * `req.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { email: payload.sub };
  }
}
