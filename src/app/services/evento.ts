import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventoService {

  private apiUrl = '/api/eventos';

  constructor(private http: HttpClient) {}

  crearEvento(eventData: any): Observable<any> {
    return this.http.post(this.apiUrl, eventData);
  }

  obtenerEventos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/feed`);
  }
}
