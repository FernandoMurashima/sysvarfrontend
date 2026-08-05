import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-change-password-required',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password-required.component.html',
  styleUrls: ['./change-password-required.component.css']
})
export class ChangePasswordRequiredComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMsg = '';

  form = this.fb.group({
    senha_atual: ['', [Validators.required]],
    nova_senha: ['', [Validators.required, Validators.minLength(8)]],
    confirmacao: ['', [Validators.required]],
  });

  alterar(): void {
    this.errorMsg = '';
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.nova_senha === raw.senha_atual) {
      this.errorMsg = 'A nova senha deve ser diferente da senha atual.';
      return;
    }
    if (raw.nova_senha !== raw.confirmacao) {
      this.errorMsg = 'A confirmação da senha não confere.';
      return;
    }
    this.loading = true;
    this.auth.changeRequiredPassword({
      senha_atual: raw.senha_atual || '',
      nova_senha: raw.nova_senha || '',
      confirmacao: raw.confirmacao || '',
    }).subscribe({
      next: () => {
        this.auth.refreshMe().subscribe({
          next: () => this.router.navigateByUrl('/home'),
          error: () => this.router.navigateByUrl('/home'),
        });
      },
      error: (err) => {
        const detail = err?.error?.detail || Object.values(err?.error || {})[0] || '';
        this.errorMsg = Array.isArray(detail) ? detail.join(' ') : String(detail || 'Não foi possível alterar a senha.');
        this.loading = false;
      }
    });
  }

  sair(): void {
    this.auth.logout().subscribe({ complete: () => this.router.navigateByUrl('/login') });
  }
}
