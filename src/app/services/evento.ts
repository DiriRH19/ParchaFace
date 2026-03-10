import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private apiUrl = 'http://localhost:8080/eventos';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getSeedEvents(): any[] {
    return [
      {
        title: 'Parcha Nocturno',
        description: 'Noche de beats y buena vibra en la terraza.',
        date: '2026-03-10 21:00',
        location: 'La Terraza, Centro',
        attendees: '50 asistentes',
        category: 'Música',
        tags: ['música', 'fiesta'],
        price: 'Gratis',
        rating: 4.5,
        imageUrl: this.getFullImageUrl('/uploads/sample1.jpg')
      },
      {
        title: 'Demo Tech Meetup',
        description: 'Charlas cortas sobre desarrollo y herramientas.',
        date: '2026-03-15 18:00',
        location: 'Cowork CDMX',
        attendees: '120 asistentes',
        category: 'Networking',
        tags: ['tech', 'meetup'],
        price: '$10',
        rating: 4,
        imageUrl: this.getFullImageUrl('/uploads/sample2.jpg')
      }
    ];
  }

  getFullImageUrl(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;

    const base = this.apiUrl.replace(/\/eventos\/?$/i, '');

    if (path.startsWith('/')) {
      return `${base}${path}`;
    }

    return `${base}/${path}`;
  }

  private getToken(): string | null {
    return this.authService.getToken();
  }

  private getAuthHeaders(options?: { contentTypeJson?: boolean }): HttpHeaders {
    const token = this.getToken();

    let headers = new HttpHeaders();

    if (options?.contentTypeJson) {
      headers = headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  crearEventoMultipart(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData, {
      headers: this.getAuthHeaders()
    });
  }

  crearEventoJson(dto: any): Observable<any> {
    return this.http.post(this.apiUrl, dto, {
      headers: this.getAuthHeaders({ contentTypeJson: true })
    });
  }

  crearEvento(payload: any): Observable<any> {
    if (payload instanceof FormData) {
      return this.crearEventoMultipart(payload);
    }
    return this.crearEventoJson(payload);
  }

  guardarBorrador(payload: any): Observable<any> {
    const isFormData = payload instanceof FormData;
    const headers = isFormData
      ? this.getAuthHeaders()
      : this.getAuthHeaders({ contentTypeJson: true });

    return this.http.post<any>(`${this.apiUrl}/borrador`, payload, { headers }).pipe(
      catchError(err => {
        const status = (err && err.status) || 0;
        if (status === 404 || status === 405) {
          return this.http.post<any>(`${this.apiUrl}?borrador=true`, payload, { headers });
        }
        return throwError(() => err);
      })
    );
  }

  obtenerEventos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    });
  }

  obtenerEventosPublicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/public`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(err => {
        const status = (err && err.status) || 0;
        if (status === 404 || status === 405) {
          return this.http.get<any[]>(`${this.apiUrl}?public=true`, {
            headers: this.getAuthHeaders()
          });
        }
        return throwError(() => err);
      })
    );
  }

  obtenerEventoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  obtenerEventosPorEstado(estado: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/estado/${estado}`, {
      headers: this.getAuthHeaders()
    });
  }

  actualizarEvento(id: number, payload: any): Observable<any> {
    const isFormData = payload instanceof FormData;
    const headers = isFormData
      ? this.getAuthHeaders()
      : this.getAuthHeaders({ contentTypeJson: true });

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, { headers });
  }

  eliminarEvento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}