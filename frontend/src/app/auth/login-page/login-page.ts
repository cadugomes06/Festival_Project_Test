import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorMessage } from '../../shared/components/error-message/error-message';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, ErrorMessage],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/'),
        error: (err: unknown) => this.error.set(this.mensagemDeErro(err)),
      });
  }

  private mensagemDeErro(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      return 'E-mail ou senha inválidos.';
    }
    return 'Não foi possível entrar. Tente novamente.';
  }
}
