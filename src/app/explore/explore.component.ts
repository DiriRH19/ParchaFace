import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCardComponent, Event } from '../event-card/event-card.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { EventoService } from '../services/evento';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, EventCardComponent, NavbarComponent],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit {
  events: Event[] = [];
  isLoading = false;
  authRequired = false;
  private authWarned = false;

  private newlyCreatedFromNav: any = null;

  constructor(private eventoService: EventoService) {}

  ngOnInit(): void {
    // ✅ SSR safe: solo en navegador existe window
    if (typeof window !== 'undefined') {
      const w = window as any;

      // leer evento nuevo desde navigation state
      this.newlyCreatedFromNav = w?.history?.state?.newlyCreatedEvent ?? null;

      // limpiar state para que al refresh no se reinserte
      try {
        w.history.replaceState(
          { ...(w.history.state || {}), newlyCreatedEvent: null },
          ''
        );
      } catch (_) {}
    }

    this.loadEvents();
  }

  refreshEvents(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.isLoading = true;

    this.eventoService.obtenerEventos().subscribe({
      next: (list: any[]) => {
        const mapped = (list || []).map(e => this.mapToCardEvent(e));
        this.events = this.insertNewlyCreatedFirst(mapped);
        this.isLoading = false;
      },
      error: (err) => {
        // 401 -> usa seed
        if (err && err.status === 401) {
          this.authRequired = true;
          this.isLoading = false;

          if (!this.authWarned) {
            console.warn('API requiere autenticación para cargar eventos (401).');
            this.authWarned = true;
          }

          try {
            const seed = (this.eventoService.getSeedEvents() || []).map(e => e as Event);
            this.events = this.insertNewlyCreatedFirst(seed);
          } catch (_) {
            this.events = [];
          }

          return;
        }

        console.error('Error cargando eventos:', err && err.message ? err.message : err);
        this.isLoading = false;
      }
    });
  }

  // =========================
  // HELPERS
  // =========================

  private insertNewlyCreatedFirst(list: Event[]): Event[] {
    if (!this.newlyCreatedFromNav) return list;

    const created = this.mapToCardEvent(this.newlyCreatedFromNav);

    // quitar duplicado si ya venía del GET/seed
    const cleaned = this.removeDuplicate(list, this.newlyCreatedFromNav);

    // insertar arriba
    cleaned.unshift(created);

    // usar solo una vez
    this.newlyCreatedFromNav = null;

    return cleaned;
  }

  private mapToCardEvent(e: any): Event {
    const titulo = e?.titulo ?? e?.title ?? 'Evento';
    const descripcion = e?.descripcion ?? e?.description ?? '';

    const fecha = e?.fecha ? String(e.fecha) : '';
    const horaInicio = e?.horaInicio ? String(e.horaInicio) : '';
    const date = `${fecha}${horaInicio ? ` ${horaInicio}` : ''}`.trim();

    const enLinea = Boolean(e?.eventoEnLinea);
    const location = enLinea
      ? (e?.urlVirtual ?? 'En línea')
      : (e?.nombreLugar ?? e?.ubicacion ?? e?.ciudad ?? '');

    const attendees = e?.cupo ? `${e.cupo} asistentes` : '';
    const category = e?.categoria ?? e?.category ?? '';
    const tags = e?.tags ?? [];

    const price =
      e?.eventoGratuito === true
        ? 'Gratis'
        : (e?.precio != null
          ? (typeof e.precio === 'number' ? `$${e.precio}` : String(e.precio))
          : (e?.price ?? ''));

    // ✅ imagen (con fallback)
    const rawImg =
      e?.imagenPortadaUrl ||
      e?.imagenPortadaURL ||
      e?.imagenPortada ||
      e?.portada ||
      e?.portadaUrl ||
      e?.imagenUrl ||
      e?.imageUrl ||
      e?.image ||
      '';

    const imageUrl = this.eventoService.getFullImageUrl(String(rawImg || ''));
    const id = e?.idEvento ?? e?.id ?? e?.id_evento ?? null;

    return {
      id: id ?? undefined,
      title: titulo,
      description: descripcion,
      date,
      location,
      attendees,
      category,
      tags,
      price,
      rating: Number(e?.rating ?? 0),
      imageUrl
    };
  }

  private removeDuplicate(list: Event[], rawCreated: any): Event[] {
    const createdTitle = (rawCreated?.titulo ?? rawCreated?.title ?? '').trim();
    const createdFecha = String(rawCreated?.fecha ?? '').trim();
    const createdHora = String(rawCreated?.horaInicio ?? '').trim();
    const signature = `${createdTitle}__${createdFecha}__${createdHora}`.toLowerCase();

    return (list || []).filter((ev: any) => {
      const evDateParts = String(ev.date || '').split(' ');
      const evFecha = (evDateParts[0] || '').trim();
      const evHora = (evDateParts[1] || '').trim();
      const evSignature = `${(ev.title || '').trim()}__${evFecha}__${evHora}`.toLowerCase();
      return evSignature !== signature;
    });
  }
}
