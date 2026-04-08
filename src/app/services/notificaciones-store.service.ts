import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, timer, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion } from '../models/notificacion.model';

@Injectable({ providedIn: 'root' })
export class NotificacionesStore {
  private api = inject(NotificacionesService);

  private _lista$ = new BehaviorSubject<Notificacion[]>([]);
  private _count$ = new BehaviorSubject<number>(0);
  private pollingSub?: Subscription;

  lista$ = this._lista$.asObservable();
  count$ = this._count$.asObservable();

  refreshOnce() {
    return forkJoin({
      lista: this.api.getMisNotificaciones(),
      count: this.api.getContadorNoLeidas()
    }).subscribe({
      next: ({ lista, count }) => {
        this._lista$.next(lista);
        this._count$.next(count);
      }
    });
  }

  startPolling(intervalMs = 15000) {
    if (this.pollingSub) return;

    this.pollingSub = timer(0, intervalMs).pipe(
      switchMap(() => forkJoin({
        lista: this.api.getMisNotificaciones(),
        count: this.api.getContadorNoLeidas()
      }))
    ).subscribe({
      next: ({ lista, count }) => {
        this._lista$.next(lista);
        this._count$.next(count);
      }
    });
  }

  stopPolling() {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  marcarLeida(id: number) {
    return this.api.marcarLeida(id).subscribe({ next: () => this.refreshOnce() });
  }

  marcarTodas() {
    return this.api.marcarTodasLeidas().subscribe({ next: () => this.refreshOnce() });
  }

  clear() {
    this._lista$.next([]);
    this._count$.next(0);
  }
}