import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProfileEventItem {
  idEvento: number;
  titulo: string;
  categoria: string;
  fecha: string;
  ciudad?: string | null;
  nombreLugar?: string | null;
  imagenPortadaUrl?: string | null;
  estadoEvento?: string | null;
  tipoRelacion: string;
  fechaInscripcion?: string | null;
}

export interface ProfileActivityItem {
  tipo: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  referenciaId?: number | null;
  referenciaTipo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileDataService {
  private baseUrl = 'http://localhost:8080/perfil';

  constructor(private http: HttpClient) {}

  getMisEventosCreados(): Observable<ProfileEventItem[]> {
    return this.http.get<ProfileEventItem[]>(`${this.baseUrl}/mis-eventos-creados`);
  }

  getMisEventosInscritos(): Observable<ProfileEventItem[]> {
    return this.http.get<ProfileEventItem[]>(`${this.baseUrl}/mis-eventos-inscritos`);
  }

  getMiActividad(): Observable<ProfileActivityItem[]> {
    return this.http.get<ProfileActivityItem[]>(`${this.baseUrl}/actividad`);
  }
}