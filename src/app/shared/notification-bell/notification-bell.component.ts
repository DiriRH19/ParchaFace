import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionesStore } from '../../services/notificaciones-store.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css']
})
export class NotificationBellComponent implements OnInit {
  store = inject(NotificacionesStore);
  open = false;

  ngOnInit(): void {
    // Si NO quieres polling global, comenta esta línea.
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

  marcarLeida(id: number, ev: MouseEvent) {
    ev.stopPropagation();
    this.store.marcarLeida(id);
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