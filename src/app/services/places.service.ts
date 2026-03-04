import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface RadarLatLng { lat: number; lng: number; }
export interface RadarPlace {
  id: string;
  categoria: string;
  nombre: string;
  ubicacion: RadarLatLng;
  rating?: number | null;
  open_now?: boolean | null;
  horarios?: string[];
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly apiUrl = '/api/places';
  private cache = new Map<string, Observable<RadarPlace[]>>();

  constructor(private http: HttpClient) {}

  getPlaces(lat: number, lng: number, rango = 1500): Observable<RadarPlace[]> {
    const key = `${lat}|${lng}|${rango}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lng', String(lng))
      .set('rango', String(rango));

    const req$ = this.http.get<RadarPlace[]>(this.apiUrl, { params }).pipe(shareReplay(1));
    this.cache.set(key, req$);
    return req$;
  }
}
