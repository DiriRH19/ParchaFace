import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FooterComponent } from '../shared/footer/footer.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { EventoMapa, EventoService } from '../services/evento';
import { AuthService, UserData } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { buildMediaUrl } from '../config/api.config';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent, NavbarComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  mapLoading = false;
  eventsLoading = false;
  mapError = '';
  mapNotice = '';

  searchText = '';
  categoriaFiltro = '';
  selectedEventId: number | null = null;



  events: EventoMapa[] = [];

  heroIndex = 0;
  itemImageIndexes = new Map<number, number>();

  private leaflet?: typeof import('leaflet');
  private map?: import('leaflet').Map;
  private eventMarkersLayer?: import('leaflet').LayerGroup;
  private userMarker?: import('leaflet').Marker;
  private markerByEventId = new Map<number, import('leaflet').Marker>();
  private mapInitializing = false;

  private eventMarkerIcon?: import('leaflet').Icon;
  private activeEventMarkerIcon?: import('leaflet').Icon;

  private readonly defaultCenter = { lat: 4.711, lng: -74.0721 };
  private mapContainer?: ElementRef<HTMLDivElement>;

  userData: UserData | null = null;
  userMapProfileImage = '';
  private profileImageRequested = false;
  private subscriptions = new Subscription();

  @ViewChild('mapContainer')
  set mapContainerSetter(element: ElementRef<HTMLDivElement> | undefined) {
    this.mapContainer = element;



    if (element && !this.map && !this.mapInitializing) {
      setTimeout(() => {
        this.initializeMap();
      }, 0);
    }
  }


  ngOnInit(): void {
    this.loadEvents();

    const userSub = this.authService.userData$.subscribe(userData => {
      this.userData = userData;
      this.syncMapProfileImage();
    });

    const querySub = this.route.queryParamMap.subscribe(() => {
      this.applyAssistantFiltersFromQuery();
    });

    this.subscriptions.add(userSub);
    this.subscriptions.add(querySub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }

    this.eventMarkersLayer = undefined;
    this.userMarker = undefined;
    this.markerByEventId.clear();
    this.mapInitializing = false;
  }

  get uniqueCategories(): string[] {
    const categories = (this.events || [])
      .map(evento => String(evento.categoria || '').trim())
      .filter(Boolean);

    return [...new Set(categories)].sort((a, b) => a.localeCompare(b));
  }

  get filteredEvents(): EventoMapa[] {
    let list = [...(this.events || [])];

    const q = (this.searchText || '').trim().toLowerCase();
    if (q) {
      list = list.filter(evento => {
        const anyEvento = evento as any;

        const haystack = [
          evento.titulo,
          anyEvento?.descripcion,
          evento.nombreLugar,
          anyEvento?.ubicacion,
          evento.ciudad,
          evento.categoria
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const category = (this.categoriaFiltro || '').trim().toLowerCase();
    if (category) {
      list = list.filter(evento => String(evento.categoria || '').toLowerCase() === category);
    }

    return list.sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
  }

  get heroSlides(): Array<{
    eventId: number | null;
    titulo: string;
    lugar: string;
    fecha: string;
    categoria: string;
    imageUrl: string;
  }> {
    return this.filteredEvents
      .slice(0, 5)
      .map(evento => ({
        eventId: evento.idEvento ?? null,
        titulo: evento.titulo || 'Evento',
        lugar: this.getEventLocation(evento),
        fecha: this.getEventDateLabel(evento),
        categoria: evento.categoria || 'Evento',
        imageUrl: this.getEventImage(evento)
      }))
      .filter(slide => !!slide.imageUrl);
  }

  get currentHeroSlide():
    | {
        eventId: number | null;
        titulo: string;
        lugar: string;
        fecha: string;
        categoria: string;
        imageUrl: string;
      }
    | null {
    const slides = this.heroSlides;
    if (!slides.length) return null;

    const safeIndex = Math.min(this.heroIndex, slides.length - 1);
    return slides[safeIndex];
  }

  async onFiltersChanged(): Promise<void> {
    const selectedExists = this.filteredEvents.some(evento => evento.idEvento === this.selectedEventId);

    if (!selectedExists) {
      this.selectedEventId = null;
    }

    if (this.heroIndex >= this.heroSlides.length) {
      this.heroIndex = 0;
    }

    await this.renderEventMarkers(true);
  }

  async resetFilters(): Promise<void> {
    this.searchText = '';
    this.categoriaFiltro = '';
    this.selectedEventId = null;
    this.heroIndex = 0;

    await this.renderEventMarkers(true);
  }

  async selectEvent(evento: EventoMapa, scrollIntoView = false): Promise<void> {
    this.selectedEventId = evento.idEvento ?? null;
    this.updateMarkerIcons();

    if (evento.latitud != null && evento.longitud != null && this.map) {
      this.map.flyTo([evento.latitud, evento.longitud], Math.max(this.map.getZoom(), 14), {
        duration: 0.6
      });

      const marker = this.markerByEventId.get(evento.idEvento);
      marker?.openPopup();
    }

    if (scrollIntoView && typeof document !== 'undefined' && evento.idEvento != null) {
      setTimeout(() => {
        const element = document.getElementById(`map-event-item-${evento.idEvento}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  isSelected(evento: EventoMapa): boolean {
    return evento.idEvento === this.selectedEventId;
  }

  setHeroIndex(index: number): void {
    if (index >= 0 && index < this.heroSlides.length) {
      this.heroIndex = index;
    }
  }

  openHeroEvent(): void {
    const slide = this.currentHeroSlide;
    if (slide?.eventId != null) {
      this.router.navigate(['/event', slide.eventId]);
    }
  }

  goToEventDetail(evento: EventoMapa, domEvent?: MouseEvent): void {
    domEvent?.stopPropagation();
    if (evento.idEvento != null) {
      this.router.navigate(['/event', evento.idEvento]);
    }
  }

  private applyAssistantFiltersFromQuery(): void {
    const params = this.route.snapshot.queryParamMap;
    if (!params.keys.length) {
      return;
    }

    const q = (params.get('q') ?? params.get('query') ?? '').trim();
    const city = (params.get('city') ?? '').trim();
    const category = (params.get('category') ?? '').trim();
    const eventIdParam = params.get('eventId');

    const combinedSearch = [q, city].filter(Boolean).join(' ').trim();

    if (combinedSearch) {
      this.searchText = combinedSearch;
    }

    if (category) {
      this.categoriaFiltro = category;
    }

    setTimeout(async () => {
      await this.onFiltersChanged();

      const eventId = eventIdParam ? Number(eventIdParam) : null;
      if (eventId && !Number.isNaN(eventId)) {
        const event = this.filteredEvents.find(item => item.idEvento === eventId);
        if (event) {
          await this.selectEvent(event, true);
        }
      }
    }, 0);
  }

  getEventImages(evento: EventoMapa): string[] {
    const anyEvento = evento as any;

    const rawImages = [
      anyEvento?.imagenPortadaUrl,
      anyEvento?.imagenPortadaURL,
      anyEvento?.imagenPortada,
      anyEvento?.portada,
      anyEvento?.portadaUrl,
      anyEvento?.imagenUrl,
      anyEvento?.imageUrl
    ].filter(Boolean);

    const normalized = rawImages
      .map((img: string) => this.eventoService.getFullImageUrl(String(img)))
      .filter(Boolean);

    return [...new Set(normalized)];
  }

  getCurrentItemImage(evento: EventoMapa): string {
    const images = this.getEventImages(evento);
    if (!images.length) return '';

    const eventId = evento.idEvento ?? 0;
    const currentIndex = this.itemImageIndexes.get(eventId) ?? 0;
    return images[currentIndex] || images[0];
  }

  getCurrentItemImageIndex(evento: EventoMapa): number {
    const eventId = evento.idEvento ?? 0;
    return this.itemImageIndexes.get(eventId) ?? 0;
  }

  getEventImage(evento: EventoMapa): string {
    const rawImg =
      (evento as any)?.imagenPortadaUrl ||
      (evento as any)?.imagenPortadaURL ||
      (evento as any)?.imagenPortada ||
      (evento as any)?.portada ||
      (evento as any)?.portadaUrl ||
      (evento as any)?.imagenUrl ||
      (evento as any)?.imageUrl ||
      '';

    return this.eventoService.getFullImageUrl(String(rawImg || ''));
  }

  getEventLocation(evento: EventoMapa): string {
    const anyEvento = evento as any;

    if (anyEvento?.eventoEnLinea) {
      return anyEvento?.urlVirtual || 'En línea';
    }

    return evento.nombreLugar || anyEvento?.ubicacion || evento.ciudad || 'Ubicación no especificada';
  }

  getEventDateLabel(evento: EventoMapa): string {
    if (!evento.fecha) return 'Fecha por definir';

    try {
      return new Date(evento.fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(evento.fecha);
    }
  }

  private loadEvents(): void {
    this.eventsLoading = true;
    this.mapError = '';
    this.mapNotice = '';

    this.eventoService.obtenerEventosMapa().subscribe({
      next: async (list: EventoMapa[]) => {
        this.events = list || [];
        this.eventsLoading = false;
        this.heroIndex = 0;
        this.itemImageIndexes.clear();
        this.applyAssistantFiltersFromQuery();

        if (this.events.length === 0) {
          this.mapNotice = 'Aún no hay eventos públicos con ubicación para mostrar.';
        }

        await this.renderEventMarkers(true);
      },
      error: async (error: any) => {
        console.error('Error cargando eventos del mapa:', error);

        if (error && error.status === 401) {
          this.mapError = 'Para ver los eventos del mapa necesitas iniciar sesión.';
        } else {
          this.mapError = 'No se pudieron obtener los eventos del mapa.';
        }

        this.events = [];
        this.eventsLoading = false;
        this.heroIndex = 0;
        this.itemImageIndexes.clear();

        await this.renderEventMarkers(true);
      }
    });
  }

  private async initializeMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.mapContainer) return;
    if (this.mapInitializing) return;

    if (this.map) {
      this.map.invalidateSize();
      await this.renderEventMarkers(false);
      return;
    }

    this.mapInitializing = true;
    this.mapLoading = true;
    this.mapError = '';
    this.mapNotice = '';

    try {
      const L = await this.getLeaflet();

      let center = this.defaultCenter;

      try {
        center = await this.getUserLocation();
      } catch (error) {
        console.warn('No se pudo obtener la ubicación del usuario:', error);
        this.mapNotice = 'No pude obtener tu ubicación exacta. Centré el mapa en Bogotá por defecto.';
      }

      const container = this.mapContainer.nativeElement;

      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
      }

      this.map = L.map(container, {
        center: [center.lat, center.lng],
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      this.userMarker = L.marker([center.lat, center.lng], {
        icon: this.getUserMarkerIcon(L)
      }).addTo(this.map).bindPopup('Tu ubicación actual');
      this.eventMarkersLayer = L.layerGroup().addTo(this.map);

      await this.renderEventMarkers(true);

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 200);
    } catch (error) {
      console.error('Error inicializando el mapa:', error);
      this.mapError = 'No se pudo cargar el mapa.';
    } finally {
      this.mapLoading = false;
      this.mapInitializing = false;
    }
  }

  private async renderEventMarkers(resetBounds: boolean): Promise<void> {
    if (!this.map || !this.eventMarkersLayer) return;

    const L = await this.getLeaflet();

    this.eventMarkersLayer.clearLayers();
    this.markerByEventId.clear();

    const visibles = this.filteredEvents.filter(
      evento => evento.latitud != null && evento.longitud != null
    );

    if (this.events.length > 0 && visibles.length === 0) {
      this.mapNotice = 'No hay eventos con ubicación que coincidan con tu búsqueda.';
      return;
    }

    if (this.events.length > 0 && visibles.length > 0) {
      this.mapNotice = '';
    }

    const bounds: [number, number][] = [];

    for (const evento of visibles) {
      const marker = L.marker([evento.latitud!, evento.longitud!], {
        icon: this.getMarkerIcon(L, evento.idEvento === this.selectedEventId)
      });

      marker.bindPopup(this.buildPopupContent(evento), {
        maxWidth: 300
      });

      marker.on('click', async () => {
        await this.selectEvent(evento, true);
      });

      marker.on('popupopen', () => {
        setTimeout(() => {
          const button = document.getElementById(`ver-evento-${evento.idEvento}`);
          if (button) {
            button.onclick = () => {
              this.router.navigate(['/event', evento.idEvento]);
            };
          }
        }, 0);
      });

      marker.addTo(this.eventMarkersLayer);

      if (evento.idEvento != null) {
        this.markerByEventId.set(evento.idEvento, marker);
      }

      bounds.push([evento.latitud!, evento.longitud!]);
    }

    if (this.selectedEventId != null) {
      this.updateMarkerIcons();
    }

    if (resetBounds && bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  private updateMarkerIcons(): void {
    if (!this.leaflet) return;

    for (const [eventId, marker] of this.markerByEventId.entries()) {
      marker.setIcon(this.getMarkerIcon(this.leaflet, eventId === this.selectedEventId));
    }
  }

  private buildPopupContent(evento: EventoMapa): string {
    const fecha = this.getEventDateLabel(evento);
    const lugar = this.getEventLocation(evento);
    const imageUrl = this.getEventImage(evento);

    const imagen = imageUrl
      ? `<img
            src="${imageUrl}"
            alt="${this.escapeHtml(evento.titulo || 'Evento')}"
            style="width:100%;height:120px;object-fit:cover;border-radius:12px;margin-bottom:10px;"
         />`
      : '';

    return `
      <div style="min-width:230px;font-family:inherit;color:#2b2f36;">
        ${imagen}
        <div style="display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;background:rgba(143,106,168,0.12);border:1px solid rgba(143,106,168,0.14);color:#765b8c;font-size:12px;font-weight:500;margin-bottom:10px;">
          ${this.escapeHtml(evento.categoria || 'Evento')}
        </div>
        <h3 style="margin:0 0 6px 0;font-size:16px;line-height:1.3;font-weight:600;color:#2b2f36;">
          ${this.escapeHtml(evento.titulo || 'Evento')}
        </h3>
        <p style="margin:0 0 4px 0;font-size:13px;line-height:1.5;color:#6d7280;">
          <strong style="font-weight:600;color:#173248;">Fecha:</strong> ${this.escapeHtml(fecha)}
        </p>
        <p style="margin:0 0 12px 0;font-size:13px;line-height:1.5;color:#6d7280;">
          <strong style="font-weight:600;color:#173248;">Lugar:</strong> ${this.escapeHtml(lugar)}
        </p>
        <button
          id="ver-evento-${evento.idEvento}"
          style="width:100%;min-height:40px;padding:0 12px;border:none;border-radius:12px;background:#173248;color:#ffffff;cursor:pointer;font-size:13px;font-weight:600;"
        >
          Ver evento
        </button>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private async getLeaflet(): Promise<typeof import('leaflet')> {
    if (this.leaflet) return this.leaflet;

    const L = await import('leaflet');

    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });

    this.leaflet = L;
    return L;
  }

  private getUserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  private getMarkerIcon(
    L: typeof import('leaflet'),
    isActive: boolean
  ): import('leaflet').Icon {
    if (!isActive) {
      if (!this.eventMarkerIcon) {
        this.eventMarkerIcon = L.icon({
          iconUrl: 'event-marker.png',
          iconSize: [48, 48],
          iconAnchor: [24, 48],
          popupAnchor: [0, -42],
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          shadowSize: [41, 41],
          shadowAnchor: [12, 41],
          className: 'custom-event-marker'
        });
      }

      return this.eventMarkerIcon;
    }

    if (!this.activeEventMarkerIcon) {
      this.activeEventMarkerIcon = L.icon({
        iconUrl: 'event-marker.png',
        iconSize: [58, 58],
        iconAnchor: [29, 58],
        popupAnchor: [0, -48],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
        className: 'custom-event-marker active'
      });
    }

    return this.activeEventMarkerIcon;
  }

  private syncMapProfileImage(): void {
    const currentPhoto = this.userData?.fotoPerfil || this.userData?.fotoPerfilUrl;

    if (currentPhoto) {
      this.userMapProfileImage = buildMediaUrl(currentPhoto);
      this.profileImageRequested = false;
      this.updateUserMarkerIcon();
      return;
    }

    const userId = this.userData?.id || this.userData?.idUsuario;

    if (!userId || this.profileImageRequested) {
      this.userMapProfileImage = '';
      this.updateUserMarkerIcon();
      return;
    }

    this.profileImageRequested = true;

    this.authService.getUsuarioById(userId).subscribe({
      next: (user) => {
        this.userData = { ...(this.userData || {}), ...(user || {}) };

        const freshPhoto = user?.fotoPerfil || user?.fotoPerfilUrl;
        this.userMapProfileImage = freshPhoto ? buildMediaUrl(freshPhoto) : '';
        this.profileImageRequested = false;
        this.updateUserMarkerIcon();
      },
      error: (err) => {
        console.error('Error cargando foto para el marcador del mapa:', err);
        this.userMapProfileImage = '';
        this.profileImageRequested = false;
        this.updateUserMarkerIcon();
      }
    });
  }

  private updateUserMarkerIcon(): void {
    if (!this.map || !this.userMarker || !this.leaflet) return;
    this.userMarker.setIcon(this.getUserMarkerIcon(this.leaflet));
  }

  private getUserMarkerIcon(
    L: typeof import('leaflet')
  ): import('leaflet').Icon | import('leaflet').DivIcon {
    if (!this.userMapProfileImage) {
      return new L.Icon.Default();
    }

    return L.divIcon({
      className: 'user-photo-marker-clean',
      html: this.buildUserMarkerHtml(this.userMapProfileImage),
      iconSize: [36, 48],
      iconAnchor: [18, 48],
      popupAnchor: [0, -42]
    });
  }

  private buildUserMarkerHtml(imageUrl: string): string {
    const safeUrl = this.escapeHtml(imageUrl);

    return `
    <div style="
      position: relative;
      width: 34px;
      height: 46px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        left: 50%;
        bottom: 2px;
        width: 12px;
        height: 12px;
        background: #ffffff;
        transform: translateX(-50%) rotate(45deg);
        border-radius: 2px 50% 50% 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.18);
      "></div>

      <div style="
        position: relative;
        z-index: 2;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid #ffffff;
        background: #ffffff;
        box-shadow: 0 6px 14px rgba(0,0,0,0.22);
      ">
        <img
          src="${safeUrl}"
          alt="Tu foto de perfil"
          style="
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            border-radius: 50%;
          "
        />
      </div>
    </div>
  `;
  }
}
