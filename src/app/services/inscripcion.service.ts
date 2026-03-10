import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InscripcionService {
  private baseUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  inscribirme(idEvento: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/inscripciones/eventos/${idEvento}/inscribirme`, {});
  }

  getMisInscripciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/perfil/mis-eventos-inscritos`);
  }
}