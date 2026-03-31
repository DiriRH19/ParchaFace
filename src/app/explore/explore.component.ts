import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { EventCardComponent, Event } from '../event-card/event-card.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { EventoMapa, EventoService } from '../services/evento';

interface ExploreQuickCategory {
  label: string;
  value: string;
  emoji: string;
}

interface ExploreHighlightCard {
  title: string;
  subtitle: string;
  tag: string;
  route: string;
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EventCardComponent,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit {
  events: Event[] = [];
  isLoading = false;
  authRequired = false;
  private authWarned = false;
  private newlyCreatedFromNav: any = null;

  searchText = '';
  categoriaFiltro = '';
  priceRange = '';
  sortBy: 'fecha' | 'precio' | 'popularidad' | 'rating' = 'fecha';

  readonly quickCategories: ExploreQuickCategory[] = [
    { label: 'Conciertos', value: 'MUSICA', emoji: '♫' },
    { label: 'Deportes', value: 'DEPORTE', emoji: '◌' },
    { label: 'Arte', value: 'ARTE', emoji: '✦' },
    { label: 'Gastronomía', value: 'GASTRONOMIA', emoji: '◈' },
    { label: 'Networking', value: 'NETWORKING', emoji: '⟡' },
    { label: 'Gaming', value: 'GAMING', emoji: '◎' },
    { label: 'Fiestas', value: 'FIESTAS', emoji: '◐' }
  ];

  readonly highlightCards: ExploreHighlightCard[] = [
    {
      title: 'Comunidades activas',
      subtitle: 'Sigue personas, conversaciones y experiencias reales.',
      tag: 'Social',
      route: '/community'
    },
    {
      title: 'Mapa inteligente',
      subtitle: 'Descubre eventos por ubicación y muévelos en el mapa.',
      tag: 'En vivo',
      route: '/mapa'
    }
  ];

  constructor(
    private eventoService: EventoService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const w = window as any;

      this.newlyCreatedFromNav = w?.history?.state?.newlyCreatedEvent ?? null;

      try {
        w.history.replaceState(
          { ...(w.history.state || {}), newlyCreatedEvent: null },
          ''
        );
      } catch (_) {}

      this.loadEvents();
    }
  }

