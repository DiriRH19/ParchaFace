import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InscripcionService {
  private baseUrl = 'http://localhost:8080';
  private storageKey = 'eventos-inscritos';

  constructor(private http: HttpClient) {}

  inscribirme(idEvento: number): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/inscripciones/eventos/${idEvento}/inscribirme`, {})
      .pipe(
        tap(() => this.marcarComoInscrito(idEvento))
      );
  }

  getMisInscripciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/perfil/mis-eventos-inscritos`);
  }

  marcarComoInscrito(idEvento: number): void {
    const ids = this.obtenerIdsInscritos();
    if (!ids.includes(idEvento)) {
      ids.push(idEvento);
      localStorage.setItem(this.storageKey, JSON.stringify(ids));
    }
  }

  estaInscritoLocal(idEvento: number): boolean {
    return this.obtenerIdsInscritos().includes(idEvento);
  }

  sincronizarInscripciones(list: any[]): void {
    const ids = Array.isArray(list)
      ? list
        .map(i => Number(i?.idEvento ?? i?.evento?.idEvento ?? i?.id))
        .filter(id => !Number.isNaN(id))
      : [];

    localStorage.setItem(this.storageKey, JSON.stringify(ids));
  }

  private obtenerIdsInscritos(): number[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter(n => !Number.isNaN(n))
        : [];
    } catch {
      return [];
    }
  }
}
