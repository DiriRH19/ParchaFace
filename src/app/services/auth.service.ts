import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map, of } from 'rxjs';
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

/** tipo para redes sociales */
export type SocialLink = { platform: string; handle: string };

export interface UserData {
  id?: number;
  nombre?: string;
  usuario?: string;
  correo?: string;

  fotoPerfil?: string;
  fotoPortada?: string;

  acercaDe?: string;
  redesSociales?: SocialLink[];
  categoriasPreferidas?: string[];

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

    const token = this.getToken();

    if (token && this.isTokenValid(token)) {
      this.isLoggedIn.next(true);
      const userData = this.decodeToken(token);
      if (userData) {
        this.userData.next(userData);
      }
    } else {
      this.isLoggedIn.next(false);
      this.userData.next(null);
      this.removeStoredToken();
    }
  }

  private decodeToken(token: string): UserData | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const decoded: Record<string, unknown> = JSON.parse(atob(payload));

      const correo = (decoded['sub'] ?? decoded['correo']) as string | undefined;
      const nombreFromToken = (decoded['nombre'] ?? decoded['usuario']) as string | undefined;
      const fallbackNombre =
        typeof correo === 'string' && correo.includes('@') ? correo.split('@')[0] : undefined;

      const nombre = nombreFromToken ?? fallbackNombre;
      const usuario = (decoded['usuario'] ?? decoded['nombre'] ?? fallbackNombre) as string | undefined;

      return {
        ...decoded,
        correo: correo ?? undefined,
        nombre: nombre ?? undefined,
        usuario: usuario ?? nombre ?? undefined
      } as UserData;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  private isTokenValid(token: string | null): boolean {
    if (!token) return false;

    try {
      const payload = token.split('.')[1];
      if (!payload) return false;

      const decoded = JSON.parse(atob(payload));
      const exp = decoded?.exp;

      if (!exp) {
        return false;
      }

      return Date.now() < exp * 1000;
    } catch {
      return false;
    }
  }

  private saveToken(token: string, rememberMe: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem('token');
    sessionStorage.removeItem('token');

    if (rememberMe) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }
  }

  private removeStoredToken(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }

  login(correo: string, contrasena: string, rememberMe: boolean = false): Observable<string> {
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
            } else if ((parsed as any).error) {
              throw new Error((parsed as any).error);
            } else if ((parsed as any).token) {
              token = (parsed as any).token;
            }
          }
        } catch (e) {
          if (token.includes('error') || token.includes('Error')) {
            try {
              const errorObj = JSON.parse(token);
              if (errorObj.error) {
                throw new Error(errorObj.error);
              }
            } catch {
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
          this.saveToken(token, rememberMe);
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
          } catch {
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

  register(
    usuario: string,
    correo: string,
    contrasena: string,
    confirmarContrasena: string
  ): Observable<string> {
    const registerData: RegisterRequest = { usuario, correo, contrasena, confirmarContrasena };

    return this.http.post(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.auth.register}`,
      registerData,
      { responseType: 'text' }
    ).pipe(
      map((response: string) => {
        const raw = (response || '').trim();
        console.log('Respuesta cruda de registro:', raw);

        if (raw.startsWith('<')) {
          throw new Error('El servidor devolvió una página. Arranca el backend (puerto 8080) y usa ng serve para el front.');
        }

        let data: { token?: string; error?: string; mensaje?: string };
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error('El servidor no respondió con JSON. ¿Está el backend en marcha en el puerto 8080?');
        }

        let token = data?.token;

        if (!token && typeof data === 'string') {
          token = data;
        }

        console.log('Token extraído:', token);
        console.log('Datos parseados:', data);

        if (!token && data?.mensaje) {
          console.log('Registro exitoso pero sin token. Se requiere login automático.');
          const error: any = new Error('NEED_AUTO_LOGIN');
          error.credentials = { correo, contrasena };
          throw error;
        }

        if (!token || typeof token !== 'string') {
          throw new Error(data?.error || 'El servidor no devolvió un token válido.');
        }

        return token;
      }),
      tap((token: string) => {
        console.log('Guardando token después de registro:', token);

        if (token && isPlatformBrowser(this.platformId)) {
          // Registro = sesión persistente por defecto
          this.saveToken(token, true);
          this.isLoggedIn.next(true);

          const userData = this.decodeToken(token);
          if (userData) {
            this.userData.next(userData);
          }
        }
      }),
      catchError((error) => {
        console.error('Error en registro - detalles completos:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          headers: error.headers,
          message: error.message
        });

        if (error.message === 'NEED_AUTO_LOGIN' && error.credentials) {
          const { correo: loginCorreo, contrasena: loginContrasena } = error.credentials;
          console.log('Haciendo login automático con:', loginCorreo);

          // Registro + auto login = persistente por defecto
          return this.login(loginCorreo, loginContrasena, true);
        }

        let token: string | null = null;

        if (error.error) {
          try {
            const errorResponse = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            console.log('Respuesta parseada del error:', errorResponse);
            token = errorResponse?.token || errorResponse?.data?.token;
            console.log('Token encontrado en respuesta de error:', token);
          } catch (e) {
            console.log('No se pudo extraer token de la respuesta de error', e);
          }
        }

        if (token && typeof token === 'string') {
          console.log('Usando token de respuesta de error, registro considerado exitoso');
          if (isPlatformBrowser(this.platformId)) {
            this.saveToken(token, true);
            this.isLoggedIn.next(true);

            const userData = this.decodeToken(token);
            if (userData) {
              this.userData.next(userData);
            }
          }

          console.log('Token guardado exitosamente');
          return of(token);
        }

        let errorMessage = 'Error al registrar usuario';
        if (error.error) {
          try {
            const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            if (errorObj.error) {
              errorMessage = errorObj.error;
            } else if (errorObj.message) {
              errorMessage = errorObj.message;
            }
          } catch {
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
    this.removeStoredToken();
    this.isLoggedIn.next(false);
    this.userData.next(null);
    this.router.navigate(['/']);
  }

  getIsLoggedIn(): boolean {
    if (this.isLoggedIn.value) {
      return true;
    }

    const token = this.getToken();
    return !!token && this.isTokenValid(token);
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  getUserData(): UserData | null {
    return this.userData.value;
  }

  uploadPerfil(id: number, formData: FormData) {
    const token = this.getToken();
    return this.http.post(
      `http://localhost:8080/usuarios/${id}/foto-perfil`,
      formData,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
  }

  uploadPortada(id: number, formData: FormData) {
    const token = this.getToken();
    return this.http.post(
      `http://localhost:8080/usuarios/${id}/foto-portada`,
      formData,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
  }

  getUsuarioById(id: number) {
    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<UserData>(`http://localhost:8080/usuarios/${id}`, { headers });
  }

  updateUsuario(id: number, payload: Partial<UserData>): Observable<UserData> {
    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return this.http.put<UserData>(`http://localhost:8080/usuarios/${id}`, payload, { headers }).pipe(
      tap((u) => {
        const current = this.userData.value;
        this.userData.next({ ...(current || {}), ...(u || {}) });
      })
    );
  }
}