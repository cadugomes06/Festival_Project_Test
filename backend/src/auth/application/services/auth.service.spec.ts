import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const ADMIN_EMAIL = 'admin@festival.com';
const ADMIN_PASSWORD = 'festival2026';

function criarAuthService(): AuthService {
  const config = new Map<string, string>([
    ['ADMIN_EMAIL', ADMIN_EMAIL],
    ['ADMIN_PASSWORD_HASH', bcrypt.hashSync(ADMIN_PASSWORD, 10)],
    ['JWT_SECRET', 'test-secret'],
  ]);
  const configService = { get: (key: string) => config.get(key) } as ConfigService;
  const jwtService = new JwtService({ secret: 'test-secret' });

  return new AuthService(jwtService, configService);
}

describe('AuthService', () => {
  it('retorna um accessToken quando email e senha conferem com a credencial fixa', async () => {
    const service = criarAuthService();

    const result = await service.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('rejeita com 401 quando a senha está errada', async () => {
    const service = criarAuthService();

    await expect(service.login(ADMIN_EMAIL, 'senha-errada')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita com 401 quando o email não é o admin configurado', async () => {
    const service = criarAuthService();

    await expect(service.login('outro@example.com', ADMIN_PASSWORD)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
