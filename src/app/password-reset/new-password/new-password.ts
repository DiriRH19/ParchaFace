import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset';

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './new-password.html',
  styleUrls: ['./new-password.css'],
})
export class NewPasswordComponent {
  loading = false;
  msg = '';
  error = '';

  // ✅ para mostrar/ocultar
  showNew = false;
  showConfirm = false;

  form;

  constructor(
    private fb: FormBuilder,
    private api: PasswordResetService,
    private router: Router
  ) {
    // ✅ form en constructor (evita error fb)
    this.form = this.fb.group({
      nuevaContrasena: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
      ]],
      confirmarContrasena: ['', [Validators.required]],
    });
  }

  // ✅ getters para el HTML
  get nuevaContrasena() {
    return this.form.get('nuevaContrasena');
  }

  get confirmarContrasena() {
    return this.form.get('confirmarContrasena');
  }

  toggleNew() {
    this.showNew = !this.showNew;
  }

  toggleConfirm() {
    this.showConfirm = !this.showConfirm;
  }

  submit(): void {
    this.msg = '';
    this.error = '';

    if (this.form.invalid) return;

    const nueva = (this.form.value.nuevaContrasena ?? '').trim();
    const confirm = (this.form.value.confirmarContrasena ?? '').trim();

    if (nueva !== confirm) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    const correo = localStorage.getItem('reset_correo') || '';
    const codigo = localStorage.getItem('reset_codigo') || '';

    if (!correo || !codigo) {
      this.error = 'Faltan datos. Vuelve a "Olvidé mi contraseña".';
      return;
    }

    this.loading = true;

    this.api.resetPassword(correo, codigo, nueva).subscribe({
      next: () => {
        this.msg = 'Contraseña actualizada. Ya puedes iniciar sesión.';
        localStorage.removeItem('reset_codigo');
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
      localStorage.removeItem('reset_codigo'); // 👈 borra el código malo
      this.error =err?.error?.error ||err?.error?.message ||'No se pudo actualizar la contraseña.';
},
      complete: () => (this.loading = false),
    });
  }
}
