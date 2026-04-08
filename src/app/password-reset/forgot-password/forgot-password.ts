import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css'],
})
export class ForgotPasswordComponent {
  loading = false;
  msg = '';
  error = '';

  form;

  constructor(
    private fb: FormBuilder,
    private api: PasswordResetService,
    private router: Router
  ) {
    // ✅ Crear el form aquí evita el error del fb
    this.form = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
    });
  }

  submit(): void {
    this.msg = '';
    this.error = '';

    if (this.form.invalid) return;

    const correo = (this.form.value.correo ?? '').trim().toLowerCase();
    this.loading = true;

    this.api.forgotPassword(correo).subscribe({
      next: () => {
        localStorage.setItem('reset_correo', correo);
        this.msg = 'Si el correo existe, se envió un código.';
        this.router.navigate(['/verify-code']);
      },
      error: (err: any) => {
        this.error = err?.error?.error || err?.error?.message || 'Error enviando el código.';
      },
      complete: () => (this.loading = false),
    });
  }
}
