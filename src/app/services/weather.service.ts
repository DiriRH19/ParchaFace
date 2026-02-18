import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface ClimaResponse {
  ciudad: string;
  pais: string;
  lat: number;
  lon: number;
  temperaturaC: number;
  vientoKmh: number;
  codigoClima: number;
  timezone: string;
}

/**
 * ✅ Cache por ciudad para no llamar mil veces cuando hay muchas cards
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly apiUrl = 'http://localhost:8080/api/clima';
  private cache = new Map<string, Observable<ClimaResponse>>();

  constructor(private http: HttpClient) {}

  getClima(ciudad: string): Observable<ClimaResponse> {
    const key = (ciudad || '').trim().toLowerCase();
    if (!key) throw new Error('La ciudad es obligatoria');

    const existing = this.cache.get(key);
    if (existing) return existing;

    const req$ = this.http
      .get<ClimaResponse>(`${this.apiUrl}?ciudad=${encodeURIComponent(ciudad.trim())}`)
      .pipe(shareReplay(1));

    this.cache.set(key, req$);
    return req$;
  }

  getCiudades(query: string) {
    return this.http.get<{ nombre: string; departamento: string }[]>(
      `http://localhost:8080/api/clima/ciudades?query=${encodeURIComponent(query)}`
    );
  }
}
