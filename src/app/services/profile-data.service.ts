import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, buildApiUrl } from '../config/api.config';
import { AuthService } from './auth.service';

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
  private readonly baseUrl = buildApiUrl(API_CONFIG.endpoints.perfil.base);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  getMisEventosCreados(): Observable<ProfileEventItem[]> {
    return this.http.get<ProfileEventItem[]>(
      buildApiUrl(API_CONFIG.endpoints.perfil.misEventosCreados),
      { headers: this.getAuthHeaders() }
    );
  }

  getMisEventosInscritos(): Observable<ProfileEventItem[]> {
    return this.http.get<ProfileEventItem[]>(
      buildApiUrl(API_CONFIG.endpoints.perfil.misEventosInscritos),
      { headers: this.getAuthHeaders() }
    );
  }

  getMiActividad(): Observable<ProfileActivityItem[]> {
    return this.http.get<ProfileActivityItem[]>(
      buildApiUrl(API_CONFIG.endpoints.perfil.actividad),
      { headers: this.getAuthHeaders() }
    );
  }
}
