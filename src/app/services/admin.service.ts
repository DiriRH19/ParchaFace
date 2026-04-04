import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, buildApiUrl, withPathParam } from '../config/api.config';

export interface AdminEvento {
  idEvento: number;
  titulo: string;
  descripcion?: string;
  categoria?: string;
  fecha?: string;
  ciudad?: string;
  nombreLugar?: string;
  imagenPortadaUrl?: string;
  estadoEvento?: string;
  organizador?: {
    idUsuario?: number;
    nombre?: string;
    correo?: string;
  };
}

export interface AdminUsuario {
  idUsuario: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
  fotoPerfilUrl?: string | null;
  suspensionHasta?: string | null;
}

export interface AdminCommunityPost {
  idPost: number;
  title: string;
  content: string;
  city?: string;
  category?: string;
  createdAt: string;
  commentsCount: number;
  usuario?: {
    idUsuario?: number;
    nombre?: string;
    correo?: string;
  };
}

export interface AdminCommunityComment {
  idComment: number;
  postId: number;
  content: string;
  createdAt: string;
  usuario?: {
    idUsuario?: number;
    nombre?: string;
    correo?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  listarEventosPendientes(): Observable<AdminEvento[]> {
    return this.http.get<AdminEvento[]>(buildApiUrl(API_CONFIG.endpoints.admin.eventosPendientes));
  }

  listarEventos(): Observable<AdminEvento[]> {
    return this.http.get<AdminEvento[]>(buildApiUrl(API_CONFIG.endpoints.admin.eventos));
  }

  aprobarEvento(id: number): Observable<any> {
    return this.http.put(buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.aprobarEvento, { id })), {});
  }

  rechazarEvento(id: number, motivo?: string): Observable<any> {
    let params = new HttpParams();
    if (motivo?.trim()) {
      params = params.set('motivo', motivo.trim());
    }

    return this.http.put(
      buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.rechazarEvento, { id })),
      {},
      { params }
    );
  }

  eliminarEvento(id: number): Observable<void> {
    return this.http.delete<void>(
      buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.eliminarEvento, { id }))
    );
  }

  listarUsuarios(): Observable<AdminUsuario[]> {
    return this.http.get<AdminUsuario[]>(buildApiUrl(API_CONFIG.endpoints.admin.usuarios));
  }

  suspenderUsuario(id: number, payload?: { duracion?: string }): Observable<AdminUsuario> {
    return this.http.put<AdminUsuario>(
      buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.suspenderUsuario, { id })),
      payload ?? {}
    );
  }

  activarUsuario(id: number): Observable<AdminUsuario> {
    return this.http.put<AdminUsuario>(
      buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.activarUsuario, { id })),
      {}
    );
  }

  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(
      buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.eliminarUsuario, { id }))
    );
  }

  listarPosts(): Observable<AdminCommunityPost[]> {
    return this.http.get<AdminCommunityPost[]>(buildApiUrl(API_CONFIG.endpoints.admin.communityPosts));
  }

  eliminarPost(id: number): Observable<void> {
    return this.http.delete<void>(buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.eliminarCommunityPost, { id })));
  }

  listarComentarios(): Observable<AdminCommunityComment[]> {
    return this.http.get<AdminCommunityComment[]>(buildApiUrl(API_CONFIG.endpoints.admin.communityComments));
  }

  eliminarComentario(id: number): Observable<void> {
    return this.http.delete<void>(buildApiUrl(withPathParam(API_CONFIG.endpoints.admin.eliminarCommunityComment, { id })));
  }
}