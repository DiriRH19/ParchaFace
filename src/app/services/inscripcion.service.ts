import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { buildApiUrl } from '../config/api.config';

export interface InscritoEvento {
  idUsuario: number;
  nombre: string;
  correo: string;
  fotoPerfil?: string | null;
  acercaDe?: string | null;
  fechaInscripcion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InscripcionService {
  private storageKey = 'eventos-inscritos';

  constructor(private http: HttpClient) {}

  inscribirme(idEvento: number): Observable<any> {
    return this.http
      .post(buildApiUrl(`/inscripciones/eventos/${idEvento}/inscribirme`), {})
      .pipe(tap(() => this.marcarComoInscrito(idEvento)));
  }

  cancelarInscripcion(idEvento: number): Observable<any> {
    return this.http
      .delete(buildApiUrl(`/inscripciones/eventos/${idEvento}/cancelar`))
      .pipe(tap(() => this.desmarcarComoInscrito(idEvento)));
  }

  obtenerInscritosEvento(idEvento: number): Observable<InscritoEvento[]> {
    return this.http.get<InscritoEvento[]>(
      buildApiUrl(`/inscripciones/eventos/${idEvento}/inscritos`)
    );
  }

  getMisInscripciones(): Observable<any[]> {
    return this.http.get<any[]>(
      buildApiUrl('/perfil/mis-eventos-inscritos')
    );
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
        .map(i =>
          Number(
            i?.idEvento ??
            i?.evento?.idEvento ??
            i?.evento?.id ??
            i?.eventoId
          )
        )
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

  desmarcarComoInscrito(idEvento: number): void {
    const ids = this.obtenerIdsInscritos().filter(id => id !== idEvento);
    localStorage.setItem(this.storageKey, JSON.stringify(ids));
  }

  private extraerIdEvento(item: any): number | null {
    const value =
      item?.idEvento ??
      item?.evento?.idEvento ??
      item?.evento?.id ??
      item?.eventoId ??
      null;

    const id = Number(value);
    return Number.isNaN(id) ? null : id;
  }
}