  refreshEvents(): void {
    this.loadEvents();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  goToMap(): void {
    this.router.navigate(['/mapa']);
  }

  goToCommunity(): void {
    this.router.navigate(['/community']);
  }

  goToCreateEvent(): void {
    this.router.navigate(['/create-event']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  applyQuickCategory(category: string): void {
    this.categoriaFiltro = category;
    this.scrollToSection('discover-section');
  }

  clearFilters(): void {
    this.searchText = '';
    this.categoriaFiltro = '';
    this.priceRange = '';
    this.sortBy = 'fecha';
  }

  scrollToSection(sectionId: string): void {
    if (typeof document === 'undefined') return;

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private loadEvents(): void {
    this.isLoading = true;
    this.authRequired = false;

    this.eventoService.obtenerEventosMapa().subscribe({
      next: (list: EventoMapa[]) => {
        const mapped = (list || []).map((e: EventoMapa) => this.mapToCardEvent(e));
        this.events = this.insertNewlyCreatedFirst(mapped);
        this.isLoading = false;
      },
      error: (err: any) => {
        if (err && err.status === 401) {
          this.authRequired = true;
          this.isLoading = false;

          if (!this.authWarned) {
            console.warn('API requiere autenticación para cargar eventos (401).');
            this.authWarned = true;
          }

          try {
            const seed = (this.eventoService.getSeedEvents() || []).map((e: any) => e as Event);
            this.events = this.insertNewlyCreatedFirst(seed);
          } catch (_) {
            this.events = [];
          }

          return;
        }

        console.error('Error cargando eventos:', err && err.message ? err.message : err);
        this.events = [];
        this.isLoading = false;
      }
    });
  }

  private insertNewlyCreatedFirst(list: Event[]): Event[] {
    if (!this.newlyCreatedFromNav) return list;

    const created = this.mapToCardEvent(this.newlyCreatedFromNav);
    const cleaned = this.removeDuplicate(list, this.newlyCreatedFromNav);

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
    const tags = Array.isArray(e?.tags) ? e.tags : [];

    const price =
      e?.eventoGratuito === true
        ? 'Gratis'
        : (e?.precio != null
          ? (typeof e.precio === 'number' ? `$${e.precio}` : String(e.precio))
          : (e?.price ?? 'Gratis'));

    const imageUrls = this.getEventImages(e);
    const imageUrl = imageUrls[0] || '';

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
      imageUrl,
      imageUrls,

      registeredCount:
        e?.inscritos != null
          ? Number(e.inscritos)
          : e?.cantidadInscritos != null
            ? Number(e.cantidadInscritos)
            : e?.inscritosActuales != null
              ? Number(e.inscritosActuales)
              : e?.registeredCount != null
                ? Number(e.registeredCount)
                : e?.totalInscritos != null
                  ? Number(e.totalInscritos)
                  : Array.isArray(e?.inscripciones)
                    ? e.inscripciones.length
                    : Array.isArray(e?.usuariosInscritos)
                      ? e.usuariosInscritos.length
                      : 0,

      capacity:
        e?.cupo != null
          ? Number(e.cupo)
          : e?.capacidad != null
            ? Number(e.capacidad)
            : e?.capacity != null
              ? Number(e.capacity)
              : 0,

      socialLinks: this.extractSocialLinks(e)
    };
  }

  private getEventImages(e: any): string[] {
    const fromArray = Array.isArray(e?.imagenes)
      ? e.imagenes
        .map((img: any) =>
          this.eventoService.getFullImageUrl(
            String(img?.imageUrl || img?.imagenUrl || img?.url || '')
          )
        )
        .filter((url: string) => !!url)
      : [];

    const fromDirectArrays = [
      ...(Array.isArray(e?.imageUrls) ? e.imageUrls : []),
      ...(Array.isArray(e?.images) ? e.images : []),
      ...(Array.isArray(e?.galleryImages) ? e.galleryImages : [])
    ]
      .map((img: any) =>
        this.eventoService.getFullImageUrl(
          String(img?.imageUrl || img?.imagenUrl || img?.url || img || '')
        )
      )
      .filter((url: string) => !!url);

    const portada = this.eventoService.getFullImageUrl(
      String(
        e?.imagenPortadaUrl ||
        e?.imagenPortadaURL ||
        e?.imagenPortada ||
        e?.portada ||
        e?.portadaUrl ||
        e?.imagenUrl ||
        e?.imageUrl ||
        e?.image ||
        ''
      )
    );

    return Array.from(
      new Set([
        ...fromArray,
        ...fromDirectArrays,
        ...(portada ? [portada] : [])
      ].filter(Boolean))
    );
  }

  private extractSocialLinks(e: any): Record<string, string> | null {
    const links: Record<string, string> = {};

    const objectSources = [e?.socialLinks, e?.redesSociales, e?.socialMedia];

    for (const source of objectSources) {
      if (!source || typeof source !== 'object') continue;

      for (const [key, value] of Object.entries(source)) {
        if (typeof value === 'string' && value.trim()) {
          links[key] = value.trim();
        }
      }
    }

    const flatSources: Record<string, unknown> = {
      facebook: e?.facebookUrl ?? e?.facebook,
      instagram: e?.instagramUrl ?? e?.instagram,
      whatsapp: e?.whatsappUrl ?? e?.whatsapp,
      x: e?.xUrl ?? e?.twitterUrl ?? e?.x ?? e?.twitter,
      tiktok: e?.tiktokUrl ?? e?.tiktok,
      youtube: e?.youtubeUrl ?? e?.youtube,
      website: e?.websiteUrl ?? e?.website ?? e?.web ?? e?.sitioWeb ?? e?.paginaWeb,
      linkedin: e?.linkedinUrl ?? e?.linkedin
    };

    for (const [key, value] of Object.entries(flatSources)) {
      if (typeof value === 'string' && value.trim()) {
        links[key] = value.trim();
      }
    }

    return Object.keys(links).length ? links : null;
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

    const qSearch = this.normalizeText(this.searchText);
    if (qSearch) {
      list = list.filter(ev => {
        const hay = this.normalizeText([
          ev.title,
          ev.description,
          ev.location,
          ev.ciudad || '',
          ev.category || ''
        ].join(' '));

        return hay.includes(qSearch);
      });
    }

    const qCat = this.normalizeText(this.categoriaFiltro);
    if (qCat) {
      list = list.filter(ev => this.normalizeText(ev.category || '') === qCat);
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

  get featuredEvents(): Event[] {
    return this.eventsFiltrados.slice(0, 6);
  }

  get feedEvents(): Event[] {
    return [...this.eventsFiltrados].slice(0, 3);
  }

  private normalizeText(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchText.trim() ||
      this.categoriaFiltro.trim() ||
      this.priceRange.trim()
    );
  }
  updateRegisteredCount(eventId: number): void {
    this.events = this.events.map(ev => {
      if (ev.id !== eventId) return ev;

      const inscritosActuales =
        typeof ev.registeredCount === 'number' ? ev.registeredCount : 0;

      const cupo =
        typeof ev.capacity === 'number' ? ev.capacity : null;

      if (cupo != null && inscritosActuales >= cupo) {
        return ev;
      }

      return {
        ...ev,
        registeredCount: inscritosActuales + 1
      };
    });
  }

}
