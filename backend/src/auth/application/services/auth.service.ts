import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export interface AccessTokenResult {
  accessToken: string;
}

/**
 * Login com uma única credencial fixa (variáveis de ambiente), não uma
 * tabela de usuários — o domínio deste teste (Cliente/Item/Pedido) não tem
 * conceito de usuário, e criar uma entidade só para autenticação seria
 * escopo extra sem necessidade real. Ver justificativa completa no README.
 *
 * A senha nunca fica em texto puro, nem no .env: o que é armazenado é o
 * hash bcrypt (`ADMIN_PASSWORD_HASH`), comparado com `bcrypt.compare`.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AccessTokenResult> {
    await this.assertValidCredentials(email, password);

    const accessToken = await this.jwtService.signAsync({ sub: email });
    return { accessToken };
  }

  private async assertValidCredentials(email: string, password: string): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPasswordHash = this.configService.get<string>('ADMIN_PASSWORD_HASH');

    const emailMatches = Boolean(adminEmail) && email === adminEmail;
    const passwordMatches =
      Boolean(adminPasswordHash) && (await bcrypt.compare(password, adminPasswordHash as string));

    if (!emailMatches || !passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
  }
}
