import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './verify-code.html',
  styleUrls: ['./verify-code.css']
})
export class VerifyCodeComponent {
  loading = false;
  msg = '';
  error = '';

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: PasswordResetService
  ) {
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  submit() {
    this.msg = '';
    this.error = '';

    if (this.form.invalid) return;

    const codigo = String(this.form.value.codigo || '').trim();
    const correo = localStorage.getItem('reset_correo') || '';

    if (!correo) {
      this.error = 'Falta el correo. Vuelve a "Olvidé mi contraseña".';
      return;
    }

    this.loading = true;

    this.api.verifyResetCode(correo, codigo)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
      next: () => {
      localStorage.setItem('reset_codigo', codigo);
        this.router.navigate(['/new-password']);
    },
    error: (err: any) => {
      this.error = err?.error?.error || 'Código inválido o expirado.';
    },
  });
    }

  volverInicio() {
    this.router.navigate(['/login']);
  }
}