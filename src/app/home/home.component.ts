import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../shared/footer/footer.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { AuthService } from '../services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, NavbarComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  isLoggedIn = toSignal(this.authService.isLoggedIn$, { initialValue: false });

  mapLoading = false;
  mapError = '';
  mapNotice = '';

  private leaflet?: typeof import('leaflet');
  private map?: import('leaflet').Map;

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
        zoom: 14,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      L.marker([center.lat, center.lng])
        .addTo(this.map)
        .bindPopup('Tu ubicación actual')
        .openPopup();

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
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }
}