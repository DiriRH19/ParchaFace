import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EventoMapa {
  idEvento: number;
  titulo: string;
  categoria: string;
  fecha: string;
  ciudad?: string;
  nombreLugar?: string;
  imagenPortadaUrl?: string;
  latitud: number;
  longitud: number;
}

@Injectable({
  providedIn: 'root'
})
export class EventoService {

  private apiUrl = '/api/eventos';

  constructor(private http: HttpClient) {}

  crearEvento(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  guardarBorrador(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/borrador`, formData);
  }

  obtenerEventoPorId(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  obtenerEventos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  obtenerEventosMapa(): Observable<EventoMapa[]> {
    return this.http.get<EventoMapa[]>(`${this.apiUrl}/public`);
  }
}
