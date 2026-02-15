import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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

  form!: FormGroup; // 👈 se declara, pero NO se inicializa aquí

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    // ✅ aquí sí existe this.fb
    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  get codigo() {
    return this.form.get('codigo');
  }

  submit() {
    this.msg = '';
    this.error = '';

    if (this.form.invalid) return;

    const codigo = String(this.form.value.codigo || '').trim();

    // Guardamos el código para el siguiente paso
    localStorage.setItem('reset_codigo', codigo);

    // Ir a la pantalla de nueva contraseña
    this.router.navigate(['/new-password']);
  }

  volverInicio() {
    this.router.navigate(['/login']);
  }
}
