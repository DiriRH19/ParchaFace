import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { AfterViewInit } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements AfterViewInit{
  showPassword = false;
  showConfirmPassword = false;
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      usuario: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
      ]],
      confirmarContrasena: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: [this.passwordsMatchValidator] });
  }



  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const contrasena = control.get('contrasena')?.value;
    const confirm = control.get('confirmarContrasena')?.value;
    if (contrasena && confirm && contrasena !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get f() { return this.registerForm.controls; }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { usuario, correo, contrasena, confirmarContrasena } = this.registerForm.value;

    this.authService.register(usuario, correo, contrasena, confirmarContrasena).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/preferencias']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error completo de registro:', error && error.message ? error.message : error.status || error);

        // Verificar si el token se guardó a pesar del error (registro exitoso pero respuesta del servidor problemática)
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Token encontrado en localStorage. Registro exitoso, navegando a preferencias...');
          this.router.navigate(['/preferencias']);
          return;
        }

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
              this.errorMessage = typeof error.error === 'string' ? error.error : 'Error al registrar usuario';
            }
          } catch (e) {
            this.errorMessage = typeof error.error === 'string' ? error.error : 'Error al registrar usuario. Por favor, intenta de nuevo.';
          }
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Error al registrar usuario. Por favor, intenta de nuevo.';
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.initGoogleButton();
  }

  initGoogleButton(): void {
    if (!window.google) {
      console.error('Google Identity Services no cargó');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleGoogleResponse(response)
    });

    window.google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'pill',
        width: 280
      }
    );
  }

  handleGoogleResponse(response: any): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.googleLogin(response.credential).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/preferencias']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error?.error?.error || 'No se pudo registrar con Google';
      }
    });
  }
}

