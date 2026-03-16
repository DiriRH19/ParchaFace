  import {
    Component,
    ElementRef,
    PLATFORM_ID,
    ViewChild,
    effect,
    inject
  } from '@angular/core';
  import { CommonModule, isPlatformBrowser } from '@angular/common';
  import { Router, RouterLink } from '@angular/router';
  import { FooterComponent } from '../shared/footer/footer.component';
  import { NavbarComponent } from '../shared/navbar/navbar.component';
  import { AuthService } from '../services/auth.service';
  import { EventoMapa, EventoService } from '../services/evento';
  import { toSignal } from '@angular/core/rxjs-interop';
  import { firstValueFrom } from 'rxjs';

  @Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterLink, FooterComponent, NavbarComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
  })
  export class HomeComponent {
    private authService = inject(AuthService);
    private eventoService = inject(EventoService);
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);

    isLoggedIn = toSignal(this.authService.isLoggedIn$, { initialValue: false });

    mapLoading = false;
    mapError = '';
    mapNotice = '';

    private leaflet?: typeof import('leaflet');
    private map?: import('leaflet').Map;
    private eventMarkersLayer?: import('leaflet').LayerGroup;
    private eventMarkerIcon?: import('leaflet').Icon;

    private readonly defaultCenter = { lat: 4.711, lng: -74.0721 }; // Bogotá

    private mapContainer?: ElementRef<HTMLDivElement>;

    @ViewChild('mapContainer')
    set mapContainerSetter(element: ElementRef<HTMLDivElement> | undefined) {
      this.mapContainer = element;

      if (element && this.isLoggedIn()) {
        setTimeout(() => {
          this.initializeMap();
        }, 0);
      }
    }

    constructor() {
      effect(() => {
        const logged = this.isLoggedIn();

        if (!logged) {
          this.destroyMap();
          this.mapError = '';
          this.mapNotice = '';
        }
      });
    }

    private async initializeMap(): Promise<void> {
      if (!isPlatformBrowser(this.platformId)) return;
      if (!this.mapContainer) return;

      if (this.map) {
        this.map.invalidateSize();
        await this.loadEventMarkers();
        return;
      }

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
          this.mapNotice =
            'No pude obtener tu ubicación exacta. Centré el mapa en Bogotá por defecto.';
        }

        this.map = L.map(this.mapContainer.nativeElement, {
          center: [center.lat, center.lng],
          zoom: 12,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        L.marker([center.lat, center.lng])
          .addTo(this.map)
          .bindPopup('Tu ubicación actual');

        this.eventMarkersLayer = L.layerGroup().addTo(this.map);

        await this.loadEventMarkers();

        setTimeout(() => {
          this.map?.invalidateSize();
        }, 200);
      } catch (error) {
        console.error('Error inicializando el mapa:', error);
        this.mapError = 'No se pudo cargar el mapa.';
      } finally {
        this.mapLoading = false;
      }
    }

    private async loadEventMarkers(): Promise<void> {
      if (!this.map || !this.eventMarkersLayer) return;

      try {
        const L = await this.getLeaflet();
        const eventos = await firstValueFrom(this.eventoService.obtenerEventosMapa());

        this.eventMarkersLayer.clearLayers();

        if (!eventos || eventos.length === 0) {
          if (!this.mapNotice) {
            this.mapNotice = 'Aún no hay eventos públicos con ubicación para mostrar en el mapa.';
          }
          return;
        }

        const bounds: [number, number][] = [];

        for (const evento of eventos) {
          if (evento.latitud == null || evento.longitud == null) {
            continue;
          }

          const eventIcon = this.createEventMarkerIcon(L);
          const marker = L.marker([evento.latitud, evento.longitud], {
            icon: eventIcon
          });

          marker.bindPopup(this.buildPopupContent(evento), {
            maxWidth: 280
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
          bounds.push([evento.latitud, evento.longitud]);
        }

        if (bounds.length > 0) {
          this.map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch (error) {
        console.error('Error cargando eventos del mapa:', error);
        this.mapError = 'El mapa cargó, pero no se pudieron obtener los eventos.';
      }
    }

    private buildPopupContent(evento: EventoMapa): string {
      const fecha = evento.fecha
        ? new Date(evento.fecha).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
        : 'Fecha por definir';

      const imagen = evento.imagenPortadaUrl
        ? `<img
              src="${evento.imagenPortadaUrl}"
              alt="${this.escapeHtml(evento.titulo)}"
              style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;"
           />`
        : '';

      const lugar = evento.nombreLugar || evento.ciudad || 'Ubicación no especificada';

      return `
        <div style="min-width:220px;">
          ${imagen}
          <h3 style="margin:0 0 6px 0;font-size:16px;">${this.escapeHtml(evento.titulo)}</h3>
          <p style="margin:0 0 4px 0;font-size:13px;"><strong>Categoría:</strong> ${this.escapeHtml(evento.categoria || 'Sin categoría')}</p>
          <p style="margin:0 0 4px 0;font-size:13px;"><strong>Fecha:</strong> ${fecha}</p>
          <p style="margin:0 0 10px 0;font-size:13px;"><strong>Lugar:</strong> ${this.escapeHtml(lugar)}</p>
          <button
            id="ver-evento-${evento.idEvento}"
            style="width:100%;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;font-weight:600;"
          >
            Ver evento
          </button>
        </div>
      `;
    }

    private escapeHtml(value: string): string {
      return value
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
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => reject(error),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    }

    private destroyMap(): void {
      if (this.eventMarkersLayer) {
        this.eventMarkersLayer.clearLayers();
        this.eventMarkersLayer = undefined;
      }

      if (this.map) {
        this.map.remove();
        this.map = undefined;
      }
    }

    private createEventMarkerIcon(L: typeof import('leaflet')): import('leaflet').Icon {
      if (this.eventMarkerIcon) {
        return this.eventMarkerIcon;
      }

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

      return this.eventMarkerIcon;
    }
  }
