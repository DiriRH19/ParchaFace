import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private baseUrl = 'http://localhost:8080/usuarios';

  constructor(private http: HttpClient) {}

  obtenerPerfil(idUsuario: number): Observable<PerfilUsuarioDto> {
    return this.http.get<PerfilUsuarioDto>(`${this.baseUrl}/${idUsuario}/perfil`);
  }

  seguirUsuario(idUsuario: number): Observable<string> {
    return this.http.post(`${this.baseUrl}/${idUsuario}/seguir`, null, {
      responseType: 'text' as const
    });
  }

  dejarDeSeguirUsuario(idUsuario: number): Observable<string> {
    return this.http.delete(`${this.baseUrl}/${idUsuario}/seguir`, {
      responseType: 'text' as const
    });
  }

  obtenerSeguidores(idUsuario: number): Observable<UsuarioResumenDto[]> {
    return this.http.get<UsuarioResumenDto[]>(`${this.baseUrl}/${idUsuario}/seguidores`);
  }

  obtenerSiguiendo(idUsuario: number): Observable<UsuarioResumenDto[]> {
    return this.http.get<UsuarioResumenDto[]>(`${this.baseUrl}/${idUsuario}/siguiendo`);
  }

  buscarUsuarios(q: string): Observable<UsuarioBusquedaDto[]> {
    return this.http.get<UsuarioBusquedaDto[]>(`${this.baseUrl}/buscar`, {
      params: { q }
    });
  }
}
