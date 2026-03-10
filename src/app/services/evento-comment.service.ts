import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private baseUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  listar(eventoId: number, page = 0, size = 10): Observable<PageResponse<EventoCommentResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<EventoCommentResponse>>(
      `${this.baseUrl}/api/eventos/${eventoId}/comentarios`,
      { params }
    );
  }

  crear(eventoId: number, contenido: string, imagen?: File | null): Observable<EventoCommentResponse> {
    const formData = new FormData();
    formData.append('contenido', contenido);

    if (imagen) {
      formData.append('imagen', imagen, imagen.name);
    }

    return this.http.post<EventoCommentResponse>(
      `${this.baseUrl}/api/eventos/${eventoId}/comentarios`,
      formData
    );
  }

  getFullImageUrl(path?: string | null): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return path.startsWith('/') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`;
  }

  eliminar(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/comentarios/${commentId}`);
  }
}
