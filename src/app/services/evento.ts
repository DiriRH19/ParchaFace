import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EventoService {

  // ✅ Sin proxy: apunta directo al backend
  private apiUrl = 'http://localhost:8080/eventos';

  constructor(private http: HttpClient) {}

  // Busca el token en varias keys típicas (por si tu login lo guarda distinto)
  private getToken(): string | null {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken')
    );
  }

  /**
   * ✅ Headers con Authorization.
   * - Si el body es FormData, NO seteamos Content-Type.
   * - Si el body es JSON, usamos application/json.
   */
  private getAuthHeaders(isFormData: boolean = false): HttpHeaders {
    const token = this.getToken();

    let headers = new HttpHeaders();

    // Solo forzamos JSON cuando NO es FormData
    if (!isFormData) {
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
   * ✅ Crea evento:
   * - Si mandas FormData (multipart): crea con imagen real
   * - Si mandas objeto normal: JSON
   */
  crearEvento(payload: any): Observable<any> {
    const isFormData = payload instanceof FormData;

    return this.http.post(this.apiUrl, payload, {
      headers: this.getAuthHeaders(isFormData)
    });
  }

  /**
   * Guarda un borrador en el backend. Se espera que el endpoint acepte multipart/form-data
   * y guarde el evento en estado borrador. Si tu backend usa otra ruta, ajusta aquí.
   */
  guardarBorrador(payload: any): Observable<any> {
    const isFormData = payload instanceof FormData;
    const headers = this.getAuthHeaders(isFormData);

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
      headers: this.getAuthHeaders(false)
    });
  }

  obtenerEventoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(false)
    });
  }

  obtenerEventosPorEstado(estado: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/estado/${estado}`, {
      headers: this.getAuthHeaders(false)
    });
  }

  // =========================
  // PUT / DELETE (admin)
  // =========================
  actualizarEvento(id: number, payload: any): Observable<any> {
    // si algún día actualizas con FormData, también lo soporta:
    const isFormData = payload instanceof FormData;

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getAuthHeaders(isFormData)
    });
  }

  eliminarEvento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(false)
    });
  }
}
