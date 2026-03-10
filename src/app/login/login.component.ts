import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  showPassword = false;
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { correo, contrasena } = this.loginForm.value;

    this.authService.login(correo, contrasena).subscribe({
      next: (token) => {
        console.log('Login exitoso, token recibido:', token);
        this.isLoading = false;
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/';
        this.router.navigateByUrl(redirectTo);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error completo de login:', error && error.message ? error.message : error.status || error);
        
        if (error.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:8080';
        } else if (error.error) {
          try {
            let errorObj: any;
            if (typeof error.error === 'string') {
              errorObj = JSON.parse(error.error);
            } else {
              errorObj = error.error;
            }
            
            if (errorObj.error) {
              this.errorMessage = errorObj.error;
            } else if (errorObj.message) {
              this.errorMessage = errorObj.message;
            } else {
              this.errorMessage = typeof error.error === 'string' ? error.error : 'Credenciales inválidas';
            }
          } catch (e) {
            this.errorMessage = typeof error.error === 'string' ? error.error : 'Error al iniciar sesión. Por favor, intenta de nuevo.';
          }
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Error al iniciar sesión. Por favor, intenta de nuevo.';
        }
      }
    });
  }
}
