import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EventoService {

  // ✅ Sin proxy: apunta directo al backend
  private apiUrl = '/eventos';

  constructor(private http: HttpClient) {}


  getSeedEvents(): any[] {
    const seed = [
      {
        title: 'Parcha Nocturno',
        description: 'Noche de beats y buena vibra en la terraza.',
        date: '2026-03-10 21:00',
        location: 'La Terraza, Centro',
        attendees: '50 asistentes',
        category: 'Música',
        tags: ['música','fiesta'],
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
        tags: ['tech','meetup'],
        price: '$10',
        rating: 4,
        imageUrl: this.getFullImageUrl('/uploads/sample2.jpg')
      }
    ];

    return seed;
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

  // Busca el token en varias keys típicas (por si tu login lo guarda distinto)
  private getToken(): string | null {
    // En entornos sin `window` (SSR / server) evitar acceder a localStorage
    if (typeof window === 'undefined' || !window?.localStorage) return null;

    return (
      localStorage.getItem('token') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken') ||
      null
    );
  }

  /**
   * ✅ Headers con Authorization.
   * - Por defecto NO forzamos Content-Type (mejor para GET y multipart).
   * - Si necesitas JSON, pasa { contentTypeJson: true }.
   */
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

  // =========================
  // POST /eventos
  // =========================

  /**
   * ✅ Crea evento con multipart/form-data (imagen real).
   * NO seteamos Content-Type manualmente (el browser define boundary).
   */
  crearEventoMultipart(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * ✅ Crea evento con JSON (legacy).
   */
  crearEventoJson(dto: any): Observable<any> {
    return this.http.post(this.apiUrl, dto, {
      headers: this.getAuthHeaders({ contentTypeJson: true })
    });
  }

  /**
   * ✅ Crea evento (auto-detecta FormData vs JSON).
   * Se deja por compatibilidad con tu código actual.
   */
  crearEvento(payload: any): Observable<any> {
    if (payload instanceof FormData) {
      return this.crearEventoMultipart(payload);
    }
    return this.crearEventoJson(payload);
  }

  /**
   * Guarda un borrador en el backend. Se espera que el endpoint acepte multipart/form-data
   * y guarde el evento en estado borrador. Si tu backend usa otra ruta, ajusta aquí.
   */
  guardarBorrador(payload: any): Observable<any> {
    const isFormData = payload instanceof FormData;
    const headers = isFormData
      ? this.getAuthHeaders()
      : this.getAuthHeaders({ contentTypeJson: true });

    // Intentamos la ruta explícita /eventos/borrador primero.
    // Si el backend no la soporta (404/405), reintentamos con query param ?borrador=true.
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

  // =========================
  // GETs
  // =========================
  obtenerEventos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtiene eventos que no requieren autenticación. Intenta `/eventos/public` y
   * si no existe, reintenta `/eventos?public=true`.
   */
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

  // =========================
  // PUT / DELETE (admin)
  // =========================
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
