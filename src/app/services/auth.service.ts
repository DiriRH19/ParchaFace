import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map } from 'rxjs';
import { Router } from '@angular/router';
import { API_CONFIG } from '../config/api.config';

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface RegisterRequest {
  correo: string;
  contrasena: string;
  confirmarContrasena: string;
  usuario: string;
}

export interface UserData {
  usuario?: string;
  correo?: string;
  id?: number;
  nombre?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedIn.asObservable();
  private userData = new BehaviorSubject<UserData | null>(null);
  public userData$ = this.userData.asObservable();
  private platformId = inject(PLATFORM_ID);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.validateToken();
  }

  private validateToken(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    const token = localStorage.getItem('token');
    if (token && this.isTokenValid(token)) {
      this.isLoggedIn.next(true);
      const userData = this.decodeToken(token);
      if (userData) {
        this.userData.next(userData);
      }
    } else {
      this.isLoggedIn.next(false);
      this.userData.next(null);
      localStorage.removeItem('token');
    }
  }

  private decodeToken(token: string): UserData | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  private isTokenValid(token: string | null): boolean {
    return token !== null && token.length > 0;
  }

  login(correo: string, contrasena: string): Observable<string> {
    const loginData: LoginRequest = { correo, contrasena };
    
    return this.http.post(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.login}`,
      loginData,
      { responseType: 'text' }
    ).pipe(
      map((response: string) => {
        let token = response.trim();
        console.log('Respuesta cruda del backend:', response);
        
        try {
          if (token.startsWith('"') && token.endsWith('"')) {
            token = JSON.parse(token);
          } else {
            const parsed = JSON.parse(token);
            if (typeof parsed === 'string') {
              token = parsed;
            } else if (parsed.error) {
              throw new Error(parsed.error);
            } else if (parsed.token) {
              token = parsed.token;
            }
          }
        } catch (e) {
          if (token.includes('error') || token.includes('Error')) {
            try {
              const errorObj = JSON.parse(token);
              if (errorObj.error) {
                throw new Error(errorObj.error);
              }
            } catch (parseError) {
              throw new Error('Error al procesar respuesta del servidor');
            }
          }
        }
        
        console.log('Token procesado:', token);
        return token;
      }),
      tap((token: string) => {
        console.log('Token recibido:', token);
        if (token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', token);
          this.isLoggedIn.next(true);
          const userData = this.decodeToken(token);
          if (userData) {
            this.userData.next(userData);
          }
        }
      }),
      catchError((error) => {
        console.error('Error en login:', error);
        
        let errorMessage = 'Error al iniciar sesión';
        if (error.error) {
          try {
            const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            if (errorObj.error) {
              errorMessage = errorObj.error;
            } else if (errorObj.message) {
              errorMessage = errorObj.message;
            }
          } catch (e) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          }
        }
        
        const customError = {
          ...error,
          error: { error: errorMessage, message: errorMessage }
        };
        
        return throwError(() => customError);
      })
    );
  }

  register(usuario: string, correo: string, contrasena: string, confirmarContrasena: string): Observable<string> {
    const registerData: RegisterRequest = { usuario, correo, contrasena, confirmarContrasena };
    
    return this.http.post(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.register}`,
      registerData,
      { responseType: 'text' }
    ).pipe(
      map((response: string) => {
        let token = response.trim();
        console.log('Respuesta cruda del backend:', response);
        
        try {
          if (token.startsWith('"') && token.endsWith('"')) {
            token = JSON.parse(token);
          } else {
            const parsed = JSON.parse(token);
            if (typeof parsed === 'string') {
              token = parsed;
            } else if (parsed.error) {
              throw new Error(parsed.error);
            } else if (parsed.token) {
              token = parsed.token;
            }
          }
        } catch (e) {
          if (token.includes('error') || token.includes('Error')) {
            try {
              const errorObj = JSON.parse(token);
              if (errorObj.error) {
                throw new Error(errorObj.error);
              }
            } catch (parseError) {
              throw new Error('Error al procesar respuesta del servidor');
            }
          }
        }
        
        console.log('Token procesado:', token);
        return token;
      }),
      tap((token: string) => {
        console.log('Token recibido:', token);
        if (token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', token);
          this.isLoggedIn.next(true);
          const userData = this.decodeToken(token);
          if (userData) {
            this.userData.next(userData);
          }
        }
      }),
      catchError((error) => {
        console.error('Error en registro:', error);
        
        let errorMessage = 'Error al registrar usuario';
        if (error.error) {
          try {
            const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            if (errorObj.error) {
              errorMessage = errorObj.error;
            } else if (errorObj.message) {
              errorMessage = errorObj.message;
            }
          } catch (e) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          }
        }
        
        const customError = {
          ...error,
          error: { error: errorMessage, message: errorMessage }
        };
        
        return throwError(() => customError);
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.isLoggedIn.next(false);
    this.userData.next(null);
    this.router.navigate(['/']);
  }

  getIsLoggedIn(): boolean {
    return this.isLoggedIn.value;
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('token');
  }

  getUserData(): UserData | null {
    return this.userData.value;
  }
}
