import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, buildApiUrl, buildMediaUrl } from '../config/api.config';

export interface EventoCommentResponse {
  id: number;
  eventoId: number;
  usuarioId: number;
  nombreUsuario: string;
  contenido: string;
  imagenUrl?: string | null;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class EventoCommentService {
  constructor(private http: HttpClient) {}

  listar(
    eventoId: number,
    page = 0,
    size = 10
  ): Observable<PageResponse<EventoCommentResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<PageResponse<EventoCommentResponse>>(
      buildApiUrl(`/api/eventos/${eventoId}/comentarios`),
      { params }
    );
  }

  crear(
    eventoId: number,
    contenido: string,
    imagen?: File | null
  ): Observable<EventoCommentResponse> {
    const formData = new FormData();

    formData.append('contenido', contenido ?? '');

    if (imagen) {
      formData.append('imagen', imagen, imagen.name);
    }

    return this.http.post<EventoCommentResponse>(
      buildApiUrl(`/api/eventos/${eventoId}/comentarios`),
      formData
    );
  }

  eliminar(commentId: number): Observable<void> {
    return this.http.delete<void>(
      buildApiUrl(`/api/comentarios/${commentId}`)
    );
  }

  getFullImageUrl(path?: string | null): string {
    return buildMediaUrl(path);
  }
}
