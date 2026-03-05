import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notificacion } from '../models/notificacion.model';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);
  private base = '/notificaciones';

  getMisNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(this.base);
  }

  getContadorNoLeidas(): Observable<number> {
    return this.http.get<number>(`${this.base}/contador-no-leidas`);
  }

  marcarLeida(id: number): Observable<Notificacion> {
    return this.http.put<Notificacion>(`${this.base}/${id}/leer`, {});
  }

  marcarTodasLeidas(): Observable<void> {
    return this.http.put<void>(`${this.base}/leer-todas`, {});
  }
}