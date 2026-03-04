import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCardComponent, Event } from '../event-card/event-card.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { EventoService } from '../services/evento';
import { WeatherService } from '../services/weather.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, EventCardComponent, NavbarComponent],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit {
  events: Event[] = [];
  isLoading = false;
  authRequired = false;
  private authWarned = false;

  private newlyCreatedFromNav: any = null;

  constructor(
    private eventoService: EventoService,
    private weatherService: WeatherService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // ✅ FILTROS
  searchText = '';
  categoriaFiltro = '';

  // ✅ NUEVO: rango de precio por select
  priceRange = '';

  sortBy: 'fecha' | 'precio' | 'popularidad' | 'rating' = 'fecha';

  // ✅ CIUDAD
  ciudadFiltro = '';
  ciudadesSugeridas = signal<{ nombre: string; departamento: string }[]>([]);

  ngOnInit(): void {
    // 1) Captura el evento completo si viene por state
    if (typeof window !== 'undefined') {
      const w = window as any;
      this.newlyCreatedFromNav = w?.history?.state?.newlyCreatedEvent ?? null;

      try {
        w.history.replaceState(
          { ...(w.history.state || {}), newlyCreatedEvent: null },
          ''
        );
      } catch (_) {}
    }

    // 2) Si viene el id por query param (?created=ID), lo traemos del backend
    const createdId = Number(this.route.snapshot.queryParamMap.get('created') || 0);
    if (createdId > 0) {
      this.eventoService.obtenerEventoPorId(createdId).subscribe({
        next: (ev) => {
          const created = this.mapToCardEvent(ev);

          // Inserta arriba evitando duplicados
          this.events = [created, ...this.events.filter(e => e.id !== created.id)];

          // Limpia el query param para que no lo repita al recargar
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { created: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        },
        error: () => {}
      });
    }

    // 3) Carga lista normal
    this.loadEvents();
  }

  refreshEvents(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.isLoading = true;

    // ✅ IMPORTANTE: para Explore usa eventos públicos (feed)
    this.eventoService.obtenerEventosPublicos().subscribe({
      next: (list: any[]) => {
        const mapped = (list || []).map(e => this.mapToCardEvent(e));

        // ✅ Si ya insertamos un evento (por query/state), lo preservamos arriba
        const existingTop = this.events?.[0] || null;
        let merged = mapped;

        if (existingTop?.id && !mapped.some(e => e.id === existingTop.id)) {
          merged = [existingTop, ...mapped];
        }

        // ✅ Si viene también por state, lo inserta primero sin duplicar
        this.events = this.insertNewlyCreatedFirst(merged);
        this.isLoading = false;
      },
      error: (err) => {
        if (err && err.status === 401) {
          this.authRequired = true;
          this.isLoading = false;

          if (!this.authWarned) {
            console.warn('API requiere autenticación para cargar eventos (401).');
            this.authWarned = true;
          }

          try {
            const seed = (this.eventoService.getSeedEvents() || []).map(e => e as Event);

            // preserva evento creado si existía
            const existingTop = this.events?.[0] || null;
            let merged = seed;
            if (existingTop?.id && !seed.some(e => e.id === existingTop.id)) {
              merged = [existingTop, ...seed];
            }

            this.events = this.insertNewlyCreatedFirst(merged);
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

  onCiudadInput(value: string): void {
    const q = (value || '').trim();

    if (q.length < 2) {
      this.ciudadesSugeridas.set([]);
      return;
    }

    this.weatherService.getCiudades(q).subscribe({
      next: (list) => this.ciudadesSugeridas.set(list || []),
      error: () => this.ciudadesSugeridas.set([])
    });
  }

  private insertNewlyCreatedFirst(list: Event[]): Event[] {
    if (!this.newlyCreatedFromNav) return list;

    const created = this.mapToCardEvent(this.newlyCreatedFromNav);
    const cleaned = this.removeDuplicate(list, this.newlyCreatedFromNav);

    // Si ya existe por id, no lo duplicamos
    if (created?.id && cleaned.some(e => e.id === created.id)) {
      this.newlyCreatedFromNav = null;
      return cleaned;
    }

    cleaned.unshift(created);
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
      ciudad: (!enLinea ? (e?.ciudad ?? '') : ''),
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

  private parsePriceCOP(price: string): number {
    const p = (price || '').toLowerCase().trim();
    if (!p) return 0;
    if (p.includes('gratis')) return 0;

    const digits = p.replace(/[^\d]/g, '');
    if (!digits) return 0;

    const n = Number(digits);
    return Number.isNaN(n) ? 0 : n;
  }

  private inPriceRange(value: number, range: string): boolean {
    if (!range) return true;

    if (range === 'free') return value === 0;

    const parts = range.split('-');
    if (parts.length !== 2) return true;

    const min = Number(parts[0]);
    const max = Number(parts[1]);
    if (Number.isNaN(min) || Number.isNaN(max)) return true;

    return value >= min && value <= max;
  }

  private parsePopularidad(attendees: string): number {
    const digits = String(attendees || '').replace(/[^\d]/g, '');
    const n = Number(digits);
    return Number.isNaN(n) ? 0 : n;
  }

  get eventsFiltrados(): Event[] {
    let list = [...(this.events || [])];

    const qSearch = (this.searchText || '').trim().toLowerCase();
    if (qSearch) {
      list = list.filter(ev => {
        const hay = [
          ev.title,
          ev.description,
          ev.location,
          ev.ciudad || '',
          ev.category || ''
        ].join(' ').toLowerCase();
        return hay.includes(qSearch);
      });
    }

    const qCat = (this.categoriaFiltro || '').trim().toLowerCase();
    if (qCat) {
      list = list.filter(ev => (ev.category || '').toLowerCase() === qCat);
    }

    const qCity = (this.ciudadFiltro || '').trim().toLowerCase();
    if (qCity) {
      list = list.filter(ev => (ev.ciudad || '').toLowerCase().includes(qCity));
    }

    const r = (this.priceRange || '').trim();
    if (r) {
      list = list.filter(ev => this.inPriceRange(this.parsePriceCOP(ev.price), r));
    }

    const by = this.sortBy;
    list.sort((a, b) => {
      if (by === 'precio') return this.parsePriceCOP(a.price) - this.parsePriceCOP(b.price);
      if (by === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (by === 'popularidad') return this.parsePopularidad(b.attendees) - this.parsePopularidad(a.attendees);

      return String(a.date || '').localeCompare(String(b.date || ''));
    });

    return list;
  }
}
