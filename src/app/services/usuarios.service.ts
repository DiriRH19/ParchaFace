import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, buildApiUrl, withPathParam } from '../config/api.config';
import { AuthService } from './auth.service';

export interface PerfilUsuarioDto {
  idUsuario: number;
  nombre: string;
  correo: string;
  fotoPerfil?: string | null;
  fotoPortada?: string | null;
  acercaDe?: string | null;
  categoriasPreferidas: string[];
  totalSeguidores: number;
  totalSiguiendo: number;
  seguidoPorMi: boolean;
  esMiPerfil: boolean;
}

export interface UsuarioResumenDto {
  idUsuario: number;
  nombre: string;
  fotoPerfil?: string | null;
  acercaDe?: string | null;
}

export interface UsuarioBusquedaDto {
  idUsuario: number;
  nombre: string;
  correo: string;
  fotoPerfil?: string | null;
  acercaDe?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly baseUrl = buildApiUrl(API_CONFIG.endpoints.usuarios.base);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  obtenerPerfil(idUsuario: number): Observable<PerfilUsuarioDto> {
    const path = withPathParam(API_CONFIG.endpoints.usuarios.perfil, { id: idUsuario });
    return this.http.get<PerfilUsuarioDto>(
      buildApiUrl(path),
      { headers: this.getAuthHeaders() }
    );
  }

  seguirUsuario(idUsuario: number): Observable<string> {
    const path = withPathParam(API_CONFIG.endpoints.usuarios.seguir, { id: idUsuario });
    return this.http.post(
      buildApiUrl(path),
      null,
      {
        headers: this.getAuthHeaders(),
        responseType: 'text' as const
      }
    );
  }

  dejarDeSeguirUsuario(idUsuario: number): Observable<string> {
    const path = withPathParam(API_CONFIG.endpoints.usuarios.seguir, { id: idUsuario });
    return this.http.delete(
      buildApiUrl(path),
      {
        headers: this.getAuthHeaders(),
        responseType: 'text' as const
      }
    );
  }

  obtenerSeguidores(idUsuario: number): Observable<UsuarioResumenDto[]> {
    const path = withPathParam(API_CONFIG.endpoints.usuarios.seguidores, { id: idUsuario });
    return this.http.get<UsuarioResumenDto[]>(
      buildApiUrl(path),
      { headers: this.getAuthHeaders() }
    );
  }

  obtenerSiguiendo(idUsuario: number): Observable<UsuarioResumenDto[]> {
    const path = withPathParam(API_CONFIG.endpoints.usuarios.siguiendo, { id: idUsuario });
    return this.http.get<UsuarioResumenDto[]>(
      buildApiUrl(path),
      { headers: this.getAuthHeaders() }
    );
  }

  buscarUsuarios(q: string): Observable<UsuarioBusquedaDto[]> {
    return this.http.get<UsuarioBusquedaDto[]>(
      buildApiUrl(API_CONFIG.endpoints.usuarios.buscar),
      {
        headers: this.getAuthHeaders(),
        params: { q }
      }
    );
  }

    eliminarMiCuenta(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      buildApiUrl(API_CONFIG.endpoints.usuarios.eliminarMiCuenta),
      { headers: this.getAuthHeaders() }
    );
  }
}
