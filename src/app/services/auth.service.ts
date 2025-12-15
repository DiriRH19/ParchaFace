import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RouterModule } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedIn.asObservable();

  constructor() {
    // Verificar si hay token válido en localStorage al inicializar
    this.validateToken();
  }

  /**
   * Valida si el token en localStorage es válido
   */
  private validateToken(): void {
    const token = localStorage.getItem('authToken');
    if (token && this.isTokenValid(token)) {
      this.isLoggedIn.next(true);
    } else {
      this.isLoggedIn.next(false);
      localStorage.removeItem('authToken');
    }
  }

  /**
   * Verifica si un token es válido (ajusta según tu backend)
   */
  private isTokenValid(token: string | null): boolean {
    // TODO: Reemplazar con validación real contra tu API
    // Por ahora valida que el token no esté vacío y no sea null
    return token !== null && token.length > 0;
  }

  /**
   * Login del usuario
   * @param email Email del usuario
   * @param password Contraseña del usuario
   */
  login(email: string, password: string): void {
    // TODO: Reemplazar con llamada HTTP a tu API de backend
    // Ejemplo: this.http.post('/api/auth/login', { email, password })
    if (email && password) {
      const token = 'token_' + Date.now();
      localStorage.setItem('authToken', token);
      this.isLoggedIn.next(true);
    }
  }

  /**
   * Logout del usuario
   */
  logout(): void {
    localStorage.removeItem('authToken');
    this.isLoggedIn.next(false);
  }

  /**
   * Verificar si el usuario está logueado
   */
  getIsLoggedIn(): boolean {
    return this.isLoggedIn.value;
  }

  /**
   * Obtener el token actual
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}
