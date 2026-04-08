import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { API_CONFIG, buildApiUrl, withPathParam } from '../config/api.config';

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

export type SocialLink = { platform: string; handle: string };

export interface UserData {
  id?: number;
  idUsuario?: number;
  nombre?: string;
  usuario?: string;
  correo?: string;

  fotoPerfil?: string | null;
  fotoPortada?: string | null;

  fotoPerfilUrl?: string | null;
  fotoPortadaUrl?: string | null;

  fotoPerfilPublicId?: string | null;
  fotoPortadaPublicId?: string | null;

  acercaDe?: string;
  redesSociales?: SocialLink[];
  categoriasPreferidas?: string[];
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly isLoggedIn = new BehaviorSubject<boolean>(false);
  public readonly isLoggedIn$ = this.isLoggedIn.asObservable();

  private readonly userData = new BehaviorSubject<UserData | null>(null);
  public readonly userData$ = this.userData.asObservable();

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
      const decoded = this.decodeToken(token);
      if (decoded) {
        this.userData.next(decoded);
      }
      return;
    }

    this.removeStoredToken();
    this.isLoggedIn.next(false);
    this.userData.next(null);
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      return JSON.parse(atob(padded));
    } catch (error) {
      console.error('Error decodificando payload JWT:', error);
      return null;
    }
  }

  private decodeToken(token: string): UserData | null {
    const decoded = this.decodeJwtPayload(token);
    if (!decoded) return null;

    const correo = (decoded['sub'] ?? decoded['correo']) as string | undefined;
    const nombreFromToken = (decoded['nombre'] ?? decoded['usuario']) as string | undefined;
    const fallbackNombre =
      typeof correo === 'string' && correo.includes('@') ? correo.split('@')[0] : undefined;

    const nombre = nombreFromToken ?? fallbackNombre;
    const usuario = (decoded['usuario'] ?? decoded['nombre'] ?? fallbackNombre) as string | undefined;

    const rawId =
      decoded['id'] ??
      decoded['idUsuario'] ??
      decoded['userId'] ??
      decoded['usuarioId'];

    const normalizedId =
      rawId != null && !Number.isNaN(Number(rawId)) ? Number(rawId) : undefined;

    return {
      ...decoded,
      id: normalizedId,
      idUsuario: normalizedId,
      correo: correo ?? undefined,
      nombre: nombre ?? undefined,
      usuario: usuario ?? nombre ?? undefined
    } as UserData;
  }

  private isTokenValid(token: string | null): boolean {
    if (!token) return false;

    const decoded = this.decodeJwtPayload(token);
    const exp = decoded?.['exp'];

    if (!exp || Number.isNaN(Number(exp))) {
      return false;
    }

    return Date.now() < Number(exp) * 1000;
  }

  private saveToken(token: string, rememberMe: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');

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
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
  }

  private applyAuthenticatedSession(token: string, rememberMe: boolean): void {
    if (!token || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.saveToken(token, rememberMe);
    this.isLoggedIn.next(true);

    const decoded = this.decodeToken(token);
    if (decoded) {
      this.userData.next(decoded);
    }
  }

  private extractTokenFromResponse(response: string): string {
    const raw = (response ?? '').trim();

    if (!raw) {
      throw new Error('Respuesta vacía del servidor.');
    }

    if (raw.startsWith('<')) {
      throw new Error('El servidor devolvió HTML en lugar de un token o JSON válido.');
    }

    if (!raw.startsWith('{') && !raw.startsWith('"')) {
      return raw;
    }

    try {
      const parsed = JSON.parse(raw);

      if (typeof parsed === 'string') {
        return parsed;
      }

      if (parsed?.token && typeof parsed.token === 'string') {
        return parsed.token;
      }

      if (parsed?.error) {
        throw new Error(parsed.error);
      }

      if (parsed?.message) {
        throw new Error(parsed.message);
      }

      throw new Error('La respuesta del servidor no contiene un token válido.');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      return raw;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  login(correo: string, contrasena: string, rememberMe: boolean = false): Observable<string> {
    const loginData: LoginRequest = { correo, contrasena };

    return this.http.post(
      buildApiUrl(API_CONFIG.endpoints.auth.login),
      loginData,
      { responseType: 'text' }
    ).pipe(
      map((response: string) => this.extractTokenFromResponse(response)),
      tap((token: string) => this.applyAuthenticatedSession(token, rememberMe)),
      catchError((error) => {
        console.error('Error en login:', error);

        let errorMessage = 'Error al iniciar sesión';

        if (error?.error) {
          try {
            const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            errorMessage = errorObj?.error || errorObj?.message || errorMessage;
          } catch {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        return throwError(() => ({
          ...error,
          error: { error: errorMessage, message: errorMessage }
        }));
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
      buildApiUrl(API_CONFIG.endpoints.auth.register),
      registerData,
      { responseType: 'text' }
    ).pipe(
      map((response: string) => {
        const raw = (response || '').trim();

        if (!raw) {
          throw new Error('Respuesta vacía del servidor.');
        }

        if (raw.startsWith('<')) {
          throw new Error('El servidor devolvió HTML. Verifica que el backend esté levantado en 8080.');
        }

        try {
          const data = JSON.parse(raw);

          if (typeof data === 'string' && data.trim()) {
            return data.trim();
          }

          if (data?.token && typeof data.token === 'string') {
            return data.token;
          }

          if (data?.mensaje || data?.message) {
            const autoLoginError: any = new Error('NEED_AUTO_LOGIN');
            autoLoginError.credentials = { correo, contrasena };
            throw autoLoginError;
          }

          if (data?.error) {
            throw new Error(data.error);
          }

          throw new Error('El servidor no devolvió un token válido.');
        } catch (error: any) {
          if (error?.message === 'NEED_AUTO_LOGIN') {
            throw error;
          }

          if (!raw.startsWith('{') && !raw.startsWith('"')) {
            return raw;
          }

          throw error instanceof Error
            ? error
            : new Error('No se pudo procesar la respuesta del registro.');
        }
      }),
      tap((token: string) => this.applyAuthenticatedSession(token, true)),
      catchError((error) => {
        if (error?.message === 'NEED_AUTO_LOGIN' && error?.credentials) {
          const { correo: loginCorreo, contrasena: loginContrasena } = error.credentials;
          return this.login(loginCorreo, loginContrasena, true);
        }

        let token: string | null = null;

        if (error?.error) {
          try {
            const errorResponse = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            token = errorResponse?.token || errorResponse?.data?.token || null;
          } catch {}
        }

        if (token) {
          this.applyAuthenticatedSession(token, true);
          return of(token);
        }

        let errorMessage = 'Error al registrar usuario';

        if (error?.error) {
          try {
            const errorObj = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            errorMessage = errorObj?.error || errorObj?.message || errorMessage;
          } catch {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        return throwError(() => ({
          ...error,
          error: { error: errorMessage, message: errorMessage }
        }));
      })
    );
  }

  googleLogin(credential: string): Observable<string> {
    return this.http.post(
      buildApiUrl(API_CONFIG.endpoints.auth.google),
      { credential },
      { responseType: 'text' }
    ).pipe(
      map((response: string) => this.extractTokenFromResponse(response)),
      tap((token: string) => this.applyAuthenticatedSession(token, true)),
      catchError((error) => {
        let errorMessage = 'Error al iniciar con Google';

        if (error?.error) {
          try {
            const errorObj = typeof error.error === 'string'
              ? JSON.parse(error.error)
              : error.error;
            errorMessage = errorObj?.error || errorObj?.message || errorMessage;
          } catch {}
        } else if (error?.message) {
          errorMessage = error.message;
        }

        return throwError(() => ({
          ...error,
          error: { error: errorMessage, message: errorMessage }
        }));
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

    return (
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('jwt') ||
      sessionStorage.getItem('jwt')
    );
  }

  getUserData(): UserData | null {
    return this.userData.value;
  }

  getUserRole(): string | null {
    const data = this.userData.value as any;

    if (typeof data?.rol === 'string' && data.rol.trim()) {
      return data.rol.trim().toUpperCase();
    }

    if (Array.isArray(data?.roles) && data.roles.length > 0) {
      const first = data.roles.find((role: unknown) => typeof role === 'string' && !!role.trim());
      return typeof first === 'string' ? first.trim().toUpperCase() : null;
    }

    return null;
  }

  uploadPerfil(id: number, formData: FormData): Observable<{ idUsuario: number; fotoPerfil?: string; fotoPerfilUrl?: string; fotoPerfilPublicId?: string }> {
    const url = buildApiUrl(withPathParam(API_CONFIG.endpoints.usuarios.fotoPerfil, { id }));

    return this.http.post<{ idUsuario: number; fotoPerfil?: string; fotoPerfilUrl?: string; fotoPerfilPublicId?: string }>(
      url,
      formData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap((u) => {
        const current = this.userData.value;
        const foto = u?.fotoPerfilUrl || u?.fotoPerfil || null;

        this.userData.next({
          ...(current || {}),
          ...(u || {}),
          fotoPerfil: foto,
          fotoPerfilUrl: foto
        });
      })
    );
  }

  uploadPortada(id: number, formData: FormData): Observable<{ idUsuario: number; fotoPortada?: string; fotoPortadaUrl?: string; fotoPortadaPublicId?: string }> {
    const url = buildApiUrl(withPathParam(API_CONFIG.endpoints.usuarios.fotoPortada, { id }));

    return this.http.post<{ idUsuario: number; fotoPortada?: string; fotoPortadaUrl?: string; fotoPortadaPublicId?: string }>(
      url,
      formData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap((u) => {
        const current = this.userData.value;
        const foto = u?.fotoPortadaUrl || u?.fotoPortada || null;

        this.userData.next({
          ...(current || {}),
          ...(u || {}),
          fotoPortada: foto,
          fotoPortadaUrl: foto
        });
      })
    );
  }

  deletePerfilPhoto(id: number): Observable<{ idUsuario: number; fotoPerfil?: string | null; fotoPerfilUrl?: string | null; fotoPerfilPublicId?: string | null }> {
    const url = buildApiUrl(withPathParam(API_CONFIG.endpoints.usuarios.eliminarFotoPerfil, { id }));

    return this.http.delete<{ idUsuario: number; fotoPerfil?: string | null; fotoPerfilUrl?: string | null; fotoPerfilPublicId?: string | null }>(
      url,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap((u) => {
        const current = this.userData.value;
        this.userData.next({
          ...(current || {}),
          ...(u || {}),
          fotoPerfil: null,
          fotoPerfilUrl: null,
          fotoPerfilPublicId: null
        });
      })
    );
  }

  getUsuarioById(id: number): Observable<UserData> {
    const url = buildApiUrl(withPathParam(API_CONFIG.endpoints.usuarios.byId, { id }));
    return this.http.get<UserData>(url, { headers: this.getAuthHeaders() });
  }

  updateUsuario(id: number, payload: Partial<UserData>): Observable<UserData> {
    const url = buildApiUrl(withPathParam(API_CONFIG.endpoints.usuarios.byId, { id }));

    return this.http.put<UserData>(url, payload, { headers: this.getAuthHeaders() }).pipe(
      tap((u) => {
        const current = this.userData.value;
        this.userData.next({ ...(current || {}), ...(u || {}) });
      })
    );
  }

  private normalizeRole(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, '');
  }

  isAdmin(): boolean {
    const currentUser = this.userData.value as any;

    const singleRole = currentUser?.rol ?? currentUser?.role;
    if (this.normalizeRole(singleRole) === 'ADMINISTRADOR') {
      return true;
    }

    const roles = currentUser?.roles;

    if (Array.isArray(roles)) {
      return roles.some(role => this.normalizeRole(role) === 'ADMINISTRADOR');
    }

    if (typeof roles === 'string') {
      return roles
        .split(',')
        .map(role => this.normalizeRole(role))
        .includes('ADMINISTRADOR');
    }

    return false;
  }
}