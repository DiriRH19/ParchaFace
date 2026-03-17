import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { NotificacionesStore } from '../../services/notificaciones-store.service';
import { Notificacion } from '../../models/notificacion.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css']
})
export class NotificationBellComponent implements OnInit {
  store = inject(NotificacionesStore);
  router = inject(Router);
  open = false;

  ngOnInit(): void {
    this.store.startPolling(15000);
  }

  toggle(ev: MouseEvent) {
    ev.stopPropagation();
    this.open = !this.open;
    if (this.open) this.store.refreshOnce();
  }

  close() {
    this.open = false;
  }

  marcarTodas(ev: MouseEvent) {
    ev.stopPropagation();
    this.store.marcarTodas();
  }

  esNavegable(n: Notificacion): boolean {
    return n.tipo === 'EVENTO' && !!n.referenciaId;
  }

  abrirNotificacion(n: Notificacion, ev: MouseEvent) {
    ev.stopPropagation();

    if (!n.leido) {
      this.store.marcarLeida(n.id_notificacion);
    }

    this.close();

    if (this.esNavegable(n)) {
      this.router.navigate(['/event', n.referenciaId]);
    }
  }

  formatFecha(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.open) this.close();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open) this.close();
  }
}