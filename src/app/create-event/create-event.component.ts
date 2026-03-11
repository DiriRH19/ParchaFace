import {
  AfterViewInit,
  Component,
  OnDestroy,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventoService } from '../services/evento';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  currentStep = 1;
  totalSteps = 4;

  private leaflet?: typeof import('leaflet');
  private map?: import('leaflet').Map;
  private locationMarker?: import('leaflet').Marker;

  private readonly defaultLat = 4.60971;
  private readonly defaultLng = -74.08175;
  private readonly defaultZoom = 12;

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  eventData = {
    titulo: '',
    descripcion: '',
    categoria: '',
    tags: [] as string[],
    fecha: '',
    horaInicio: '',
    horaFin: '',
    eventoEnLinea: false,
    urlVirtual: '',
    ubicacion: '',
    nombreLugar: '',
    latitud: null as number | null,
    longitud: null as number | null,
    direccionCompleta: '',
    ciudad: '',
    cupo: '' as number | string,
    eventoGratuito: true,
    precio: '' as number | string,
    eventoPublico: true,
    detallePrivado: '',
    permitirComentarios: true,
    recordatoriosAutomaticos: true,
    emailContacto: '',
    telefonoContacto: '',
    sitioWeb: ''
  };

  newTag = '';

  steps = [
    { id: 1, title: 'Información Básica', description: 'Título, descripción y categoría', icon: '' },
    { id: 2, title: 'Fecha y Lugar', description: 'Cuándo y dónde será tu evento', icon: '' },
    { id: 3, title: 'Detalles', description: 'Capacidad, precio y contacto', icon: '' },
    { id: 4, title: 'Configuración', description: 'Privacidad y configuraciones finales', icon: '' }
  ];

  constructor(
    private eventoService: EventoService,
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    if (this.currentStep === 2 && !this.eventData.eventoEnLinea) {
      setTimeout(() => {
        this.initLocationMap();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
    this.revokePreviewUrl();
  }

  addTag(): void {
    if (this.newTag.trim() && !this.eventData.tags.includes(this.newTag.trim())) {
      this.eventData.tags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.eventData.tags = this.eventData.tags.filter(t => t !== tag);
  }

  nextStep(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;

      if (this.currentStep === 2 && !this.eventData.eventoEnLinea) {
        setTimeout(() => {
          this.initLocationMap();
        }, 0);
      }
    }
  }

  previousStep(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStepComplete(step: number): boolean {
    return step < this.currentStep;
  }

  onEventModeChange(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.eventData.eventoEnLinea) {
      this.eventData.ubicacion = '';
      this.eventData.nombreLugar = '';
      this.eventData.direccionCompleta = '';
      this.eventData.ciudad = '';
      this.eventData.latitud = null;
      this.eventData.longitud = null;
      this.destroyMap();
    } else {
      setTimeout(() => {
        this.initLocationMap();
      }, 0);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedImageFile = file;
    this.submitError = '';
    this.submitSuccess = '';

    this.revokePreviewUrl();

    if (!file) {
      this.imagePreviewUrl = null;
      return;
    }

    if (!this.isValidImageFile(file)) {
      this.selectedImageFile = null;
      this.imagePreviewUrl = null;
      this.submitError = 'La imagen debe ser JPG, JPEG, PNG o WEBP.';
      input.value = '';
      return;
    }

    this.imagePreviewUrl = URL.createObjectURL(file);
  }

  createEvent(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.validateAllSteps()) {
      return;
    }

    const formData = new FormData();

    this.appendIfNotEmpty(formData, 'titulo', this.eventData.titulo);
    this.appendIfNotEmpty(formData, 'descripcion', this.eventData.descripcion);
    this.appendIfNotEmpty(formData, 'categoria', this.eventData.categoria);
    this.appendIfNotEmpty(formData, 'fecha', this.eventData.fecha);
    this.appendIfNotEmpty(formData, 'horaInicio', this.normalizeTime(this.eventData.horaInicio));
    this.appendIfNotEmpty(formData, 'horaFin', this.normalizeTime(this.eventData.horaFin));
    this.appendIfNotEmpty(formData, 'eventoEnLinea', this.eventData.eventoEnLinea);
    this.appendIfNotEmpty(formData, 'urlVirtual', this.eventData.urlVirtual);
    this.appendIfNotEmpty(formData, 'ubicacion', this.eventData.ubicacion);
    this.appendIfNotEmpty(formData, 'nombreLugar', this.eventData.nombreLugar);
    this.appendIfNotEmpty(formData, 'direccionCompleta', this.eventData.direccionCompleta);
    this.appendIfNotEmpty(formData, 'ciudad', this.eventData.ciudad);
    this.appendIfNotEmpty(formData, 'latitud', this.eventData.latitud);
    this.appendIfNotEmpty(formData, 'longitud', this.eventData.longitud);
    this.appendIfNotEmpty(formData, 'cupo', this.eventData.cupo);
    this.appendIfNotEmpty(formData, 'eventoGratuito', this.eventData.eventoGratuito);
    this.appendIfNotEmpty(formData, 'precio', this.eventData.eventoGratuito ? '' : this.eventData.precio);
    this.appendIfNotEmpty(formData, 'emailContacto', this.eventData.emailContacto);
    this.appendIfNotEmpty(formData, 'telefonoContacto', this.eventData.telefonoContacto);
    this.appendIfNotEmpty(formData, 'sitioWeb', this.eventData.sitioWeb);
    this.appendIfNotEmpty(formData, 'eventoPublico', this.eventData.eventoPublico);
    this.appendIfNotEmpty(formData, 'detallePrivado', this.eventData.eventoPublico ? '' : this.eventData.detallePrivado);
    this.appendIfNotEmpty(formData, 'permitirComentarios', this.eventData.permitirComentarios);
    this.appendIfNotEmpty(formData, 'recordatoriosAutomaticos', this.eventData.recordatoriosAutomaticos);

    if (this.selectedImageFile) {
      formData.append('imagenPortada', this.selectedImageFile);
    }

    this.isSubmitting = true;

    console.log('Enviando evento...', this.eventData);

    this.eventoService.crearEvento(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = 'Evento creado correctamente.';
        this.router.navigate(['/explore']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Error creando evento', err);

        const backendMessage =
          err?.error?.message ||
          err?.error?.error ||
          err?.error?.detalle ||
          err?.message;

        this.submitError = backendMessage || 'No se pudo crear el evento. Revisa los campos e inténtalo de nuevo.';
        alert(this.submitError);
      }
    });
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.validateStepOne();
      case 2:
        return this.validateStepTwo();
      case 3:
        return this.validateStepThree();
      case 4:
        return this.validateStepFour();
      default:
        return true;
    }
  }

  private validateAllSteps(): boolean {
    return this.validateStepOne()
      && this.validateStepTwo()
      && this.validateStepThree()
      && this.validateStepFour();
  }

  private validateStepOne(): boolean {
    if (!this.eventData.titulo.trim()) {
      alert('Debes ingresar el título del evento.');
      return false;
    }

    return true;
  }

  private validateStepTwo(): boolean {
    if (!this.eventData.fecha) {
      alert('Debes seleccionar una fecha.');
      return false;
    }

    if (!this.eventData.horaInicio) {
      alert('Debes seleccionar la hora de inicio.');
      return false;
    }

    if (!this.eventData.horaFin) {
      alert('Debes seleccionar la hora de finalización.');
      return false;
    }

    if (this.eventData.eventoEnLinea) {
      if (!this.eventData.urlVirtual.trim()) {
        alert('Debes ingresar la URL del evento en línea.');
        return false;
      }
      return true;
    }

    if (!this.eventData.ubicacion.trim()) {
      alert('Debes ingresar la ubicación del evento.');
      return false;
    }

    if (this.eventData.latitud == null || this.eventData.longitud == null) {
      alert('Debes seleccionar la ubicación exacta en el mapa.');
      return false;
    }

    return true;
  }

  private validateStepThree(): boolean {
    if (!this.eventData.cupo || Number(this.eventData.cupo) <= 0) {
      alert('Debes ingresar un cupo válido.');
      return false;
    }

    if (!this.eventData.eventoGratuito && (!this.eventData.precio || Number(this.eventData.precio) <= 0)) {
      alert('Debes ingresar un precio válido.');
      return false;
    }

    return true;
  }

  private validateStepFour(): boolean {
    if (!this.eventData.eventoPublico && !this.eventData.detallePrivado.trim()) {
      alert('Debes indicar el detalle del evento privado.');
      return false;
    }

    return true;
  }

  private async initLocationMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const mapContainer = document.getElementById('create-event-map');
    if (!mapContainer) {
      return;
    }

    const L = await this.getLeaflet();

    this.destroyMap();

    const initialLat = this.eventData.latitud ?? this.defaultLat;
    const initialLng = this.eventData.longitud ?? this.defaultLng;
    const initialZoom =
      this.eventData.latitud != null && this.eventData.longitud != null
        ? 15
        : this.defaultZoom;

    this.map = L.map('create-event-map').setView([initialLat, initialLng], initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
      this.setSelectedLocation(e.latlng.lat, e.latlng.lng);
    });

    if (this.eventData.latitud != null && this.eventData.longitud != null) {
      await this.setSelectedLocation(this.eventData.latitud, this.eventData.longitud);
    } else {
      this.tryCenterOnUserLocation();
    }

    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private async setSelectedLocation(lat: number, lng: number): Promise<void> {
    if (!this.map) return;

    const L = await this.getLeaflet();

    this.eventData.latitud = Number(lat.toFixed(6));
    this.eventData.longitud = Number(lng.toFixed(6));

    if (!this.eventData.ubicacion.trim()) {
      this.eventData.ubicacion = 'Ubicación seleccionada en mapa';
    }

    if (this.locationMarker) {
      this.locationMarker.setLatLng([lat, lng]);
    } else {
      this.locationMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

      this.locationMarker.on('dragend', () => {
        const pos = this.locationMarker!.getLatLng();
        this.eventData.latitud = Number(pos.lat.toFixed(6));
        this.eventData.longitud = Number(pos.lng.toFixed(6));
      });
    }

    this.map.setView([lat, lng], 15);
  }

  private tryCenterOnUserLocation(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!navigator.geolocation || !this.map) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.map?.setView([lat, lng], 13);
      },
      () => {
        this.map?.setView([this.defaultLat, this.defaultLng], this.defaultZoom);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000
      }
    );
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

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    this.locationMarker = undefined;
  }

  private appendIfNotEmpty(fd: FormData, key: string, value: any): void {
    if (value !== null && value !== undefined && value !== '') {
      fd.append(key, String(value));
    }
  }

  private normalizeTime(value: string): string {
    if (!value) {
      return value;
    }

    return value.length === 5 ? `${value}:00` : value;
  }

  private isValidImageFile(file: File): boolean {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return allowed.includes((file.type || '').toLowerCase());
  }

  private revokePreviewUrl(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
  }
}
