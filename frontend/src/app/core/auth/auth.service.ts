import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { LoginCredentials } from '../models/auth.model';
import { AuthApiService } from './auth-api.service';

const TOKEN_STORAGE_KEY = 'accessToken';

/**
 * Guarda o token JWT em `localStorage` e expõe se há uma sessão válida.
 * Não há refresh token nem renovação automática — escopo propositalmente
 * simples (login único fixo, ver README); o token expira (`JWT_EXPIRES_IN`
 * no backend) e o usuário simplesmente loga de novo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);

  login(credentials: LoginCredentials): Observable<void> {
    return this.api.login(credentials).pipe(
      tap(({ accessToken }) => localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)),
      map(() => undefined),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}
